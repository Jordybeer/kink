from pathlib import Path
from textwrap import dedent
import re

ROOT = Path('.')

def write(path: str, content: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(dedent(content).lstrip(), encoding='utf-8')

def replace_once(path: str, old: str, new: str) -> None:
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

# ── Types: bind snapshot timestamps and keep a separate expected ledger head. ──
replace_once('types/index.ts', '''  profileAProofHash: string;
  profileBProofHash: string;
''', '''  profileAProofHash: string;
  profileBProofHash: string;
  profileACapturedAt: number;
  profileBCapturedAt: number;
''')
replace_once('types/index.ts', '''  consentAgreement?: SceneConsentAgreement;
  consentLedger?: ConsentLedgerEvent[];
''', '''  consentAgreement?: SceneConsentAgreement;
  consentLedger?: ConsentLedgerEvent[];
  /** Expected tail of the append-only consent chain. */
  consentHeadHash?: string;
''')

# ── Consent proof: stable alias, signed-only events, participant authorization. ──
replace_once('lib/consentProof.ts', '''  const source = `${getProfileVerificationCode(profile)}:${profile.consentProof?.keyId ?? profile.id}`;
''', '''  // The readable alias is a stable label for the profile code. The signing key
  // remains the real source identity and is checked separately.
  const source = getProfileVerificationCode(profile);
''')
replace_once('lib/consentProof.ts', '''    profileAProofHash: snapshots.profileA.proof.proofHash,
    profileBProofHash: snapshots.profileB.proof.proofHash,
''', '''    profileAProofHash: snapshots.profileA.proof.proofHash,
    profileBProofHash: snapshots.profileB.proof.proofHash,
    profileACapturedAt: snapshots.profileA.capturedAt,
    profileBCapturedAt: snapshots.profileB.capturedAt,
''')
replace_once('lib/consentProof.ts', '''export async function createConsentLedgerEvent(
  input: Omit<ConsentLedgerEvent, "signature" | "eventHash" | "publicKeyJwk" | "keyId">,
  ownerKey?: ProfileOwnerKey,
): Promise<ConsentLedgerEvent> {
  if (!ownerKey) {
    const eventHash = await sha256Base64Url(ledgerBody(input));
    return { ...input, eventHash };
  }
''', '''export async function createConsentLedgerEvent(
  input: Omit<ConsentLedgerEvent, "signature" | "eventHash" | "publicKeyJwk" | "keyId">,
  ownerKey: ProfileOwnerKey,
): Promise<ConsentLedgerEvent> {
''')
replace_once('lib/consentProof.ts', '''    if (!signature || !publicKeyJwk || !keyId) {
      return event.type === "locked" && await sha256Base64Url(canonicalJson(body)) === eventHash;
    }
''', '''    if (!signature || !publicKeyJwk || !keyId) return false;
''')
replace_once('lib/consentProof.ts', '''export async function verifyConsentLedger(events: ConsentLedgerEvent[]): Promise<boolean> {
  let previous: string | undefined;
  for (const event of events) {
    if (event.previousEventHash !== previous) return false;
    if (!await verifyConsentLedgerEvent(event)) return false;
    if (event.snapshot) {
      const verified = await verifyConsentPayload(event.snapshot.payload, event.snapshot.proof);
      if (verified.status !== "valid") return false;
    }
    if (event.agreement && event.agreement.sceneId !== event.sceneId) return false;
    previous = event.eventHash;
  }
  return true;
}

export function consentEventLabel(type: ConsentLedgerEventType): string {
''', '''export async function verifyConsentLedger(events: ConsentLedgerEvent[]): Promise<boolean> {
  if (!events.length || events[0].type !== "locked") return false;
  let previous: string | undefined;
  let changesStarted = false;
  for (const event of events) {
    if (event.previousEventHash !== previous) return false;
    if (event.type === "locked" && changesStarted) return false;
    if (event.type !== "locked") changesStarted = true;
    if (!await verifyConsentLedgerEvent(event)) return false;
    if (event.snapshot) {
      const verified = await verifyConsentPayload(event.snapshot.payload, event.snapshot.proof);
      if (verified.status !== "valid") return false;
    }
    if (event.agreement && event.agreement.sceneId !== event.sceneId) return false;
    previous = event.eventHash;
  }
  return true;
}

function samePublicKey(left: JsonWebKey | undefined, right: JsonWebKey | undefined): boolean {
  return !!left && !!right
    && canonicalJson(stablePublicJwk(left)) === canonicalJson(stablePublicJwk(right));
}

async function verifySnapshot(snapshot: ConsentSnapshot): Promise<string | null> {
  const verified = await verifyConsentPayload(snapshot.payload, snapshot.proof);
  if (verified.status !== "valid") {
    return verified.status === "invalid" ? verified.reason : "Profielversie mist een bronbevestiging.";
  }
  if (snapshot.profileId !== snapshot.payload.profileId
    || snapshot.profileName !== snapshot.payload.name
    || snapshot.verificationCode !== snapshot.payload.verificationCode) {
    return "De beschrijving van een profielversie is gewijzigd.";
  }
  const expectedAlias = profileConsentAlias({
    id: snapshot.profileId,
    verificationCode: snapshot.verificationCode,
    consentProof: snapshot.proof,
  });
  if (snapshot.alias !== expectedAlias) return "De leesbare bronnaam van een profielversie is gewijzigd.";
  return null;
}

export type SceneConsentVerification =
  | { status: "valid"; signedByProfileIds: string[] }
  | { status: "invalid"; reason: string };

/**
 * Verifies not just the hash chain, but also who was authorised to sign it.
 * A mathematically valid signature from an unrelated key is not consent.
 */
export async function verifySceneConsentRecord(scene: SceneRecord): Promise<SceneConsentVerification> {
  const snapshots = scene.consentSnapshots;
  const agreement = scene.consentAgreement;
  const events = scene.consentLedger;
  if (!snapshots || !agreement || !events?.length) {
    return { status: "invalid", reason: "De vastgezette toestemmingsgegevens zijn onvolledig." };
  }
  if (!sceneMatchesConsentAgreement(scene)) {
    return { status: "invalid", reason: "De huidige scène wijkt af van de vastgezette afspraak." };
  }
  if (agreement.profileACapturedAt !== snapshots.profileA.capturedAt
    || agreement.profileBCapturedAt !== snapshots.profileB.capturedAt) {
    return { status: "invalid", reason: "Het tijdstip van een profielversie is gewijzigd." };
  }
  const snapshotErrorA = await verifySnapshot(snapshots.profileA);
  if (snapshotErrorA) return { status: "invalid", reason: snapshotErrorA };
  const snapshotErrorB = await verifySnapshot(snapshots.profileB);
  if (snapshotErrorB) return { status: "invalid", reason: snapshotErrorB };
  if (agreement.profileAProofHash !== snapshots.profileA.proof.proofHash
    || agreement.profileBProofHash !== snapshots.profileB.proof.proofHash) {
    return { status: "invalid", reason: "De profielversies horen niet bij deze afspraak." };
  }
  if (!await verifyConsentLedger(events)) {
    return { status: "invalid", reason: "De wijzigingsketen is onderbroken of aangepast." };
  }
  if (!scene.consentHeadHash || scene.consentHeadHash !== events[events.length - 1].eventHash) {
    return { status: "invalid", reason: "Het einde van de wijzigingsketen komt niet overeen." };
  }

  const originals = new Map([
    [snapshots.profileA.profileId, snapshots.profileA],
    [snapshots.profileB.profileId, snapshots.profileB],
  ]);
  const latestProof = new Map([
    [snapshots.profileA.profileId, snapshots.profileA.proof],
    [snapshots.profileB.profileId, snapshots.profileB.proof],
  ]);
  const signedBy = new Set<string>();

  for (const event of events) {
    if (!event.profileId || !event.keyId || !event.publicKeyJwk || !event.signature) {
      return { status: "invalid", reason: "Een logregel mist de bevestigende profieleigenaar." };
    }
    const original = originals.get(event.profileId);
    if (!original) return { status: "invalid", reason: "Een onbevoegde bron heeft een logregel ondertekend." };
    if (event.keyId !== original.proof.keyId
      || !samePublicKey(event.publicKeyJwk, original.proof.publicKeyJwk)) {
      return { status: "invalid", reason: "Een logregel is met een andere bron ondertekend." };
    }
    if (event.type === "locked") {
      if (!event.agreement || canonicalJson(event.agreement) !== canonicalJson(agreement)) {
        return { status: "invalid", reason: "De ondertekende scène-afspraak komt niet overeen." };
      }
      signedBy.add(event.profileId);
      continue;
    }
    if (event.agreement) return { status: "invalid", reason: "Een latere logregel probeert de oorspronkelijke afspraak te vervangen." };
    if (event.type === "changed") {
      if (!event.snapshot || event.snapshot.profileId !== event.profileId) {
        return { status: "invalid", reason: "Een wijziging mist de nieuwe ondertekende profielversie." };
      }
      const snapshotError = await verifySnapshot(event.snapshot);
      if (snapshotError) return { status: "invalid", reason: snapshotError };
      const previous = latestProof.get(event.profileId);
      if (!previous || event.snapshot.proof.keyId !== previous.keyId
        || event.snapshot.proof.version <= previous.version
        || !event.snapshot.proof.previousProofHash) {
        return { status: "invalid", reason: "Een nieuwe profielversie volgt niet geldig op de eerdere bron." };
      }
      latestProof.set(event.profileId, event.snapshot.proof);
    } else if (event.snapshot) {
      return { status: "invalid", reason: "Een intrekking mag de oude profielversie niet overschrijven." };
    }
  }

  if (!signedBy.size) return { status: "invalid", reason: "Geen profieleigenaar heeft de scène-afspraak ondertekend." };
  return { status: "valid", signedByProfileIds: [...signedBy] };
}

export function consentEventLabel(type: ConsentLedgerEventType): string {
''')

# ── Store: enforce ownership below the UI and bind every scene event to a participant key. ──
replace_once('lib/store.ts', '''  verifyProfileConsent,
} from "@/lib/consentProof";
''', '''  verifyProfileConsent,
  verifySceneConsentRecord,
} from "@/lib/consentProof";
''')
replace_once('lib/store.ts', '''const EMPTY_ENTRY: KinkEntry = { status: null, comment: "" };
''', '''const EMPTY_ENTRY: KinkEntry = { status: null, comment: "" };

function isSharedProfile(profile: Profile): boolean {
  return profile.origin === "shared" || profile.isImported === true;
}
''')
replace_once('lib/store.ts', '''            p.id === id
              ? { ...p, name, role, experienceLevel, relationshipStatus: relationshipStatus || undefined, fetLifeUsername: fetLifeUsername || undefined, bdsmtestUrl: bdsmtestUrl || undefined, updatedAt: Date.now() }
              : p
''', '''            p.id === id && !isSharedProfile(p)
              ? { ...p, name, role, experienceLevel, relationshipStatus: relationshipStatus || undefined, fetLifeUsername: fetLifeUsername || undefined, bdsmtestUrl: bdsmtestUrl || undefined, updatedAt: Date.now() }
              : p
''')
replace_once('lib/store.ts', '''            p.id === id ? { ...p, bdsmtestScores: scores, updatedAt: Date.now() } : p
''', '''            p.id === id && !isSharedProfile(p) ? { ...p, bdsmtestScores: scores, updatedAt: Date.now() } : p
''')
# Two identical profile-id guards occur in setEntry/resetEntry; harden both.
text = (ROOT / 'lib/store.ts').read_text(encoding='utf-8')
old_guard = '            if (p.id !== profileId) return p;\n'
if text.count(old_guard) != 2:
    raise RuntimeError(f'lib/store.ts: expected two entry guards, found {text.count(old_guard)}')
text = text.replace(old_guard, '            if (p.id !== profileId || isSharedProfile(p)) return p;\n')
(ROOT / 'lib/store.ts').write_text(text, encoding='utf-8')
replace_once('lib/store.ts', '''            p.id !== profileId
              ? p
              : {
''', '''            p.id !== profileId || isSharedProfile(p)
              ? p
              : {
''')
replace_once('lib/store.ts', '''            p.id !== profileId
              ? p
              : {
''', '''            p.id !== profileId || isSharedProfile(p)
              ? p
              : {
''')
replace_once('lib/store.ts', '''          const existing = s.scenes.find((sc) => sc.id === id);
          if (existing) {
            return { scenes: s.scenes.map((sc) => sc.id === id ? { ...sc, ...record, id, updatedAt: now } : sc) };
          }
''', '''          const existing = s.scenes.find((sc) => sc.id === id);
          if (existing?.consentLockedAt) return s;
          if (existing) {
            return { scenes: s.scenes.map((sc) => sc.id === id ? { ...sc, ...record, id, updatedAt: now } : sc) };
          }
''')
replace_once('lib/store.ts', '''        const localOwnerKey = get().profileOwnerKeys.find((key) =>
          key.profileId === profileA.id || key.profileId === profileB.id);
        const event = await createConsentLedgerEvent({
          id: uid(), sceneId, type: "locked", createdAt: lockedAt, agreement,
          note: "De profielversies en scène-afspraken bij de start zijn vastgezet.",
        }, localOwnerKey);
        set((s) => ({ scenes: s.scenes.map((candidate) => candidate.id === sceneId && !candidate.consentSnapshots ? {
          ...candidate,
          consentLockedAt: lockedAt,
          consentSnapshots: snapshots,
          consentAgreement: agreement,
          consentLedger: [event],
          updatedAt: Date.now(),
        } : candidate) }));
''', '''        const localOwnerKeys = get().profileOwnerKeys.filter((key) =>
          key.profileId === profileA.id || key.profileId === profileB.id);
        if (!localOwnerKeys.length) {
          return { ok: false, message: "Minstens één profieleigenaar moet deze scène op het eigen toestel vastzetten." };
        }
        const events = [];
        let previousEventHash: string | undefined;
        for (const ownerKey of localOwnerKeys) {
          const owner = ownerKey.profileId === profileA.id ? profileA : profileB;
          const event = await createConsentLedgerEvent({
            id: uid(), sceneId, type: "locked", createdAt: lockedAt,
            profileId: owner.id, profileName: owner.name, agreement,
            note: "De profielversies en scène-afspraken bij de start zijn vastgezet.",
            ...(previousEventHash ? { previousEventHash } : {}),
          }, ownerKey);
          events.push(event);
          previousEventHash = event.eventHash;
        }
        set((s) => ({ scenes: s.scenes.map((candidate) => candidate.id === sceneId && !candidate.consentSnapshots ? {
          ...candidate,
          consentLockedAt: lockedAt,
          consentSnapshots: snapshots,
          consentAgreement: agreement,
          consentLedger: events,
          consentHeadHash: events[events.length - 1].eventHash,
          updatedAt: Date.now(),
        } : candidate) }));
''')
replace_once('lib/store.ts', '''        if (!scene?.consentSnapshots) return { ok: false, message: "Zet eerst de oorspronkelijke afspraken vast." };
        if (profileId !== scene.profileAId && profileId !== scene.profileBId) return { ok: false, message: "Dit profiel hoort niet bij de scène." };
''', '''        if (!scene?.consentSnapshots) return { ok: false, message: "Zet eerst de oorspronkelijke afspraken vast." };
        const recordVerification = await verifySceneConsentRecord(scene);
        if (recordVerification.status !== "valid") {
          return { ok: false, message: `Het bestaande toestemmingslog klopt niet: ${recordVerification.reason}` };
        }
        if (profileId !== scene.profileAId && profileId !== scene.profileBId) return { ok: false, message: "Dit profiel hoort niet bij de scène." };
''')
replace_once('lib/store.ts', '''        const ownerKey = get().profileOwnerKeys.find((key) => key.profileId === profileId);
        if (!ownerKey) return { ok: false, message: "De eigendomssleutel ontbreekt." };
        const snapshot = type === "changed" ? await createConsentSnapshot(sealed) : undefined;
''', '''        const ownerKey = get().profileOwnerKeys.find((key) => key.profileId === profileId);
        if (!ownerKey) return { ok: false, message: "De eigendomssleutel ontbreekt." };
        const originalSnapshot = scene.consentSnapshots.profileA.profileId === profileId
          ? scene.consentSnapshots.profileA
          : scene.consentSnapshots.profileB;
        if (ownerKey.keyId !== originalSnapshot.proof.keyId) {
          return { ok: false, message: "De huidige eigendomssleutel is niet dezelfde bron als bij het vastzetten." };
        }
        const snapshot = type === "changed" ? await createConsentSnapshot(sealed) : undefined;
''')
replace_once('lib/store.ts', '''          consentLedger: [...(candidate.consentLedger ?? []), event],
          updatedAt: Date.now(),
''', '''          consentLedger: [...(candidate.consentLedger ?? []), event],
          consentHeadHash: event.eventHash,
          updatedAt: Date.now(),
''')

# ── Backup restore: a signed own profile without its matching private key becomes read-only. ──
write('lib/backupRestore.ts', r'''
import type { ContractSnapshot, Profile, ProfileOwnerKey } from "@/types";
import { sanitizeContractSnapshot, sanitizeProfileFull } from "@/lib/sanitizeProfile";
import {
  sanitizeProfileOwnerKey,
  verifyProfileConsent,
  verifyProfileOwnerKey,
} from "@/lib/consentProof";

export interface PreparedBackupRestore {
  source: "backup" | "shared";
  profiles: Profile[];
  contracts: ContractSnapshot[];
  ownerKeys: ProfileOwnerKey[];
}

export async function prepareBackupRestore(raw: unknown): Promise<PreparedBackupRestore> {
  if (!raw || typeof raw !== "object") throw new Error("Ongeldig bestand");
  const parsed = raw as Record<string, unknown>;
  if (!Array.isArray(parsed.profiles)) throw new Error("Geen geldige profielen gevonden");
  const source = parsed.source === "backup" ? "backup" : "shared";
  const sanitizedProfiles = parsed.profiles
    .map((profile) => sanitizeProfileFull(profile))
    .filter((profile): profile is Profile => profile !== null);
  const contracts = (Array.isArray(parsed.contracts) ? parsed.contracts : [])
    .map((contract) => sanitizeContractSnapshot(contract))
    .filter((contract): contract is ContractSnapshot => contract !== null);

  const byId = new Map(sanitizedProfiles.map((profile) => [profile.id, profile]));
  const keyByProfile = new Map<string, ProfileOwnerKey>();
  for (const rawKey of Array.isArray(parsed.profileOwnerKeys) ? parsed.profileOwnerKeys : []) {
    const key = sanitizeProfileOwnerKey(rawKey);
    const profile = key ? byId.get(key.profileId) : undefined;
    if (!key || !profile || !await verifyProfileOwnerKey(key)) continue;
    if (profile.consentProof && profile.consentProof.keyId !== key.keyId) continue;
    keyByProfile.set(key.profileId, key);
  }

  const profiles: Profile[] = [];
  for (const profile of sanitizedProfiles) {
    const sharedBefore = profile.origin === "shared" || profile.isImported === true;
    const key = keyByProfile.get(profile.id);
    const verification = profile.consentProof ? await verifyProfileConsent(profile) : { status: "unsigned" as const };

    if (source !== "backup") {
      if (verification.status === "invalid") continue;
      profiles.push({ ...profile, origin: "shared", isImported: true, lockedAt: profile.lockedAt ?? Date.now() });
      continue;
    }

    if (key) {
      const { lockedAt: _lockedAt, ...rest } = profile;
      profiles.push({ ...rest, origin: "own", isImported: false });
      continue;
    }

    // Old backups predate signing and therefore legitimately contain no key.
    if (!sharedBefore && !profile.consentProof) {
      const { lockedAt: _lockedAt, ...rest } = profile;
      profiles.push({ ...rest, origin: "own", isImported: false });
      continue;
    }

    // A signed profile without its matching private key is a readable shared copy,
    // never silently promoted to editable ownership.
    if (verification.status === "invalid") continue;
    profiles.push({ ...profile, origin: "shared", isImported: true, lockedAt: profile.lockedAt ?? Date.now() });
  }

  return {
    source,
    profiles,
    contracts,
    ownerKeys: [...keyByProfile.values()],
  };
}
''')

# ── Profile trust UX: local dirty state is normal; only imported tampering is red. ──
write('components/ProfileTrust.tsx', r'''
"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, WarningCircle, ArrowsClockwise } from "@phosphor-icons/react";
import type { Profile } from "@/types";
import { profileConsentAlias, verifyProfileConsent, type ConsentVerification } from "@/lib/consentProof";
import { getProfileVerificationCode } from "@/lib/profileVerification";
import Sheet, { SheetContent } from "@/components/Sheet";

export default function ProfileTrust({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [verification, setVerification] = useState<ConsentVerification>({ status: "unsigned" });
  const shared = profile.origin === "shared" || (!profile.origin && profile.isImported === true);

  useEffect(() => {
    let cancelled = false;
    void verifyProfileConsent(profile).then((result) => {
      if (!cancelled) setVerification(result);
    });
    return () => { cancelled = true; };
  }, [profile]);

  const valid = verification.status === "valid";
  const importedInvalid = shared && verification.status === "invalid";
  const ownDirty = !shared && verification.status === "invalid";
  const label = importedInvalid
    ? "Bron klopt niet"
    : ownDirty
      ? "Nieuwe wijzigingen"
      : shared
        ? valid ? "Bron bevestigd" : "Geïmporteerd"
        : valid ? `Versie ${profile.consentProof?.version} bevestigd` : "Eigen profiel";
  const color = importedInvalid ? "var(--hard-no)" : valid ? "var(--yes)" : ownDirty ? "var(--accent)" : "var(--text2)";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring inline-flex items-center gap-1.5 mt-1.5 text-xs rounded-lg py-1"
        style={{ color }}
      >
        {importedInvalid
          ? <WarningCircle size={13} weight="fill" aria-hidden="true" />
          : valid
            ? <ShieldCheck size={13} weight="fill" aria-hidden="true" />
            : ownDirty
              ? <ArrowsClockwise size={13} aria-hidden="true" />
              : null}
        <span>{label}</span>
        <span aria-hidden="true" style={{ opacity: 0.45 }}>·</span>
        <span className="truncate" style={{ maxWidth: 180 }}>{profileConsentAlias(profile)}</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} aria-label="Bron en toestemming">
        <SheetContent>
          <h2 className="text-lg font-bold mb-2">Bron en toestemming</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text2)", lineHeight: 1.65 }}>
            KinkSync kan een versie van dit profiel digitaal verzegelen. Alleen het toestel met de eigendomssleutel kan daarna een geldige nieuwe versie maken. Zo valt op wanneer gedeelde antwoorden achteraf zijn aangepast.
          </p>

          <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text2)" }}>Leesbare profielnaam</p>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{profileConsentAlias(profile)}</p>
            <p className="text-xs mt-3 mb-1" style={{ color: "var(--text2)" }}>Technische profielcode</p>
            <p className="text-xs font-mono break-all" style={{ color: "var(--text2)" }}>{getProfileVerificationCode(profile)}</p>
          </div>

          {valid ? (
            <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--yes) 10%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--yes) 35%, var(--border))", color: "var(--text2)" }}>
              <strong style={{ color: "var(--yes)" }}>Bron bevestigd.</strong> Deze antwoorden passen bij versie {profile.consentProof?.version} en zijn sinds die bevestiging niet gewijzigd.
            </div>
          ) : importedInvalid ? (
            <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--hard-no) 10%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--text2)" }}>
              <strong style={{ color: "var(--hard-no)" }}>Niet vertrouwen als bevestigde toestemming.</strong> {verification.reason}
            </div>
          ) : ownDirty ? (
            <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface2))", border: "1px solid var(--border-accent)", color: "var(--text2)" }}>
              <strong style={{ color: "var(--accent)" }}>Je hebt nieuwe wijzigingen.</strong> Dat is normaal op je eigen profiel. Wanneer je opnieuw deelt of een scène vastzet, maakt KinkSync hiervan een nieuwe bevestigde versie.
            </div>
          ) : (
            <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
              {shared
                ? "Dit oudere gedeelde profiel heeft geen digitale bronbevestiging. Het blijft alleen-lezen, maar de herkomst kan niet cryptografisch worden gecontroleerd."
                : "Dit eigen profiel krijgt automatisch een eigendomssleutel wanneer je het voor het eerst deelt of voor een scène vastzet."}
            </div>
          )}

          <p className="text-xs mb-5" style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            Dit bevestigt de cryptografische bron en inhoud van de opgeslagen versie. Het bewijst geen wettelijke identiteit of vrijwilligheid. Mondelinge of non-verbale intrekking geldt altijd onmiddellijk.
          </p>
          <button onClick={() => setOpen(false)} className="focus-ring w-full py-2.5 rounded-xl text-sm border" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
            Sluit
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}
''')

# ── Scene UX: distinguish signed profile sources from session-specific signers. ──
write('components/ConsentLedgerPanel.tsx', r'''
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Profile, SceneRecord } from "@/types";
import {
  consentEventLabel,
  verifySceneConsentRecord,
  type SceneConsentVerification,
} from "@/lib/consentProof";
import { useStore } from "@/lib/store";

export default function ConsentLedgerPanel({ scene, profiles }: { scene: SceneRecord; profiles: Profile[] }) {
  const { lockSceneConsent, appendSceneConsentEvent } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [verification, setVerification] = useState<SceneConsentVerification | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [note, setNote] = useState("");
  const events = scene.consentLedger ?? [];
  const ownProfiles = useMemo(() => [scene.profileAId, scene.profileBId]
    .map((id) => profiles.find((profile) => profile.id === id))
    .filter((profile): profile is Profile => !!profile && profile.origin !== "shared" && !profile.isImported), [profiles, scene.profileAId, scene.profileBId]);

  useEffect(() => {
    if (!selectedProfileId && ownProfiles[0]) setSelectedProfileId(ownProfiles[0].id);
  }, [ownProfiles, selectedProfileId]);

  useEffect(() => {
    let cancelled = false;
    if (!events.length) { setVerification(null); return; }
    void verifySceneConsentRecord(scene).then((result) => { if (!cancelled) setVerification(result); });
    return () => { cancelled = true; };
  }, [scene, events.length]);

  async function lockNow() {
    setBusy(true); setMessage(null);
    const result = await lockSceneConsent(scene.id);
    setMessage(result.message);
    setBusy(false);
  }

  async function append(type: "changed" | "withdrawn") {
    if (!selectedProfileId) return;
    setBusy(true); setMessage(null);
    const result = await appendSceneConsentEvent(scene.id, selectedProfileId, type, note.trim() || undefined);
    setMessage(result.message);
    if (result.ok) setNote("");
    setBusy(false);
  }

  const valid = verification?.status === "valid";
  const signerIds = valid ? verification.signedByProfileIds : [];
  const signerNames = signerIds.map((id) =>
    scene.consentSnapshots?.profileA.profileId === id
      ? scene.consentSnapshots.profileA.profileName
      : scene.consentSnapshots?.profileB.profileName ?? id);
  const bothProfileKeysSigned = signerIds.includes(scene.profileAId) && signerIds.includes(scene.profileBId);

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-sm" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--text)" }}>
          Vastgelegde afspraken
        </h2>
        {events.length > 0 && (
          <span className="text-xs" style={{ color: verification?.status === "invalid" ? "var(--hard-no)" : valid ? "var(--yes)" : "var(--text2)" }}>
            {verification?.status === "invalid" ? "Controle mislukt" : valid ? "Afspraken intact" : "Controleren…"}
          </span>
        )}
      </div>

      <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: `1px solid ${verification?.status === "invalid" ? "var(--hard-no)" : "var(--border)"}` }}>
        {!scene.consentSnapshots ? (
          <>
            <p className="text-sm mb-3" style={{ color: "var(--text2)", lineHeight: 1.6 }}>
              Leg vast welke profielversies, activiteiten, intensiteiten, notities en welk safeword nu gelden. Latere wijzigingen worden toegevoegd en overschrijven deze versie niet.
            </p>
            <button onClick={lockNow} disabled={busy} className="focus-ring w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
              {busy ? "Vastzetten…" : "Afspraken nu vastzetten"}
            </button>
          </>
        ) : (
          <>
            {verification?.status === "invalid" && (
              <div role="alert" className="rounded-lg px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--hard-no) 10%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--text2)" }}>
                <strong style={{ color: "var(--hard-no)" }}>Gebruik dit niet als betrouwbare weergave.</strong> {verification.reason}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[scene.consentSnapshots.profileA, scene.consentSnapshots.profileB].map((snapshot) => (
                <div key={snapshot.profileId} className="rounded-lg px-3 py-2" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <p className="text-xs font-semibold truncate">{snapshot.profileName}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--yes)" }}>Profielbron bevestigd · v{snapshot.proof.version}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--text2)" }}>{snapshot.alias}</p>
                </div>
              ))}
            </div>

            {valid && (
              <div className="rounded-lg px-3 py-2.5 mb-4 text-xs" style={{ background: "color-mix(in srgb, var(--yes) 7%, var(--surface2))", border: "1px solid var(--border)", color: "var(--text2)", lineHeight: 1.55 }}>
                {bothProfileKeysSigned
                  ? `De exacte scène-afspraak is door beide lokale profielsleutels bevestigd (${signerNames.join(" en ")}).`
                  : `De exacte scène-afspraak is vastgezet door ${signerNames.join(" en ")}. De andere profielbron is wel bevestigd, maar dat is geen aparte live bevestiging van die persoon voor deze specifieke sessie.`}
              </div>
            )}

            <div className="flex flex-col gap-2 mb-4">
              {events.map((event) => (
                <div key={event.id} className="flex gap-3 text-xs">
                  <span className="flex-none" style={{ color: event.type === "withdrawn" ? "var(--hard-no)" : "var(--accent)" }}>●</span>
                  <div className="min-w-0">
                    <p style={{ color: "var(--text)" }}>{consentEventLabel(event.type)}{event.profileName ? ` · ${event.profileName}` : ""}</p>
                    <p style={{ color: "var(--text2)" }}>{new Date(event.createdAt).toLocaleString("nl-NL")}{event.note ? ` — ${event.note}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>

            {ownProfiles.length > 0 && valid && (
              <div className="rounded-lg p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <p className="text-xs mb-2" style={{ color: "var(--text2)" }}>Een nieuwe wijziging wordt ondertekend door het gekozen eigen profiel en achteraan toegevoegd. Eerdere regels blijven staan.</p>
                {ownProfiles.length > 1 && (
                  <select value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)} className="w-full rounded-lg px-3 py-2 text-sm mb-2" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    {ownProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                  </select>
                )}
                <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Wat veranderde? (optioneel)" className="w-full rounded-lg px-3 py-2 text-sm mb-2" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <div className="flex gap-2">
                  <button onClick={() => append("changed")} disabled={busy} className="focus-ring flex-1 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50" style={{ borderColor: "var(--border-accent)", color: "var(--accent)" }}>Wijziging bevestigen</button>
                  <button onClick={() => append("withdrawn")} disabled={busy} className="focus-ring flex-1 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50" style={{ borderColor: "var(--hard-no)", color: "var(--hard-no)" }}>Toestemming intrekken</button>
                </div>
              </div>
            )}
          </>
        )}

        {message && <p role="status" className="text-xs mt-3" style={{ color: message.startsWith("✓") ? "var(--yes)" : "var(--text2)" }}>{message}</p>}

        <details className="mt-4">
          <summary className="text-xs cursor-pointer focus-ring rounded" style={{ color: "var(--accent)" }}>Hoe beschermt dit jullie afspraken?</summary>
          <div className="text-xs mt-2 flex flex-col gap-2" style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            <p>Elke bevestigde profielversie heeft een controleerbare digitale verzegeling. Een geldige logregel moet bovendien ondertekend zijn door de sleutel van een profiel dat werkelijk bij deze scène hoort; een willekeurige andere sleutel telt niet.</p>
            <p>Bij het vastzetten bewaart KinkSync exact welke profielversies, activiteiten, intensiteiten, notities en welk safeword golden. Een wijziging of intrekking komt later als nieuwe regel erbij.</p>
            <p>Dit detecteert gewijzigde inhoud en gebroken ketens. Zonder server kan geen enkele lokale app bewijzen dat een volledig toestel of backup nooit naar een oudere, op zichzelf geldige staat is teruggezet. Bewaar bij belangrijke afspraken daarom beide toestelkopieën of een versleutelde backup.</p>
            <p>Dit vervangt geen gesprek: toestemming kan altijd mondeling of non-verbaal worden ingetrokken en dan moet de activiteit meteen stoppen.</p>
          </div>
        </details>
      </div>
    </section>
  );
}
''')

# Backup warning explains the ownership keys inside the encrypted file.
replace_once('components/sheets/EncryptedBackupSheets.tsx', '''                <p>Met encryptie is het bestand waardeloos zonder jouw wachtwoord. Zonder encryptie kan iedereen die het bestand vindt alles lezen.</p>
''', '''                <p>Met encryptie is het bestand waardeloos zonder jouw wachtwoord. Zonder encryptie kan iedereen die het bestand vindt alles lezen.</p>
                <p>De backup bevat ook de persoonlijke eigendomssleutels van je eigen profielen. Daardoor blijven zij na herstel bewerkbaar en behouden ze dezelfde bevestigde bron.</p>
''')

# Surface signature failures instead of collapsing them into a generic damaged-code message.
replace_once('app/page.tsx', '''      } catch {
        // Ongeldige of beschadigde deelcode blijft buiten de store.
      }
''', '''      } catch (reason) {
        if (!cancelled) setScanError(reason instanceof Error ? reason.message : "Profielcode is ongeldig of beschadigd.");
      }
''')
replace_once('app/page.tsx', '''            } catch {
              setScanError("Profielcode is ongeldig of beschadigd.");
            }
''', '''            } catch (reason) {
              setScanError(reason instanceof Error ? reason.message : "Profielcode is ongeldig of beschadigd.");
            }
''')

# Documentation: name the actual guarantee and its local-only rollback boundary.
write('docs/signed-consent.md', r'''
# Bevestigde bron en vastgelegde toestemming zonder server

KinkSync gebruikt lokale ECDSA P-256-handtekeningen via Web Crypto. Er is geen account, backend of centrale identiteitsdienst.

## Wat wordt bewezen

- Een eigen profiel krijgt op het toestel een publiek/privaat sleutelpaar zodra het voor het eerst wordt gedeeld of voor een scène wordt vastgezet.
- Alleen de private sleutel kan een geldige nieuwe profielversie maken.
- De publieke sleutel, versie, vorige proof-hash, inhoudshash en handtekening reizen mee met het gedeelde profiel.
- Een ontvanger verifieert de handtekening vóór een ondertekend profiel wordt geïmporteerd.
- Een bestaande bron accepteert alleen een opvolgende versie met dezelfde sleutel en een geldige verwijzing naar de vorige proof.
- De leesbare drie-woordennaam is een stabiel menselijk label voor de profielcode. De cryptografische sleutel blijft de bronidentiteit.

## Wat niet wordt beweerd

- `Bron bevestigd` is geen wettelijke identiteitscontrole.
- De eerste import koppelt een bron volgens trust-on-first-use; vergelijk de leesbare naam in persoon wanneer dat belangrijk is.
- Digitale bevestiging bewijst niet dat iemand zonder druk handelde.
- Toestemming kan altijd later mondeling of non-verbaal worden ingetrokken.

## Backups

Versleutelde backups bevatten de private eigendomssleutels. Daardoor blijven eigen profielen na herstel bewerkbaar en behouden zij dezelfde bronidentiteit. Gedeelde profielen blijven read-only. Een ondertekend profiel zonder de bijpassende private sleutel wordt nooit automatisch als eigen profiel hersteld. Wie zowel backup als wachtwoord bezit, bezit ook die lokale identiteit.

## Scènes

Een vastgezette scène bewaart de ondertekende profielversies én de exacte setlist, intensiteiten, notities en het safeword. Iedere logregel moet niet alleen wiskundig geldig zijn, maar ook ondertekend zijn door een profielsleutel die bij de scène hoort. Daarna wordt de setlist read-only. Latere wijzigingen en intrekkingen worden als nieuwe, ondertekende regels aan een hashketen toegevoegd.

De interface maakt onderscheid tussen twee zaken:

- **Profielbron bevestigd:** de opgeslagen profielantwoorden komen uit de vermelde sleutelketen.
- **Scène-afspraak vastgezet door …:** de exacte sessie-afspraak is ondertekend door de genoemde lokale profielsleutel(s).

Een geïmporteerd, bevestigd partnerprofiel is niet automatisch een aparte live bevestiging van die partner voor iedere nieuwe sessie. KinkSync zegt dat daarom niet.

## Lokale grens

Een hashketen detecteert gewijzigde regels, onbevoegde ondertekenaars en een ontbrekende verwachte eindhash. Zonder externe server kan een volledig toestel of volledige backup echter altijd worden teruggezet naar een oudere, op zichzelf geldige kopie. Bij belangrijke afspraken bieden twee onafhankelijke toestelkopieën of een versleutelde backup extra controle.
''')

# Tests: rewrite the crypto suite around authorised scene records.
write('__tests__/consentProof.test.ts', r'''
import { describe, expect, it } from "vitest";
import type { Profile, SceneRecord } from "@/types";
import {
  createConsentLedgerEvent,
  createConsentSnapshot,
  generateProfileOwnerKey,
  profileConsentAlias,
  projectSceneConsentAgreement,
  sceneMatchesConsentAgreement,
  signProfileConsent,
  verifyConsentLedger,
  verifyProfileConsent,
  verifySceneConsentRecord,
} from "@/lib/consentProof";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "profile-owner",
    verificationCode: "KS-7H3P-9Q2M-A4BC",
    name: "Alex",
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [{ id: "custom", name: "Rope ritual" }],
    createdAt: 1,
    updatedAt: 2,
    entries: {
      rope: { status: "yes", desire: 5, experienced: true, comment: "langzaam", tags: ["vraag eerst"] },
      hidden: { status: "hard_no", comment: "privé", privateResponse: true },
    },
    origin: "own",
    ...overrides,
  };
}

async function sealedProfile(overrides: Partial<Profile> = {}) {
  const original = profile(overrides);
  const key = await generateProfileOwnerKey(original.id);
  const signed = await signProfileConsent(original, key);
  return { profile: { ...original, consentProof: signed.proof }, key: signed.ownerKey };
}

async function sceneFixture() {
  const a = await sealedProfile({ id: "a", name: "Alex", verificationCode: "KS-7H3P-9Q2M-A4BC" });
  const b = await sealedProfile({ id: "b", name: "Bo", verificationCode: "KS-8J4R-5T6V-W7XY" });
  const snapshotA = await createConsentSnapshot(a.profile);
  const snapshotB = await createConsentSnapshot(b.profile);
  const scene: SceneRecord = {
    id: "scene-1", title: "Test", profileAId: "a", profileBId: "b",
    profileAName: "Alex", profileBName: "Bo", status: "planned",
    items: [{ id: "item-1", name: "Rope", intensity: "midden", duration: "10 min", note: "langzaam", fromKink: true, kinkId: "rope" }],
    safeword: "rood", createdAt: 1, updatedAt: 1,
    consentSnapshots: { profileA: snapshotA!, profileB: snapshotB! },
  };
  const agreement = projectSceneConsentAgreement(scene, scene.consentSnapshots!);
  const locked = await createConsentLedgerEvent({
    id: "event-1", sceneId: scene.id, type: "locked", createdAt: 10,
    profileId: a.profile.id, profileName: a.profile.name, agreement,
  }, a.key);
  scene.consentAgreement = agreement;
  scene.consentLedger = [locked];
  scene.consentHeadHash = locked.eventHash;
  scene.consentLockedAt = 10;
  return { scene, a, b };
}

describe("signed consent", () => {
  it("seals a profile and catches answer manipulation", async () => {
    const { profile: sealed } = await sealedProfile();
    expect((await verifyProfileConsent(sealed)).status).toBe("valid");
    expect((await verifyProfileConsent({
      ...sealed,
      entries: { ...sealed.entries, rope: { ...sealed.entries.rope, status: "hard_no" } },
    })).status).toBe("invalid");
  });

  it("chains newer versions to the previous proof", async () => {
    const original = profile();
    const key = await generateProfileOwnerKey(original.id);
    const first = await signProfileConsent(original, key);
    const changed = { ...original, consentProof: first.proof, entries: { ...original.entries, rope: { ...original.entries.rope, status: "willing" as const } } };
    const second = await signProfileConsent(changed, first.ownerKey);
    expect(second.proof.version).toBe(2);
    expect(second.proof.previousProofHash).toBe(first.proof.proofHash);
  });

  it("keeps hidden answers outside the signed snapshot", async () => {
    const { profile: sealed } = await sealedProfile();
    const snapshot = await createConsentSnapshot(sealed);
    expect(snapshot?.payload.entries.rope.status).toBe("yes");
    expect(snapshot?.payload.entries.hidden).toBeUndefined();
  });

  it("keeps the readable alias stable before and after first signing", async () => {
    const original = profile();
    const before = profileConsentAlias(original);
    const key = await generateProfileOwnerKey(original.id);
    const signed = await signProfileConsent(original, key);
    expect(profileConsentAlias({ ...original, consentProof: signed.proof })).toBe(before);
    expect(before.split("-")).toHaveLength(3);
  });

  it("binds the exact scene setlist and snapshot times", async () => {
    const { scene } = await sceneFixture();
    expect(sceneMatchesConsentAgreement(scene)).toBe(true);
    expect(sceneMatchesConsentAgreement({ ...scene, safeword: "groen" })).toBe(false);
    expect((await verifySceneConsentRecord(scene)).status).toBe("valid");
    expect((await verifySceneConsentRecord({
      ...scene,
      consentSnapshots: {
        ...scene.consentSnapshots!,
        profileA: { ...scene.consentSnapshots!.profileA, capturedAt: 999 },
      },
    })).status).toBe("invalid");
  });

  it("rejects a mathematically valid signature from a non-participant key", async () => {
    const { scene } = await sceneFixture();
    const stranger = await generateProfileOwnerKey("stranger");
    const forged = await createConsentLedgerEvent({
      id: "forged", sceneId: scene.id, type: "locked", createdAt: 10,
      profileId: scene.profileAId, profileName: scene.profileAName,
      agreement: scene.consentAgreement,
    }, stranger);
    const forgedScene = { ...scene, consentLedger: [forged], consentHeadHash: forged.eventHash };
    expect((await verifySceneConsentRecord(forgedScene)).status).toBe("invalid");
  });

  it("detects edited or truncated append-only logs", async () => {
    const { scene, a } = await sceneFixture();
    const withdrawn = await createConsentLedgerEvent({
      id: "event-2", sceneId: scene.id, type: "withdrawn",
      profileId: a.profile.id, profileName: a.profile.name,
      createdAt: 20, note: "stop",
      previousEventHash: scene.consentLedger![0].eventHash,
    }, a.key);
    const withWithdrawal = { ...scene, consentLedger: [...scene.consentLedger!, withdrawn], consentHeadHash: withdrawn.eventHash };
    expect(await verifyConsentLedger(withWithdrawal.consentLedger!)).toBe(true);
    expect((await verifySceneConsentRecord(withWithdrawal)).status).toBe("valid");
    expect((await verifySceneConsentRecord({ ...withWithdrawal, consentLedger: [withWithdrawal.consentLedger![0]] })).status).toBe("invalid");
    expect(await verifyConsentLedger([scene.consentLedger![0], { ...withdrawn, note: "doorgaan" }])).toBe(false);
  });
});
''')

write('__tests__/consentStore.test.ts', r'''
import { beforeEach, describe, expect, it } from "vitest";
import type { Profile, SceneRecord } from "@/types";
import { useStore } from "@/lib/store";
import { verifySceneConsentRecord } from "@/lib/consentProof";

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

function sharedProfile(): Profile {
  return {
    id: "shared",
    verificationCode: "KS-7H3P-9Q2M-A4BC",
    name: "Partner",
    role: "Sub",
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries: { rope: { status: "yes", comment: "" } },
    origin: "shared",
    isImported: true,
    lockedAt: 1,
  };
}

describe("consent ownership guards", () => {
  it("blocks consent edits on shared profiles below the UI layer", () => {
    const profile = sharedProfile();
    useStore.setState({ profiles: [profile] });
    const store = useStore.getState();
    store.setEntry(profile.id, "rope", { status: "hard_no" });
    store.resetEntry(profile.id, "rope");
    store.addCustomKink(profile.id, "Niet van mij");
    store.removeCustomKink(profile.id, "rope");
    store.renameProfile(profile.id, "Namaak", "Dom", "beginner");
    store.setBdsmtestScores(profile.id, [{ role: "Dominant", pct: 100 }]);
    expect(useStore.getState().profiles[0]).toEqual(profile);
  });

  it("refuses to rewrite a scene after its terms are locked", () => {
    const scene: SceneRecord = {
      id: "scene", title: "Origineel", profileAId: "a", profileBId: "b",
      profileAName: "A", profileBName: "B", items: [], status: "planned",
      createdAt: 1, updatedAt: 1, consentLockedAt: 2,
    };
    useStore.setState({ scenes: [scene] });
    useStore.getState().saveScene({
      id: scene.id, title: "Herschreven", profileAId: "a", profileBId: "b",
      profileAName: "A", profileBName: "B", items: [], status: "planned",
    });
    expect(useStore.getState().scenes[0]).toEqual(scene);
  });

  it("locks an agreement with the participant keys and verifies the whole record", async () => {
    const a = useStore.getState().createProfile("A", "Switch");
    const b = useStore.getState().createProfile("B", "Switch");
    useStore.getState().setEntry(a, "rope", { status: "yes" });
    useStore.getState().setEntry(b, "rope", { status: "yes" });
    const sceneId = useStore.getState().saveScene({
      title: "Rope", profileAId: a, profileBId: b,
      profileAName: "A", profileBName: "B",
      items: [{ id: "i", name: "Rope", intensity: "midden", duration: "", note: "", fromKink: true, kinkId: "rope" }],
      status: "planned",
    });
    const result = await useStore.getState().lockSceneConsent(sceneId);
    expect(result.ok).toBe(true);
    const scene = useStore.getState().scenes.find((item) => item.id === sceneId)!;
    expect(scene.consentLedger).toHaveLength(2);
    expect(scene.consentHeadHash).toBe(scene.consentLedger?.at(-1)?.eventHash);
    expect((await verifySceneConsentRecord(scene)).status).toBe("valid");
  });
});
''')

write('__tests__/backupRestore.test.ts', r'''
import { describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import { prepareBackupRestore } from "@/lib/backupRestore";
import { generateProfileOwnerKey, signProfileConsent } from "@/lib/consentProof";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "owner",
    verificationCode: "KS-7H3P-9Q2M-A4BC",
    name: "Alex",
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries: { rope: { status: "yes", comment: "" } },
    origin: "own",
    ...overrides,
  };
}

describe("encrypted backup ownership restore", () => {
  it("restores editability only with the matching private key", async () => {
    const original = profile();
    const key = await generateProfileOwnerKey(original.id);
    const signed = await signProfileConsent(original, key);
    const sealed = { ...original, consentProof: signed.proof };
    const restored = await prepareBackupRestore({ source: "backup", profiles: [sealed], profileOwnerKeys: [signed.ownerKey] });
    expect(restored.profiles[0].origin).toBe("own");
    expect(restored.ownerKeys).toHaveLength(1);

    const withoutKey = await prepareBackupRestore({ source: "backup", profiles: [sealed], profileOwnerKeys: [] });
    expect(withoutKey.profiles[0].origin).toBe("shared");
    expect(withoutKey.profiles[0].isImported).toBe(true);
  });

  it("keeps unsigned legacy own backups editable", async () => {
    const restored = await prepareBackupRestore({ source: "backup", profiles: [profile()], profileOwnerKeys: [] });
    expect(restored.profiles[0].origin).toBe("own");
  });

  it("drops a tampered shared signed profile", async () => {
    const original = profile({ origin: "shared", isImported: true });
    const key = await generateProfileOwnerKey(original.id);
    const signed = await signProfileConsent(original, key);
    const tampered = {
      ...original,
      consentProof: signed.proof,
      entries: { rope: { status: "hard_no" as const, comment: "" } },
    };
    const restored = await prepareBackupRestore({ source: "backup", profiles: [tampered], profileOwnerKeys: [] });
    expect(restored.profiles).toEqual([]);
  });
});
''')

# Record the hardening in the backlog ledger without claiming physical validation.
replace_once('planned-changes.md', '''## Shipped — historical ledger (full detail preserved in git log)
''', '''## Shipped — historical ledger (full detail preserved in git log)

### Signed consent hardening (PR #270, draft)

- Participant-authorised scene signatures, protected snapshot timestamps and expected ledger tail.
- Store-level read-only guards for shared profiles and locked scene terms.
- Matching private key required to restore a signed profile as editable ownership.
- Honest UI distinction between profile-source integrity and session-specific confirmation.

''')
