from pathlib import Path
import shutil

ROOT = Path(".")


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one anchor, found {count}: {old[:80]!r}")
    target.write_text(text.replace(old, new, 1))


shutil.copyfile(
    ROOT / "scripts/profile-verification-src/profileVerification.ts",
    ROOT / "lib/profileVerification.ts",
)
shutil.copyfile(
    ROOT / "scripts/profile-verification-src/profileVerification.test.ts",
    ROOT / "__tests__/profileVerification.test.ts",
)

replace_once(
    "types/index.ts",
    '''export interface Profile {\n  id: string;\n  name: string;''',
    '''export interface Profile {\n  id: string;\n  /** Immutable, human-readable lineage marker shared with the profile. */\n  verificationCode?: string;\n  name: string;''',
)

replace_once(
    "lib/sanitizeProfile.ts",
    '''} from "@/types";\nimport {\n  clamp,''',
    '''} from "@/types";\nimport {\n  deriveProfileVerificationCode,\n  normalizeProfileVerificationCode,\n} from "@/lib/profileVerification";\nimport {\n  clamp,''',
)
replace_once(
    "lib/sanitizeProfile.ts",
    '''  const profile: Profile = {\n    id,\n    name,''',
    '''  const profile: Profile = {\n    id,\n    verificationCode: normalizeProfileVerificationCode(r.verificationCode)\n      ?? deriveProfileVerificationCode(id),\n    name,''',
)

replace_once(
    "lib/store.ts",
    '''import { deriveCounts } from "@/lib/profileSnapshot";''',
    '''import { deriveCounts } from "@/lib/profileSnapshot";\nimport { generateProfileVerificationCode, getProfileVerificationCode } from "@/lib/profileVerification";''',
)
replace_once(
    "lib/store.ts",
    '''              id,\n              name,''',
    '''              id,\n              verificationCode: generateProfileVerificationCode(),\n              name,''',
)
replace_once(
    "lib/store.ts",
    '''      importProfiles(incoming) {\n        set((s) => {\n          const existingIds = new Set(s.profiles.map((p) => p.id));\n          const novel = incoming.filter((p) => !existingIds.has(p.id));\n          return novel.length === 0 ? s : { profiles: [...s.profiles, ...novel] };\n        });\n      },''',
    '''      importProfiles(incoming) {\n        set((s) => {\n          const existingIds = new Set(s.profiles.map((p) => p.id));\n          const existingCodes = new Set(s.profiles.map(getProfileVerificationCode));\n          const novel: Profile[] = [];\n          for (const profile of incoming) {\n            const verificationCode = getProfileVerificationCode(profile);\n            if (existingIds.has(profile.id) || existingCodes.has(verificationCode)) continue;\n            novel.push({ ...profile, verificationCode });\n            existingIds.add(profile.id);\n            existingCodes.add(verificationCode);\n          }\n          return novel.length === 0 ? s : { profiles: [...s.profiles, ...novel] };\n        });\n      },''',
)
replace_once(
    "lib/store.ts",
    '''      version: 15,''',
    '''      version: 16,''',
)
replace_once(
    "lib/store.ts",
    '''        if (version < 15 && state.profiles) {\n          const STATUS_ORDER = ["hard_no", "no", "maybe", "willing", "yes"] as const;''',
    '''        if (version < 15 && state.profiles) {\n          const STATUS_ORDER = ["hard_no", "no", "maybe", "willing", "yes"] as const;''',
)
replace_once(
    "lib/store.ts",
    '''        }\n        return state;\n      },''',
    '''        }\n        if (version < 16 && state.profiles) {\n          state.profiles = state.profiles.map((profile) => ({\n            ...profile,\n            verificationCode: getProfileVerificationCode(profile),\n          }));\n        }\n        return state;\n      },''',
)

replace_once(
    "lib/profileShareV3.ts",
    '''import { decodeAny } from "@/lib/shareProfile";''',
    '''import { decodeAny } from "@/lib/shareProfile";\nimport { getProfileVerificationCode } from "@/lib/profileVerification";''',
)
replace_once(
    "lib/profileShareV3.ts",
    '''  u: number;\n  rs?: string;''',
    '''  u: number;\n  vc?: string;\n  rs?: string;''',
)
replace_once(
    "lib/profileShareV3.ts",
    '''    c: profile.createdAt,\n    u: profile.updatedAt,\n  };''',
    '''    c: profile.createdAt,\n    u: profile.updatedAt,\n    vc: getProfileVerificationCode(profile),\n  };''',
)
replace_once(
    "lib/profileShareV3.ts",
    '''  const raw = {\n    id: p.i,\n    name: p.n,''',
    '''  const raw = {\n    id: p.i,\n    verificationCode: p.vc,\n    name: p.n,''',
)

replace_once(
    "lib/shareProfile.ts",
    '''import { clamp, MAX_CUSTOM_KINKS, MAX_ID_LEN, MAX_KINK_ID_LEN, MAX_KINK_NAME_LEN, MAX_NAME_LEN, MAX_ROLE_LEN, VALID_LEVELS } from "@/lib/sessionImport";''',
    '''import { clamp, MAX_CUSTOM_KINKS, MAX_ID_LEN, MAX_KINK_ID_LEN, MAX_KINK_NAME_LEN, MAX_NAME_LEN, MAX_ROLE_LEN, VALID_LEVELS } from "@/lib/sessionImport";\nimport { deriveProfileVerificationCode, getProfileVerificationCode, normalizeProfileVerificationCode } from "@/lib/profileVerification";''',
)
replace_once(
    "lib/shareProfile.ts",
    '''    id: profile.id,\n    n: profile.name,''',
    '''    id: profile.id,\n    vc: getProfileVerificationCode(profile),\n    n: profile.name,''',
)
replace_once(
    "lib/shareProfile.ts",
    '''  return {\n    id,\n    name,''',
    '''  return {\n    id,\n    verificationCode: normalizeProfileVerificationCode(p.vc)\n      ?? deriveProfileVerificationCode(id),\n    name,''',
)

replace_once(
    "components/ProfileHero.tsx",
    '''import type { ProfileType } from "@/lib/profileType";''',
    '''import type { ProfileType } from "@/lib/profileType";\nimport { getProfileVerificationCode } from "@/lib/profileVerification";''',
)
replace_once(
    "components/ProfileHero.tsx",
    '''  const expLevel = profile.experienceLevel ?? "beginner";\n  const initial = profile.name.charAt(0).toUpperCase();''',
    '''  const expLevel = profile.experienceLevel ?? "beginner";\n  const initial = profile.name.charAt(0).toUpperCase();\n  const verificationCode = getProfileVerificationCode(profile);''',
)
replace_once(
    "components/ProfileHero.tsx",
    '''          </p>\n          {profileType === "partner" && profile.lockedAt && (''',
    '''          </p>\n          <span\n            className="inline-flex mt-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium"\n            style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}\n            title="Helpt hetzelfde profiel en mogelijke duplicaten herkennen; dit is geen identiteitsbewijs."\n          >\n            Profielcode&nbsp;<span className="font-mono tracking-wide">{verificationCode}</span>\n          </span>\n          {profileType === "partner" && profile.lockedAt && (''',
)

replace_once(
    "components/QRModal.tsx",
    '''import { buildProfileQrSet } from "@/lib/profileQr";''',
    '''import { buildProfileQrSet } from "@/lib/profileQr";\nimport { getProfileVerificationCode } from "@/lib/profileVerification";''',
)
replace_once(
    "components/QRModal.tsx",
    '''  const multi = qrValues.length > 1;\n\n  return (''',
    '''  const multi = qrValues.length > 1;\n  const verificationCode = profile ? getProfileVerificationCode(profile) : null;\n\n  return (''',
)
replace_once(
    "components/QRModal.tsx",
    '''        {profile && (\n          <p className="text-sm text-center mb-3" style={{ color: "var(--accent)" }}>\n            {profile.name}\n          </p>\n        )}''',
    '''        {profile && (\n          <div className="text-center mb-3">\n            <p className="text-sm" style={{ color: "var(--accent)" }}>{profile.name}</p>\n            <p className="text-[11px] mt-1" style={{ color: "var(--text2)" }}>\n              Profielcode <span className="font-mono tracking-wide">{verificationCode}</span>\n            </p>\n          </div>\n        )}''',
)

replace_once(
    "app/page.tsx",
    '''import { parseSharePaste } from "@/lib/parseSharePaste";''',
    '''import { parseSharePaste } from "@/lib/parseSharePaste";\nimport { classifyProfileImport, getProfileVerificationCode } from "@/lib/profileVerification";''',
)
replace_once(
    "app/page.tsx",
    '''  const [importPreview, setImportPreview] = useState<Profile | null>(null);\n  const [importDone, setImportDone] = useState(false);''',
    '''  const [importPreview, setImportPreview] = useState<Profile | null>(null);\n  const [importDone, setImportDone] = useState(false);\n  const importIdentity = importPreview ? classifyProfileImport(profiles, importPreview) : null;''',
)
replace_once(
    "app/page.tsx",
    '''              <div className="text-xs mt-0.5 tabular-nums" style={{ color: "var(--text2)" }}>\n                {Object.values(importPreview.entries).filter((e) => e.status).length} kinks beoordeeld\n              </div>''',
    '''              <div className="text-xs mt-0.5 tabular-nums" style={{ color: "var(--text2)" }}>\n                {Object.values(importPreview.entries).filter((e) => e.status).length} kinks beoordeeld\n              </div>\n              <div className="text-[11px] mt-1" style={{ color: "var(--text2)" }}>\n                Profielcode <span className="font-mono tracking-wide">{getProfileVerificationCode(importPreview)}</span>\n              </div>''',
)
replace_once(
    "app/page.tsx",
    '''        <div className="flex flex-col gap-3">\n          {importDone ? (\n            <p className="text-sm text-center py-2 font-semibold" style={{ color: "var(--accent)" }}>\n              ✓ Profiel geïmporteerd!\n            </p>\n          ) : (\n            <button\n              onClick={() => {\n                if (!importPreview) return;\n                importProfiles([{ ...importPreview, isImported: true, origin: "shared", lockedAt: Date.now() }]);\n                setImportDone(true);\n                router.replace("/");\n                setTimeout(() => { setImportPreview(null); setImportDone(false); }, 1500);\n              }}\n              className="focus-ring w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"\n              style={{ background: "var(--accent)", color: "var(--on-accent)" }}\n            >\n              Importeer profiel\n            </button>\n          )}\n          <button\n            onClick={() => { setImportPreview(null); router.replace("/"); }}\n            className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"\n            style={{ borderColor: "var(--border)", color: "var(--text2)" }}\n          >\n            Niet nu\n          </button>\n        </div>''',
    '''        {importIdentity?.kind === "same-code" && (\n          <div className="rounded-xl px-3 py-2.5 mb-4 text-xs" style={{ background: "color-mix(in srgb, var(--accent) 10%, var(--surface2))", border: "1px solid var(--border-accent)", color: "var(--text2)" }}>\n            Dezelfde profielcode staat al bij <strong style={{ color: "var(--text)" }}>{importIdentity.profile.name}</strong>. Dit is hetzelfde profiel, niet een nieuwe kopie.\n          </div>\n        )}\n        {importIdentity?.kind === "same-name-role" && (\n          <div className="rounded-xl px-3 py-2.5 mb-4 text-xs" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>\n            Zelfde naam en rol, maar een andere profielcode. Importeer dit alleen wanneer het bewust een apart profiel is.\n          </div>\n        )}\n        <div className="flex flex-col gap-3">\n          {importDone ? (\n            <p className="text-sm text-center py-2 font-semibold" style={{ color: "var(--accent)" }}>\n              ✓ Profiel geïmporteerd!\n            </p>\n          ) : importIdentity?.kind === "same-code" ? (\n            <button\n              onClick={() => { setImportPreview(null); router.push(`/profile/${importIdentity.profile.id}`); }}\n              className="focus-ring w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"\n              style={{ background: "var(--accent)", color: "var(--on-accent)" }}\n            >\n              Open bestaand profiel\n            </button>\n          ) : (\n            <button\n              onClick={() => {\n                if (!importPreview) return;\n                importProfiles([{ ...importPreview, verificationCode: getProfileVerificationCode(importPreview), isImported: true, origin: "shared", lockedAt: Date.now() }]);\n                setImportDone(true);\n                router.replace("/");\n                setTimeout(() => { setImportPreview(null); setImportDone(false); }, 1500);\n              }}\n              className="focus-ring w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"\n              style={{ background: "var(--accent)", color: "var(--on-accent)" }}\n            >\n              {importIdentity?.kind === "same-name-role" ? "Importeer als apart profiel" : "Importeer profiel"}\n            </button>\n          )}\n          <button\n            onClick={() => { setImportPreview(null); router.replace("/"); }}\n            className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"\n            style={{ borderColor: "var(--border)", color: "var(--text2)" }}\n          >\n            Niet nu\n          </button>\n        </div>''',
)

replace_once(
    "__tests__/profileShareV3.test.ts",
    '''import { encodeProfile } from "@/lib/shareProfile";''',
    '''import { encodeProfile } from "@/lib/shareProfile";\nimport { deriveProfileVerificationCode } from "@/lib/profileVerification";''',
)
replace_once(
    "__tests__/profileShareV3.test.ts",
    '''  id: "profile-1",\n  name: "Alex",''',
    '''  id: "profile-1",\n  verificationCode: "KS-7H3P-9Q2M-A4BC",\n  name: "Alex",''',
)
replace_once(
    "__tests__/profileShareV3.test.ts",
    '''    expect(decoded.name).toBe(profile.name);''',
    '''    expect(decoded.name).toBe(profile.name);\n    expect(decoded.verificationCode).toBe(profile.verificationCode);''',
)
replace_once(
    "__tests__/profileShareV3.test.ts",
    '''  it("still decodes legacy v1 links", async () => {\n    const legacy = encodeProfile(profile, { includeFetLife: true });\n    const decoded = await decodeSharedProfile(legacy);\n    expect(decoded.name).toBe("Alex");\n    expect(decoded.entries.rope.status).toBe("yes");\n  });''',
    '''  it("still decodes legacy v1 links and deterministically backfills their code", async () => {\n    const { verificationCode: _verificationCode, ...withoutCode } = profile;\n    const legacy = encodeProfile(withoutCode as Profile, { includeFetLife: true });\n    const decoded = await decodeSharedProfile(legacy);\n    expect(decoded.name).toBe("Alex");\n    expect(decoded.entries.rope.status).toBe("yes");\n    expect(decoded.verificationCode).toBe(deriveProfileVerificationCode(profile.id));\n  });''',
)

replace_once(
    "docs/lossless-profile-sharing.md",
    '''- profile identity, role, experience and relationship status;''',
    '''- profile identity, immutable profile code, role, experience and relationship status;''',
)
replace_once(
    "docs/lossless-profile-sharing.md",
    '''The avatar, private note, local scene-use counters, imported/locked metadata and every\n`privateResponse` are excluded.''',
    '''The profile code is a stable lineage and duplicate-detection marker, not cryptographic\nproof of identity. The avatar, private note, local scene-use counters, imported/locked metadata and every\n`privateResponse` are excluded.''',
)

shutil.rmtree(ROOT / "scripts/profile-verification-src")
(ROOT / "scripts/apply-profile-verification.py").unlink()
(ROOT / ".github/workflows/apply-profile-verification.yml").unlink()
