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

# Types
replace_once('types/index.ts', '''export interface SceneItem {
''', '''export type ConsentSourceTrust = "self" | "confirmed" | "legacy" | "invalid" | "unverified";

export interface SharedKinkConsent {
  status: KinkStatus;
  desire?: number | null;
  experienced?: boolean | null;
  comment: string;
  tags?: string[];
  curious?: boolean;
}

export interface ProfileConsentData {
  profileId: string;
  profileCode: string;
  name: string;
  role: string;
  experienceLevel: ExperienceLevel;
  createdAt: number;
  relationshipStatus?: string;
  bdsmtestUrl?: string;
  bdsmtestScores?: BdsmtestScore[];
  customKinks: CustomKink[];
  entries: Record<string, SharedKinkConsent>;
}

export interface ProfileConsentSeal {
  algorithm: "ECDSA-P256-SHA256";
  keyId: string;
  publicKey: JsonWebKey;
  revision: number;
  issuedAt: number;
  previousHash?: string;
  payloadHash: string;
  signature: string;
}

export interface ProfileOwnershipKey {
  profileId: string;
  algorithm: "ECDSA-P256-SHA256";
  keyId: string;
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
  createdAt: number;
}

export interface SceneConsentSnapshot {
  profileId: string;
  profileName: string;
  profileCode: string;
  capturedAt: number;
  revision: number;
  data: ProfileConsentData;
  seal?: ProfileConsentSeal;
  trust: ConsentSourceTrust;
  snapshotHash: string;
}

export type SceneConsentEventKind = "withdrawn" | "changed" | "added" | "note";

export interface SceneConsentEventInput {
  kind: SceneConsentEventKind;
  kinkId?: string;
  kinkName?: string;
  status?: KinkStatus;
  note?: string;
}

export interface SceneConsentEvent extends SceneConsentEventInput {
  id: string;
  sceneId: string;
  profileId: string;
  profileName: string;
  createdAt: number;
  previousHash: string;
  keyId: string;
  publicKey: JsonWebKey;
  eventHash: string;
  signature: string;
}

export interface SceneConsentAnchor {
  profileId: string;
  keyId: string;
  publicKey: JsonWebKey;
  signature: string;
}

export interface SceneConsentLedger {
  version: 1;
  sceneId: string;
  capturedAt: number;
  profileA: SceneConsentSnapshot;
  profileB: SceneConsentSnapshot;
  baseHash: string;
  anchors: SceneConsentAnchor[];
  events: SceneConsentEvent[];
}

export interface SceneItem {
''')
replace_once('types/index.ts', '''  aftercare?: AftercareEntry;
}
''', '''  aftercare?: AftercareEntry;
  /** Frozen consent versions plus an append-only, signed change log. */
  consentLedger?: SceneConsentLedger;
}
''')
replace_once('types/index.ts', '''  /** Immutable, human-readable lineage marker shared with the profile. */
  verificationCode?: string;
''', '''  /** Immutable, human-readable lineage marker shared with the profile. */
  verificationCode?: string;
  /** Increments whenever shareable consent data changes. */
  consentRevision?: number;
  /** Hash of the last sealed version, used to link the next version. */
  previousConsentHash?: string;
  /** Signature over the current shareable consent version. */
  consentSeal?: ProfileConsentSeal;
  /** What this device can honestly claim about the profile source. */
  sourceTrust?: ConsentSourceTrust;
''')

# Sanitizer
replace_once('lib/sanitizeProfile.ts', '''import {
  deriveProfileVerificationCode,
  normalizeProfileVerificationCode,
} from "@/lib/profileVerification";
''', '''import {
  deriveProfileVerificationCode,
  normalizeProfileVerificationCode,
} from "@/lib/profileVerification";
import { sanitizeProfileConsentSeal } from "@/lib/consentCrypto";
''')
replace_once('lib/sanitizeProfile.ts', '''  if (typeof r.isImported === "boolean") profile.isImported = r.isImported;
  if (r.origin === "own" || r.origin === "shared") profile.origin = r.origin;
  const lockedAt = asFiniteNumber(r.lockedAt);
''', '''  if (typeof r.isImported === "boolean") profile.isImported = r.isImported;
  if (r.origin === "own" || r.origin === "shared") profile.origin = r.origin;
  const revision = asFiniteNumber(r.consentRevision);
  if (revision !== undefined) profile.consentRevision = Math.max(1, Math.round(revision));
  if (typeof r.previousConsentHash === "string" && r.previousConsentHash.length <= 200) {
    profile.previousConsentHash = r.previousConsentHash;
  }
  const consentSeal = sanitizeProfileConsentSeal(r.consentSeal);
  if (consentSeal) {
    profile.consentSeal = consentSeal;
    profile.consentRevision = consentSeal.revision;
  }
  if (["self", "confirmed", "legacy", "invalid", "unverified"].includes(String(r.sourceTrust))) {
    profile.sourceTrust = r.sourceTrust as Profile["sourceTrust"];
  }
  const lockedAt = asFiniteNumber(r.lockedAt);
''')

# Share v3
replace_once('lib/profileShareV3.ts', '''import { getProfileVerificationCode } from "@/lib/profileVerification";
''', '''import { getProfileVerificationCode } from "@/lib/profileVerification";
import { verifyProfileConsentSeal } from "@/lib/consentCrypto";
''')
replace_once('lib/profileShareV3.ts', '''  e?: EntryRow[];
}
''', '''  e?: EntryRow[];
  s?: Profile["consentSeal"];
}
''')
replace_once('lib/profileShareV3.ts', '''  if (customKinks.length) payload.k = customKinks;
  if (entries.length) payload.e = entries;
''', '''  if (customKinks.length) payload.k = customKinks;
  if (entries.length) payload.e = entries;
  if (profile.consentSeal) payload.s = profile.consentSeal;
''')
replace_once('lib/profileShareV3.ts', '''    entries,
  };
''', '''    entries,
    consentSeal: p.s,
    consentRevision: p.s?.revision,
    previousConsentHash: p.s?.previousHash,
  };
''')
replace_once('lib/profileShareV3.ts', '''  const decoded = compressed ? await decompressBytesBounded(bytes) : bytes;
  return expandProfile(JSON.parse(new TextDecoder().decode(decoded)));
}

export async function decodeSharedProfile(encoded: string): Promise<Profile> {
  return isProfileV3(encoded) ? decodeProfileV3(encoded) : decodeAny(encoded);
}
''', '''  const decoded = compressed ? await decompressBytesBounded(bytes) : bytes;
  const profile = expandProfile(JSON.parse(new TextDecoder().decode(decoded)));
  const verification = await verifyProfileConsentSeal(profile);
  if (verification.status === "invalid") {
    throw new Error(`Profielbron kon niet worden bevestigd: ${verification.reason}`);
  }
  return {
    ...profile,
    isImported: true,
    origin: "shared",
    lockedAt: Date.now(),
    sourceTrust: verification.status === "confirmed" ? "confirmed" : "legacy",
  };
}

export async function decodeSharedProfile(encoded: string): Promise<Profile> {
  if (isProfileV3(encoded)) return decodeProfileV3(encoded);
  const legacy = decodeAny(encoded);
  return { ...legacy, isImported: true, origin: "shared", lockedAt: Date.now(), sourceTrust: "legacy" };
}
''')

# Store imports and shape
replace_once('lib/store.ts', '''import type { Profile, KinkEntry, KinkStatus, ExperienceLevel, CustomKink, ContractSnapshot, ProfileSnapshot, SceneRecord, AftercareEntry } from "@/types";
''', '''import type { Profile, KinkEntry, KinkStatus, ExperienceLevel, CustomKink, ContractSnapshot, ProfileSnapshot, SceneRecord, AftercareEntry, ProfileOwnershipKey, SceneConsentEvent } from "@/types";
''')
replace_once('lib/store.ts', '''import { generateProfileVerificationCode, getProfileVerificationCode } from "@/lib/profileVerification";
''', '''import { generateProfileVerificationCode, getProfileVerificationCode } from "@/lib/profileVerification";
import { createProfileConsentSeal, generateProfileOwnershipKey } from "@/lib/consentCrypto";
''')
replace_once('lib/store.ts', '''  profiles: Profile[];
  contracts: ContractSnapshot[];
''', '''  profiles: Profile[];
  profileKeys: Record<string, ProfileOwnershipKey>;
  contracts: ContractSnapshot[];
''')
replace_once('lib/store.ts', '''  importProfiles: (incoming: Profile[]) => void;
  dismissInstallPrompt: () => void;
''', '''  importProfiles: (incoming: Profile[]) => void;
  ensureProfileOwnership: (profileId: string) => Promise<ProfileOwnershipKey | null>;
  sealProfileForSharing: (profileId: string) => Promise<Profile | null>;
  restoreProfileKeys: (keys: ProfileOwnershipKey[]) => void;
  appendSceneConsentEvent: (sceneId: string, event: SceneConsentEvent) => void;
  dismissInstallPrompt: () => void;
''')
replace_once('lib/store.ts', '''const EMPTY_ENTRY: KinkEntry = { status: null, comment: "" };
''', '''const EMPTY_ENTRY: KinkEntry = { status: null, comment: "" };

function withConsentChange(profile: Profile, patch: Partial<Profile>): Profile {
  if (profile.origin === "shared") return profile;
  return {
    ...profile,
    ...patch,
    updatedAt: Date.now(),
    consentRevision: Math.max(1, profile.consentRevision ?? 1) + 1,
    previousConsentHash: profile.consentSeal?.payloadHash ?? profile.previousConsentHash,
    consentSeal: undefined,
    sourceTrust: "self",
  };
}
''')
replace_once('lib/store.ts', '''      profiles: [],
      contracts: [],
''', '''      profiles: [],
      profileKeys: {},
      contracts: [],
''')
replace_once('lib/store.ts', '''              verificationCode: generateProfileVerificationCode(),
              name,
''', '''              verificationCode: generateProfileVerificationCode(),
              consentRevision: 1,
              sourceTrust: "self" as const,
              name,
''')
replace_once('lib/store.ts', '''        }));
        return id;
      },

      deleteProfile(id) {
''', '''        }));
        void get().ensureProfileOwnership(id).catch(() => undefined);
        return id;
      },

      deleteProfile(id) {
''')
replace_once('lib/store.ts', '''          profileSnapshots: s.profileSnapshots.filter((snap) => snap.profileId !== id),
        }));
''', '''          profileSnapshots: s.profileSnapshots.filter((snap) => snap.profileId !== id),
          profileKeys: Object.fromEntries(Object.entries(s.profileKeys).filter(([profileId]) => profileId !== id)),
        }));
''')
replace_once('lib/store.ts', '''            p.id === id
              ? { ...p, name, role, experienceLevel, relationshipStatus: relationshipStatus || undefined, fetLifeUsername: fetLifeUsername || undefined, bdsmtestUrl: bdsmtestUrl || undefined, updatedAt: Date.now() }
              : p
''', '''            p.id === id
              ? withConsentChange(p, { name, role, experienceLevel, relationshipStatus: relationshipStatus || undefined, fetLifeUsername: fetLifeUsername || undefined, bdsmtestUrl: bdsmtestUrl || undefined })
              : p
''')
replace_once('lib/store.ts', '''            p.id === id ? { ...p, bdsmtestScores: scores, updatedAt: Date.now() } : p
''', '''            p.id === id ? withConsentChange(p, { bdsmtestScores: scores }) : p
''')
replace_once('lib/store.ts', '''            return {
              ...p,
              updatedAt: Date.now(),
              entries: { ...p.entries, [kinkId]: { ...prev, ...patch } },
            };
''', '''            return withConsentChange(p, {
              entries: { ...p.entries, [kinkId]: { ...prev, ...patch } },
            });
''')
replace_once('lib/store.ts', '''            return { ...p, updatedAt: Date.now(), entries };
''', '''            return withConsentChange(p, { entries });
''')
replace_once('lib/store.ts', '''              : {
                  ...p,
                  updatedAt: Date.now(),
                  customKinks: [...(p.customKinks ?? []), { id, name: name.trim() }],
                }
''', '''              : withConsentChange(p, {
                  customKinks: [...(p.customKinks ?? []), { id, name: name.trim() }],
                })
''')
replace_once('lib/store.ts', '''              : {
                  ...p,
                  updatedAt: Date.now(),
                  customKinks: (p.customKinks ?? []).filter((k) => k.id !== kinkId),
                }
''', '''              : withConsentChange(p, {
                  customKinks: (p.customKinks ?? []).filter((k) => k.id !== kinkId),
                })
''')
replace_once('lib/store.ts', '''            novel.push({ ...profile, verificationCode });
''', '''            const shared = profile.origin === "shared" || profile.isImported === true;
            novel.push({
              ...profile,
              verificationCode,
              origin: shared ? "shared" : "own",
              isImported: shared,
              consentRevision: Math.max(1, profile.consentRevision ?? profile.consentSeal?.revision ?? 1),
              sourceTrust: profile.sourceTrust ?? (shared ? (profile.consentSeal ? "unverified" : "legacy") : "self"),
            });
''')
replace_once('lib/store.ts', '''      dismissInstallPrompt() {
''', '''      async ensureProfileOwnership(profileId) {
        const profile = get().profiles.find((item) => item.id === profileId);
        if (!profile || profile.origin === "shared") return null;
        const existing = get().profileKeys[profileId];
        if (existing) return existing;
        const generated = await generateProfileOwnershipKey(profileId);
        const raced = get().profileKeys[profileId];
        if (raced) return raced;
        set((state) => ({ profileKeys: { ...state.profileKeys, [profileId]: generated } }));
        return generated;
      },

      async sealProfileForSharing(profileId) {
        const ownership = await get().ensureProfileOwnership(profileId);
        if (!ownership) return null;
        const before = get().profiles.find((profile) => profile.id === profileId);
        if (!before || before.origin === "shared") return null;
        const revision = Math.max(1, before.consentRevision ?? 1);
        if (before.consentSeal?.revision === revision) return before;
        const seal = await createProfileConsentSeal(before, ownership);
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === profileId && Math.max(1, profile.consentRevision ?? 1) === revision
              ? { ...profile, consentSeal: seal, sourceTrust: "self" as const }
              : profile
          ),
        }));
        return get().profiles.find((profile) => profile.id === profileId) ?? null;
      },

      restoreProfileKeys(keys) {
        set((state) => {
          const ownIds = new Set(state.profiles.filter((profile) => profile.origin !== "shared").map((profile) => profile.id));
          const restored = { ...state.profileKeys };
          for (const key of keys) if (ownIds.has(key.profileId)) restored[key.profileId] = key;
          return { profileKeys: restored };
        });
      },

      appendSceneConsentEvent(sceneId, event) {
        set((state) => ({
          scenes: state.scenes.map((scene) => {
            if (scene.id !== sceneId || !scene.consentLedger) return scene;
            if (scene.consentLedger.events.some((item) => item.id === event.id)) return scene;
            const expected = scene.consentLedger.events.length > 0
              ? scene.consentLedger.events[scene.consentLedger.events.length - 1].eventHash
              : scene.consentLedger.baseHash;
            if (event.previousHash !== expected || event.sceneId !== scene.id) return scene;
            return {
              ...scene,
              updatedAt: Date.now(),
              consentLedger: {
                ...scene.consentLedger,
                events: [...scene.consentLedger.events, event],
              },
            };
          }),
        }));
      },

      dismissInstallPrompt() {
''')
replace_once('lib/store.ts', '''        profiles: state.profiles,
        contracts: state.contracts,
''', '''        profiles: state.profiles,
        profileKeys: state.profileKeys,
        contracts: state.contracts,
''')
replace_once('lib/store.ts', '''      version: 16,
''', '''      version: 17,
''')
replace_once('lib/store.ts', '''          profiles?: Profile[];
          contracts?: ContractSnapshot[];
''', '''          profiles?: Profile[];
          profileKeys?: Record<string, ProfileOwnershipKey>;
          contracts?: ContractSnapshot[];
''')
replace_once('lib/store.ts', '''        if (version < 16 && state.profiles) {
          state.profiles = state.profiles.map((profile) => ({
            ...profile,
            verificationCode: getProfileVerificationCode(profile),
          }));
        }
        return state;
''', '''        if (version < 16 && state.profiles) {
          state.profiles = state.profiles.map((profile) => ({
            ...profile,
            verificationCode: getProfileVerificationCode(profile),
          }));
        }
        if (version < 17) {
          state.profileKeys = state.profileKeys ?? {};
          state.profiles = (state.profiles ?? []).map((profile) => {
            const shared = profile.origin === "shared" || profile.isImported === true;
            return {
              ...profile,
              origin: shared ? "shared" as const : "own" as const,
              isImported: shared,
              consentRevision: Math.max(1, profile.consentRevision ?? profile.consentSeal?.revision ?? 1),
              sourceTrust: profile.sourceTrust ?? (shared ? (profile.consentSeal ? "unverified" : "legacy") : "self"),
            };
          });
        }
        return state;
''')
