from pathlib import Path
from textwrap import dedent

ROOT = Path('.')

def write(path: str, content: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(dedent(content).lstrip(), encoding='utf-8')

def replace_once(path: str, old: str, new: str) -> None:
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    if text.count(old) != 1:
        raise RuntimeError(f'{path}: expected one match, found {text.count(old)} for {old[:80]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

write('lib/consentLedger.ts', r'''
import type {
  Profile,
  ProfileOwnershipKey,
  SceneConsentEvent,
  SceneConsentAnchor,
  SceneConsentEventInput,
  SceneConsentLedger,
  SceneConsentSnapshot,
  SceneRecord,
} from "@/types";
import {
  buildProfileConsentData,
  canonicalJson,
  hashCanonical,
  signCanonical,
  verifyCanonical,
  verifyProfileConsentData,
  verifyProfileConsentSeal,
} from "@/lib/consentCrypto";
import { getProfileVerificationCode } from "@/lib/profileVerification";

export async function createSceneConsentSnapshot(
  profile: Profile,
  capturedAt = Date.now(),
): Promise<SceneConsentSnapshot> {
  const verification = await verifyProfileConsentSeal(profile);
  const trust = profile.origin === "own"
    ? (verification.status === "confirmed" ? "self" : "legacy")
    : verification.status === "confirmed" ? "confirmed" : verification.status;
  const base = {
    profileId: profile.id,
    profileName: profile.name,
    profileCode: getProfileVerificationCode(profile),
    capturedAt,
    revision: profile.consentSeal?.revision ?? profile.consentRevision ?? 1,
    data: buildProfileConsentData(profile),
    seal: profile.consentSeal,
    trust,
  } satisfies Omit<SceneConsentSnapshot, "snapshotHash">;
  return { ...base, snapshotHash: await hashCanonical(base) };
}

function anchorDocument(
  sceneId: string,
  capturedAt: number,
  baseHash: string,
  anchor: Pick<SceneConsentAnchor, "profileId" | "keyId" | "publicKey">,
) {
  return {
    format: 1,
    sceneId,
    capturedAt,
    baseHash,
    profileId: anchor.profileId,
    keyId: anchor.keyId,
    publicKey: anchor.publicKey,
  };
}

export async function createSceneConsentLedger(
  profileA: Profile,
  profileB: Profile,
  sceneId: string,
  ownershipKeys: ProfileOwnershipKey[],
  capturedAt = Date.now(),
): Promise<SceneConsentLedger> {
  const [a, b] = await Promise.all([
    createSceneConsentSnapshot(profileA, capturedAt),
    createSceneConsentSnapshot(profileB, capturedAt),
  ]);
  const baseHash = await hashCanonical({ format: 1, sceneId, capturedAt, a: a.snapshotHash, b: b.snapshotHash });
  const anchors: SceneConsentAnchor[] = [];
  for (const ownership of ownershipKeys) {
    const snapshot = ownership.profileId === a.profileId ? a : ownership.profileId === b.profileId ? b : null;
    if (!snapshot?.seal || snapshot.seal.keyId !== ownership.keyId) continue;
    const base = { profileId: ownership.profileId, keyId: ownership.keyId, publicKey: ownership.publicKey };
    anchors.push({
      ...base,
      signature: await signCanonical(anchorDocument(sceneId, capturedAt, baseHash, base), ownership.privateKey),
    });
  }
  if (anchors.length === 0) {
    throw new Error("Minstens één eigen profiel is nodig om deze toestemmingsversies vast te zetten");
  }
  return { version: 1, sceneId, capturedAt, profileA: a, profileB: b, baseHash, anchors, events: [] };
}

function eventDocument(event: Omit<SceneConsentEvent, "eventHash" | "signature">) {
  return {
    format: 1,
    sceneId: event.sceneId,
    profileId: event.profileId,
    profileName: event.profileName,
    createdAt: event.createdAt,
    kind: event.kind,
    kinkId: event.kinkId,
    kinkName: event.kinkName,
    status: event.status,
    note: event.note,
    previousHash: event.previousHash,
    keyId: event.keyId,
    publicKey: event.publicKey,
  };
}

export async function createSignedSceneConsentEvent(
  scene: SceneRecord,
  profile: Profile,
  ownership: ProfileOwnershipKey,
  input: SceneConsentEventInput,
  createdAt = Date.now(),
): Promise<SceneConsentEvent> {
  if (!scene.consentLedger) throw new Error("Deze scène heeft nog geen vastgelegde toestemming");
  if (profile.origin === "shared" || ownership.profileId !== profile.id) {
    throw new Error("Alleen de eigenaar kan een toestemmingswijziging bevestigen");
  }
  if (!profile.consentSeal || profile.consentSeal.keyId !== ownership.keyId) {
    throw new Error("Dit profiel heeft nog geen geldige eigenaarsverzegeling");
  }
  const sceneSnapshot = scene.consentLedger.profileA.profileId === profile.id
    ? scene.consentLedger.profileA
    : scene.consentLedger.profileB.profileId === profile.id ? scene.consentLedger.profileB : null;
  if (!sceneSnapshot?.seal || sceneSnapshot.seal.keyId !== ownership.keyId) {
    throw new Error("De eigenaarsbron van deze scène komt niet overeen met het huidige profiel");
  }
  const previousHash = scene.consentLedger.events.length > 0
    ? scene.consentLedger.events[scene.consentLedger.events.length - 1].eventHash
    : scene.consentLedger.baseHash;
  const base = {
    id: crypto.randomUUID(),
    sceneId: scene.id,
    profileId: profile.id,
    profileName: profile.name,
    createdAt,
    kind: input.kind,
    kinkId: input.kinkId,
    kinkName: input.kinkName,
    status: input.status,
    note: input.note?.trim() || undefined,
    previousHash,
    keyId: ownership.keyId,
    publicKey: ownership.publicKey,
  } satisfies Omit<SceneConsentEvent, "eventHash" | "signature">;
  const document = eventDocument(base);
  return {
    ...base,
    eventHash: await hashCanonical(document),
    signature: await signCanonical(document, ownership.privateKey),
  };
}

export async function verifySceneConsentEvent(event: SceneConsentEvent): Promise<boolean> {
  const { eventHash: _hash, signature: _signature, ...base } = event;
  const document = eventDocument(base);
  return await hashCanonical(document) === event.eventHash
    && await verifyCanonical(document, event.signature, event.publicKey);
}

export async function verifySceneConsentLedger(ledger: SceneConsentLedger): Promise<boolean> {
  const expectedBase = await hashCanonical({
    format: 1,
    sceneId: ledger.sceneId,
    capturedAt: ledger.capturedAt,
    a: ledger.profileA.snapshotHash,
    b: ledger.profileB.snapshotHash,
  });
  if (expectedBase !== ledger.baseHash || ledger.anchors.length === 0) return false;
  let validAnchor = false;
  for (const anchor of ledger.anchors) {
    const snapshot = anchor.profileId === ledger.profileA.profileId
      ? ledger.profileA
      : anchor.profileId === ledger.profileB.profileId ? ledger.profileB : null;
    if (!snapshot?.seal || snapshot.seal.keyId !== anchor.keyId) continue;
    if (await verifyCanonical(
      anchorDocument(ledger.sceneId, ledger.capturedAt, ledger.baseHash, anchor),
      anchor.signature,
      anchor.publicKey,
    )) validAnchor = true;
  }
  if (!validAnchor) return false;
  for (const snapshot of [ledger.profileA, ledger.profileB]) {
    if (await hashCanonical({
      profileId: snapshot.profileId,
      profileName: snapshot.profileName,
      profileCode: snapshot.profileCode,
      capturedAt: snapshot.capturedAt,
      revision: snapshot.revision,
      data: snapshot.data,
      seal: snapshot.seal,
      trust: snapshot.trust,
    }) !== snapshot.snapshotHash) return false;
    const verification = await verifyProfileConsentData(snapshot.data, snapshot.seal, snapshot.revision);
    if (snapshot.seal && verification.status !== "confirmed") return false;
  }
  let previous = ledger.baseHash;
  for (const event of ledger.events) {
    const snapshot = event.profileId === ledger.profileA.profileId
      ? ledger.profileA
      : event.profileId === ledger.profileB.profileId ? ledger.profileB : null;
    if (!snapshot?.seal || event.keyId !== snapshot.seal.keyId) return false;
    if (event.previousHash !== previous || !await verifySceneConsentEvent(event)) return false;
    previous = event.eventHash;
  }
  return true;
}

export function describeConsentEvent(event: SceneConsentEvent): string {
  const target = event.kinkName ? ` voor ${event.kinkName}` : " voor de sessie";
  if (event.kind === "withdrawn") return `Toestemming ingetrokken${target}`;
  if (event.kind === "added") return `Toestemming toegevoegd${target}`;
  if (event.kind === "changed") return `Toestemming aangepast${target}`;
  return event.note || `Notitie${target}`;
}

export function consentLedgerDebugText(ledger: SceneConsentLedger): string {
  return canonicalJson({ baseHash: ledger.baseHash, anchors: ledger.anchors.map((anchor) => anchor.keyId), events: ledger.events.map((event) => event.eventHash) });
}
''')
