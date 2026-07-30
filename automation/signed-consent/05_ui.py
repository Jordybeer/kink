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

write('components/ConsentTrustSheet.tsx', r'''
"use client";

import { ShieldCheck, ShieldWarning, Key, LockKey } from "@phosphor-icons/react";
import type { Profile } from "@/types";
import { getProfileAlias } from "@/lib/profileAlias";
import { getProfileVerificationCode } from "@/lib/profileVerification";
import Sheet, { SheetContent } from "@/components/Sheet";

interface Props {
  profile: Profile;
  open: boolean;
  onClose: () => void;
}

function statusFor(profile: Profile) {
  if (profile.origin !== "shared") {
    return {
      label: "Eigen profiel",
      detail: profile.consentSeal
        ? "Dit toestel bezit de persoonlijke sleutel waarmee nieuwe versies worden bevestigd."
        : "De persoonlijke sleutel wordt automatisch gebruikt zodra je dit profiel deelt of bij een scène vastlegt.",
      color: "var(--accent)",
      icon: ShieldCheck,
    };
  }
  if (profile.sourceTrust === "confirmed") {
    return {
      label: "Bron bevestigd",
      detail: "De gedeelde toestemmingsgegevens passen bij de verzegeling van de oorspronkelijke bron.",
      color: "var(--yes)",
      icon: ShieldCheck,
    };
  }
  if (profile.sourceTrust === "invalid") {
    return {
      label: "Controle mislukt",
      detail: "De inhoud of brongegevens zijn veranderd. Gebruik dit profiel niet als actuele afspraak.",
      color: "var(--hard-no)",
      icon: ShieldWarning,
    };
  }
  return {
    label: "Gedeeld profiel",
    detail: "Dit profiel kwam via delen binnen, maar gebruikt nog geen bronbevestiging. Het blijft wel alleen-lezen.",
    color: "var(--maybe)",
    icon: ShieldWarning,
  };
}

export default function ConsentTrustSheet({ profile, open, onClose }: Props) {
  const status = statusFor(profile);
  const StatusIcon = status.icon;
  const alias = getProfileAlias(profile);
  const code = getProfileVerificationCode(profile);

  return (
    <Sheet open={open} onClose={onClose} aria-label="Bron en toestemming controleren">
      <SheetContent>
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-none"
            style={{ background: `color-mix(in srgb, ${status.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${status.color} 35%, transparent)` }}
          >
            <StatusIcon size={22} style={{ color: status.color }} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold">{status.label}</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text2)", lineHeight: 1.55 }}>{status.detail}</p>
          </div>
        </div>

        <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--text2)" }}>Herkenbare profielnaam</p>
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{alias}</p>
          <p className="text-xs mt-3 font-semibold mb-1" style={{ color: "var(--text2)" }}>Technische profielcode</p>
          <p className="text-xs font-mono tracking-wide break-all" style={{ color: "var(--text)" }}>{code}</p>
        </div>

        <div className="space-y-4 text-sm" style={{ color: "var(--text2)", lineHeight: 1.65 }}>
          <div className="flex gap-3">
            <Key size={18} className="flex-none mt-0.5" style={{ color: "var(--accent)" }} aria-hidden="true" />
            <p>
              Elk eigen profiel krijgt op dit toestel een persoonlijke digitale sleutel. Bij delen verzegelt KinkSync precies de zichtbare toestemmingsgegevens. Een ander toestel kan daardoor controleren of de bron dezelfde is en of de inhoud daarna is aangepast.
            </p>
          </div>
          <div className="flex gap-3">
            <LockKey size={18} className="flex-none mt-0.5" style={{ color: "var(--accent)" }} aria-hidden="true" />
            <p>
              Een gedeelde QR bevat alleen wat nodig is om te controleren. Daarmee kan de ontvanger geen geldige nieuwe versie maken. Je versleutelde backup neemt de persoonlijke sleutel wél mee, zodat je eigen profiel na herstel bewerkbaar blijft.
            </p>
          </div>
        </div>

        <div className="rounded-xl px-4 py-3 mt-5 mb-5 text-xs" style={{ background: "color-mix(in srgb, var(--maybe) 8%, var(--surface2))", border: "1px solid var(--border)", color: "var(--text2)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text)" }}>Wat dit niet bewijst:</strong> een sleutel bevestigt de bron en inhoud, niet iemands wettelijke identiteit, vrije wil of blijvende toestemming. Stoppen, twijfel of intrekking tijdens een sessie gaan altijd voor op wat eerder in de app stond.
        </div>

        <button
          type="button"
          onClick={onClose}
          className="focus-ring w-full py-2.5 rounded-xl text-sm font-medium border"
          style={{ borderColor: "var(--border)", color: "var(--text2)" }}
        >
          Sluit
        </button>
      </SheetContent>
    </Sheet>
  );
}
''')

replace_once('components/ProfileHero.tsx', '''import { ArrowSquareOut, CameraPlus, Lock, PencilSimple, ArrowsClockwise, ShareNetwork, Trash } from "@phosphor-icons/react";
''', '''import { ArrowSquareOut, CameraPlus, Lock, PencilSimple, ArrowsClockwise, ShareNetwork, Trash, ShieldCheck, ShieldWarning } from "@phosphor-icons/react";
''')
replace_once('components/ProfileHero.tsx', '''import { getProfileVerificationCode } from "@/lib/profileVerification";
''', '''import ConsentTrustSheet from "@/components/ConsentTrustSheet";
''')
replace_once('components/ProfileHero.tsx', '''  const [menuOpen, setMenuOpen] = useState(false);

  const expLevel = profile.experienceLevel ?? "beginner";
  const initial = profile.name.charAt(0).toUpperCase();
  const verificationCode = getProfileVerificationCode(profile);
''', '''  const [menuOpen, setMenuOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);

  const expLevel = profile.experienceLevel ?? "beginner";
  const initial = profile.name.charAt(0).toUpperCase();
  const isOwn = profile.origin !== "shared";
  const sourceConfirmed = profile.sourceTrust === "confirmed";
  const trustLabel = isOwn ? "Eigen profiel" : sourceConfirmed ? "Bron bevestigd" : "Gedeeld profiel";
  const TrustIcon = isOwn || sourceConfirmed ? ShieldCheck : ShieldWarning;
  const trustColor = isOwn ? "var(--accent)" : sourceConfirmed ? "var(--yes)" : "var(--maybe)";
''')
replace_once('components/ProfileHero.tsx', '''  return (
    <section className="ks-fade-in mx-4 px-4 pt-6 pb-4">
''', '''  return (
    <>
    <section className="ks-fade-in mx-4 px-4 pt-6 pb-4">
''')
replace_once('components/ProfileHero.tsx', '''          <span
            className="inline-flex mt-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
            title="Helpt hetzelfde profiel en mogelijke duplicaten herkennen; dit is geen identiteitsbewijs."
          >
            Profielcode&nbsp;<span className="font-mono tracking-wide">{verificationCode}</span>
          </span>
          {profileType === "partner" && profile.lockedAt && (
            <span
              className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full"
              style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
            >
              Geïmporteerd {new Date(profile.lockedAt).toLocaleDateString("nl-NL", { month: "short", year: "numeric" })}
            </span>
          )}
''', '''          <button
            type="button"
            onClick={() => setTrustOpen(true)}
            className="focus-ring inline-flex items-center gap-1.5 mt-1.5 text-xs px-2 py-1 rounded-full font-medium"
            style={{ background: `color-mix(in srgb, ${trustColor} 8%, var(--surface2))`, color: trustColor, border: `1px solid color-mix(in srgb, ${trustColor} 35%, var(--border))` }}
            aria-label={`${trustLabel}. Bekijk uitleg over broncontrole`}
          >
            <TrustIcon size={12} aria-hidden="true" />
            {trustLabel}
          </button>
''')
replace_once('components/ProfileHero.tsx', '''    </section>
  );
}
''', '''    </section>
    <ConsentTrustSheet profile={profile} open={trustOpen} onClose={() => setTrustOpen(false)} />
    </>
  );
}
''')

replace_once('components/QRModal.tsx', '''import { getProfileVerificationCode } from "@/lib/profileVerification";
''', '''import { getProfileAlias } from "@/lib/profileAlias";
import { useStore } from "@/lib/store";
''')
replace_once('components/QRModal.tsx', '''  const [generationError, setGenerationError] = useState<string | null>(null);
''', '''  const [generationError, setGenerationError] = useState<string | null>(null);
  const sealProfileForSharing = useStore((state) => state.sealProfileForSharing);
''')
replace_once('components/QRModal.tsx', '''        const payload = await encodeProfileV3(profile, { includeFetLife });
''', '''        const prepared = profile.origin === "shared"
          ? profile
          : await sealProfileForSharing(profile.id);
        if (!prepared) throw new Error("Profiel kon niet worden verzegeld");
        const payload = await encodeProfileV3(prepared, { includeFetLife });
''')
replace_once('components/QRModal.tsx', '''  }, [profile, includeFetLife]);
''', '''  }, [profile?.id, profile?.consentRevision, includeFetLife, sealProfileForSharing]);
''')
replace_once('components/QRModal.tsx', '''  const verificationCode = profile ? getProfileVerificationCode(profile) : null;
''', '''  const profileAlias = profile ? getProfileAlias(profile) : null;
''')
replace_once('components/QRModal.tsx', '''            <p className="text-[11px] mt-1" style={{ color: "var(--text2)" }}>
              Profielcode <span className="font-mono tracking-wide">{verificationCode}</span>
            </p>
''', '''            <p className="text-xs mt-1" style={{ color: "var(--text2)" }}>
              {profileAlias} · verzegelde versie
            </p>
''')
replace_once('components/QRModal.tsx', '''        <p className="text-xs text-center mb-1" style={{ color: "var(--text2)" }}>
          Deelt alle niet-verborgen profielgegevens zonder dataverlies.
        </p>
''', '''        <p className="text-xs text-center mb-1" style={{ color: "var(--text2)" }}>
          Deelt alle niet-verborgen profielgegevens zonder dataverlies. De ontvanger kan controleren of deze versie daarna is aangepast.
        </p>
''')

replace_once('app/page.tsx', '''import { classifyProfileImport, getProfileVerificationCode } from "@/lib/profileVerification";
''', '''import { classifyProfileImport } from "@/lib/profileVerification";
import { getProfileAlias } from "@/lib/profileAlias";
''')
replace_once('app/page.tsx', '''              <div className="text-[11px] mt-1" style={{ color: "var(--text2)" }}>
                Profielcode <span className="font-mono tracking-wide">{getProfileVerificationCode(importPreview)}</span>
              </div>
''', '''              <div className="text-xs mt-1" style={{ color: importPreview.sourceTrust === "confirmed" ? "var(--yes)" : "var(--text2)" }}>
                {getProfileAlias(importPreview)} · {importPreview.sourceTrust === "confirmed" ? "bron bevestigd" : "gedeeld profiel"}
              </div>
''')

replace_once('components/sheets/EncryptedBackupSheets.tsx', '''import type { Profile, ContractSnapshot } from "@/types";
''', '''import type { Profile, ContractSnapshot, ProfileOwnershipKey } from "@/types";
import { sanitizeProfileOwnershipKey } from "@/lib/consentCrypto";
''')
replace_once('components/sheets/EncryptedBackupSheets.tsx', '''  const { profiles, contracts } = useStore();
''', '''  const { profiles, contracts, profileKeys } = useStore();
''')
replace_once('components/sheets/EncryptedBackupSheets.tsx', '''      const plain = JSON.stringify({ version: 1, source: "backup", profiles, contracts });
''', '''      const plain = JSON.stringify({
        version: 2,
        source: "backup",
        profiles,
        contracts,
        profileKeys: Object.values(profileKeys),
      });
''')
replace_once('components/sheets/EncryptedBackupSheets.tsx', '''                <p>Met encryptie is het bestand waardeloos zonder jouw wachtwoord. Zonder encryptie kan iedereen die het bestand vindt alles lezen.</p>
''', '''                <p>Met encryptie is het bestand waardeloos zonder jouw wachtwoord. Zonder encryptie kan iedereen die het bestand vindt alles lezen.</p>
                <p>De backup neemt ook de persoonlijke profielsleutels mee. Daardoor blijven je eigen profielen na herstel bewerkbaar en behouden gedeelde versies dezelfde bevestigde bron.</p>
''')
replace_once('components/sheets/EncryptedBackupSheets.tsx', '''  const { importProfiles, restoreContracts } = useStore();
''', '''  const { importProfiles, restoreContracts, restoreProfileKeys } = useStore();
''')
replace_once('components/sheets/EncryptedBackupSheets.tsx', '''      const incoming = parsed.profiles
        .map((p) => sanitizeProfileFull(p))
        .filter((p): p is Profile => p !== null);
''', '''      const incoming = parsed.profiles
        .map((p) => sanitizeProfileFull(p))
        .filter((p): p is Profile => p !== null)
        .map((profile) => {
          const shared = profile.origin === "shared" || profile.isImported === true;
          return shared
            ? { ...profile, origin: "shared" as const, isImported: true, lockedAt: profile.lockedAt ?? Date.now() }
            : { ...profile, origin: "own" as const, isImported: false, sourceTrust: "self" as const };
        });
''')
replace_once('components/sheets/EncryptedBackupSheets.tsx', '''      if (incoming.length) importProfiles(incoming.map(p => ({ ...p, isImported: true as const, origin: "shared" as const, lockedAt: p.lockedAt ?? Date.now() })));
      if (restoredContracts.length) restoreContracts(restoredContracts);
      onSuccess(`${incoming.length} profiel(en) en ${restoredContracts.length} contract(en) hersteld.`);
''', '''      if (incoming.length) importProfiles(incoming);
      const restoredKeys = (Array.isArray(parsed.profileKeys) ? parsed.profileKeys : [])
        .map((key) => sanitizeProfileOwnershipKey(key))
        .filter((key): key is ProfileOwnershipKey => key !== null);
      if (restoredKeys.length) restoreProfileKeys(restoredKeys);
      if (restoredContracts.length) restoreContracts(restoredContracts);
      onSuccess(`${incoming.length} profiel(en), ${restoredContracts.length} contract(en) en ${restoredKeys.length} eigendomssleutel(s) hersteld.`);
''')
