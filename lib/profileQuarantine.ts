import type { Profile, ProfileOwnerKey } from "@/types";
import { verifyProfileConsent } from "@/lib/consentProof";
import { getProfileVerificationCode } from "@/lib/profileVerification";
import { sanitizeProfileFull } from "@/lib/sanitizeProfile";
import type { useStore as CoreUseStore } from "@/lib/storeCore";

export type ProfileIntegrityStatus = "idle" | "checking" | "ready";

export interface QuarantinedProfile {
  profile: Profile;
  quarantinedAt: number;
  reason: string;
}

export interface ProfileIntegrityResult {
  checked: number;
  quarantined: number;
  restored: number;
}

export interface ProfileQuarantineState {
  quarantinedProfiles: QuarantinedProfile[];
  profileIntegrityStatus: ProfileIntegrityStatus;
  verifyImportedProfiles: () => Promise<ProfileIntegrityResult>;
  deleteQuarantinedProfile: (profileId: string) => void;
}

type StoreHook = typeof CoreUseStore;
type CoreState = ReturnType<StoreHook["getState"]>;
type ExtendedState = CoreState & ProfileQuarantineState;

const STORAGE_KEY = "kink-profile-quarantine-v1";
const MAX_RECORDS = 30;
const installedStores = new WeakSet<object>();
const checksInFlight = new WeakMap<object, Promise<ProfileIntegrityResult>>();

function isSharedProfile(profile: Profile | undefined): boolean {
  return !!profile && (profile.origin === "shared" || profile.isImported === true);
}

function profileCode(profile: Profile): string {
  return getProfileVerificationCode(profile);
}

function sameTechnicalIdentity(a: Profile, b: Profile): boolean {
  return a.id === b.id && profileCode(a) === profileCode(b);
}

function hasIdentityConflict(profiles: Profile[], candidate: Profile): boolean {
  return profiles.some((profile) =>
    (profile.id === candidate.id || profileCode(profile) === profileCode(candidate))
    && !sameTechnicalIdentity(profile, candidate));
}

function clampReason(reason: unknown): string {
  const fallback = "De digitale bronbevestiging komt niet meer overeen met de opgeslagen profielgegevens.";
  if (typeof reason !== "string") return fallback;
  const clean = reason.trim().slice(0, 240);
  return clean || fallback;
}

function normalizeQuarantinedProfile(raw: unknown): QuarantinedProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Partial<QuarantinedProfile>;
  const clean = sanitizeProfileFull(record.profile);
  if (!clean) return null;
  return {
    profile: {
      ...clean,
      origin: "shared",
      isImported: true,
      lockedAt: clean.lockedAt ?? Date.now(),
    },
    quarantinedAt: typeof record.quarantinedAt === "number" && Number.isFinite(record.quarantinedAt)
      ? record.quarantinedAt
      : Date.now(),
    reason: clampReason(record.reason),
  };
}

export function sanitizeQuarantinedProfiles(raw: unknown): QuarantinedProfile[] {
  if (!Array.isArray(raw)) return [];
  const records: QuarantinedProfile[] = [];
  for (const item of raw.slice(0, MAX_RECORDS * 2)) {
    const record = normalizeQuarantinedProfile(item);
    if (!record) continue;
    const index = records.findIndex((candidate) => sameTechnicalIdentity(candidate.profile, record.profile));
    if (index >= 0) records[index] = record;
    else records.push(record);
    if (records.length >= MAX_RECORDS) break;
  }
  return records;
}

function readQuarantine(): QuarantinedProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return sanitizeQuarantinedProfiles(parsed);
  } catch {
    return [];
  }
}

function writeQuarantine(records: QuarantinedProfile[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch {
    // The in-memory quarantine remains active when storage is unavailable.
  }
}

function mergeQuarantine(
  current: QuarantinedProfile[],
  incoming: QuarantinedProfile[],
): QuarantinedProfile[] {
  const records = [...current];
  for (const record of incoming) {
    const index = records.findIndex((candidate) => sameTechnicalIdentity(candidate.profile, record.profile));
    if (index >= 0) {
      if (record.quarantinedAt >= records[index].quarantinedAt) records[index] = record;
    } else {
      records.push(record);
    }
  }
  return records
    .sort((a, b) => b.quarantinedAt - a.quarantinedAt)
    .slice(0, MAX_RECORDS);
}

function canReplaceQuarantinedProfile(existing: Profile, incoming: Profile): boolean {
  if (!sameTechnicalIdentity(existing, incoming)) return false;
  const current = existing.consentProof;
  const next = incoming.consentProof;
  if (!current || !next || current.keyId !== next.keyId) return false;
  if (next.version === current.version) return next.proofHash === current.proofHash;
  return next.version > current.version && next.previousProofHash === current.proofHash;
}

export function installProfileQuarantineSecurity(store: StoreHook): void {
  if (installedStores.has(store as object)) return;

  const original = store.getState();
  const originalImportProfiles = original.importProfiles;
  const originalRestoreBackupProfiles = original.restoreBackupProfiles as unknown as (
    incoming: Profile[],
    ownerKeys: ProfileOwnerKey[],
  ) => unknown;

  const initialQuarantine = readQuarantine();

  function getExtendedState(): ExtendedState {
    return store.getState() as ExtendedState;
  }

  function deleteQuarantinedProfile(profileId: string): void {
    let next: QuarantinedProfile[] = [];
    store.setState((state) => {
      const extended = state as ExtendedState;
      next = extended.quarantinedProfiles.filter((record) => record.profile.id !== profileId);
      return { quarantinedProfiles: next } as unknown as Partial<CoreState>;
    });
    writeQuarantine(next);
  }

  function verifyImportedProfiles(): Promise<ProfileIntegrityResult> {
    const running = checksInFlight.get(store as object);
    if (running) return running;

    store.setState({ profileIntegrityStatus: "checking" } as unknown as Partial<CoreState>);

    const task = (async () => {
      const start = getExtendedState();
      const persisted = readQuarantine();
      const quarantineAtStart = mergeQuarantine(start.quarantinedProfiles, persisted);
      const activeAtStart = start.profiles.filter((profile) => isSharedProfile(profile) && !!profile.consentProof);

      const activeResults = await Promise.all(activeAtStart.map(async (profile) => {
        try {
          return { profile, verification: await verifyProfileConsent(profile) };
        } catch {
          return {
            profile,
            verification: {
              status: "invalid" as const,
              reason: "De digitale broncontrole kon niet worden uitgevoerd.",
            },
          };
        }
      }));

      const quarantineResults = await Promise.all(quarantineAtStart.map(async (record) => {
        if (!record.profile.consentProof) {
          return { record, valid: false };
        }
        try {
          const verification = await verifyProfileConsent(record.profile);
          return { record, valid: verification.status === "valid" };
        } catch {
          return { record, valid: false };
        }
      }));

      let finalQuarantine = quarantineAtStart;
      let quarantined = 0;
      let restored = 0;

      store.setState((state) => {
        const extended = state as ExtendedState;
        const profiles = [...state.profiles];
        let records = mergeQuarantine(extended.quarantinedProfiles, quarantineAtStart);

        for (const result of activeResults) {
          if (result.verification.status !== "invalid") continue;
          const index = profiles.findIndex((profile) => profile === result.profile);
          if (index < 0) continue;
          const [removed] = profiles.splice(index, 1);
          const record: QuarantinedProfile = {
            profile: removed,
            quarantinedAt: Date.now(),
            reason: clampReason(result.verification.reason),
          };
          records = mergeQuarantine(records, [record]);
          quarantined += 1;
        }

        for (const result of activeResults) {
          if (result.verification.status !== "valid") continue;
          const recordIndex = records.findIndex((candidate) =>
            sameTechnicalIdentity(candidate.profile, result.profile)
            && canReplaceQuarantinedProfile(candidate.profile, result.profile));
          if (recordIndex < 0) continue;
          records.splice(recordIndex, 1);
          restored += 1;
        }

        for (const result of quarantineResults) {
          if (!result.valid) continue;
          const recordIndex = records.findIndex((candidate) =>
            sameTechnicalIdentity(candidate.profile, result.record.profile));
          if (recordIndex < 0) continue;

          const activeEquivalent = profiles.find((profile) =>
            sameTechnicalIdentity(profile, result.record.profile));
          if (!activeEquivalent && hasIdentityConflict(profiles, result.record.profile)) continue;

          if (!activeEquivalent) {
            profiles.push({
              ...result.record.profile,
              origin: "shared",
              isImported: true,
              lockedAt: result.record.profile.lockedAt ?? Date.now(),
            });
          }
          records.splice(recordIndex, 1);
          restored += 1;
        }

        finalQuarantine = records;
        const pinnedProfileId = state.pinnedProfileId
          && profiles.some((profile) => profile.id === state.pinnedProfileId)
          ? state.pinnedProfileId
          : null;

        return {
          profiles,
          quarantinedProfiles: records,
          profileIntegrityStatus: "ready",
          pinnedProfileId,
        } as unknown as Partial<CoreState>;
      });

      writeQuarantine(finalQuarantine);
      return {
        checked: activeResults.length + quarantineResults.length,
        quarantined,
        restored,
      };
    })().catch(() => {
      store.setState({ profileIntegrityStatus: "ready" } as unknown as Partial<CoreState>);
      return { checked: 0, quarantined: 0, restored: 0 };
    }).finally(() => {
      checksInFlight.delete(store as object);
    });

    checksInFlight.set(store as object, task);
    return task;
  }

  function importProfiles(incoming: Profile[]): void {
    const quarantine = getExtendedState().quarantinedProfiles;
    const accepted = incoming.filter((profile) => {
      const record = quarantine.find((candidate) =>
        candidate.profile.id === profile.id || profileCode(candidate.profile) === profileCode(profile));
      return !record || canReplaceQuarantinedProfile(record.profile, profile);
    });
    originalImportProfiles(accepted);
    void verifyImportedProfiles();
  }

  function restoreBackupProfiles(incoming: Profile[], ownerKeys: ProfileOwnerKey[]): unknown {
    const result = originalRestoreBackupProfiles(incoming, ownerKeys);
    void verifyImportedProfiles();
    return result;
  }

  store.setState({
    quarantinedProfiles: initialQuarantine,
    profileIntegrityStatus: "idle",
    verifyImportedProfiles,
    deleteQuarantinedProfile,
    importProfiles,
    restoreBackupProfiles,
  } as unknown as Partial<CoreState>);

  installedStores.add(store as object);
}
