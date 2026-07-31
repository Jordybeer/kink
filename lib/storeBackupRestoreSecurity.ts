import type { Profile, ProfileOwnerKey } from "@/types";
import { getProfileVerificationCode } from "@/lib/profileVerification";
import type { BackupRestoreResult } from "@/lib/storeSecurity";
import type { useStore as CoreUseStore } from "@/lib/storeCore";

type StoreHook = typeof CoreUseStore;
type StoreState = ReturnType<StoreHook["getState"]>;
type ProfileFreshness = "newer" | "same" | "older" | "conflict";

const installedStores = new WeakSet<object>();

function isSharedProfile(profile: Profile | undefined): boolean {
  return !!profile && (profile.origin === "shared" || profile.isImported === true);
}

function isOwnProfile(profile: Profile | undefined): boolean {
  return !!profile && !isSharedProfile(profile) && profile.origin === "own";
}

function sameTechnicalIdentity(existing: Profile, incoming: Profile): boolean {
  return existing.id === incoming.id
    && getProfileVerificationCode(existing) === getProfileVerificationCode(incoming);
}

function keyMatchesProfile(
  key: ProfileOwnerKey | undefined,
  profile: Profile | undefined,
): boolean {
  if (!key || !profile || key.profileId !== profile.id) return false;
  return !profile.consentProof || profile.consentProof.keyId === key.keyId;
}

function compareFreshness(incoming: Profile, existing: Profile): ProfileFreshness {
  const current = existing.consentProof;
  const next = incoming.consentProof;

  if (current || next) {
    if (!current && next) return "newer";
    if (current && !next) return "conflict";
    if (!current || !next || current.keyId !== next.keyId) return "conflict";
    if (next.version > current.version) return "newer";
    if (next.version < current.version) return "older";
    if (next.proofHash !== current.proofHash) return "conflict";
  }

  if (incoming.updatedAt > existing.updatedAt) return "newer";
  if (incoming.updatedAt < existing.updatedAt) return "older";
  return "same";
}

function preserveReceiverLocalFields(incoming: Profile, existing: Profile): Profile {
  return {
    ...incoming,
    ...(existing.privateNote !== undefined ? { privateNote: existing.privateNote } : {}),
    ...(existing.avatarDataUrl !== undefined ? { avatarDataUrl: existing.avatarDataUrl } : {}),
  };
}

function promoteExistingOwner(profile: Profile): Profile {
  const { lockedAt: _lockedAt, ...rest } = profile;
  return { ...rest, origin: "own", isImported: false };
}

function upsertOwnerKey(
  keys: ProfileOwnerKey[],
  incoming: ProfileOwnerKey,
): { keys: ProfileOwnerKey[]; added: boolean; updated: boolean; conflict: boolean } {
  const index = keys.findIndex((candidate) => candidate.profileId === incoming.profileId);
  if (index < 0) {
    return { keys: [incoming, ...keys], added: true, updated: false, conflict: false };
  }

  const existing = keys[index];
  if (existing.keyId !== incoming.keyId) {
    return { keys, added: false, updated: false, conflict: true };
  }
  if (incoming.version <= existing.version) {
    return { keys, added: false, updated: false, conflict: false };
  }

  const next = [...keys];
  next[index] = incoming;
  return { keys: next, added: false, updated: true, conflict: false };
}

/**
 * Installs the backup-specific ownership merge after the general mutation guards.
 * Content freshness and ownership restoration are deliberately separate: an older
 * backup may restore the matching private key without rolling newer profile data back.
 */
export function installBackupRestoreSecurity(store: StoreHook): void {
  if (installedStores.has(store as object)) return;

  function restoreBackupProfiles(
    incoming: Profile[],
    ownerKeys: ProfileOwnerKey[],
  ): BackupRestoreResult {
    const result: BackupRestoreResult = {
      added: 0,
      updated: 0,
      unchanged: 0,
      conflicts: 0,
      ownerKeysAdded: 0,
      ownerKeysUpdated: 0,
    };

    store.setState((state) => {
      const profiles = [...state.profiles];
      let keys = [...state.profileOwnerKeys];
      const incomingKeyByProfile = new Map(ownerKeys.map((key) => [key.profileId, key]));
      const acceptedKeyIds = new Set<string>();

      for (const incomingProfile of incoming) {
        const incomingShared = isSharedProfile(incomingProfile);
        const incomingOwn = isOwnProfile(incomingProfile);
        const incomingKey = incomingKeyByProfile.get(incomingProfile.id);
        const ownerKeyValid = incomingOwn
          && !!incomingKey
          && keyMatchesProfile(incomingKey, incomingProfile);
        const legacyOwner = incomingOwn && !incomingProfile.consentProof;

        if (incomingOwn && incomingProfile.consentProof && !ownerKeyValid) {
          result.conflicts += 1;
          continue;
        }
        if (!incomingShared && !incomingOwn) {
          result.conflicts += 1;
          continue;
        }

        const exactIndex = profiles.findIndex((profile) => profile.id === incomingProfile.id);
        const sameCodeIndex = profiles.findIndex(
          (profile) => getProfileVerificationCode(profile)
            === getProfileVerificationCode(incomingProfile),
        );

        if (exactIndex < 0) {
          if (sameCodeIndex >= 0) {
            result.conflicts += 1;
            continue;
          }
          profiles.push(incomingProfile);
          if (ownerKeyValid && incomingKey) acceptedKeyIds.add(incomingKey.profileId);
          result.added += 1;
          continue;
        }

        const existing = profiles[exactIndex];
        if (!sameTechnicalIdentity(existing, incomingProfile)) {
          result.conflicts += 1;
          continue;
        }

        const existingKey = keys.find((key) => key.profileId === existing.id);
        if (ownerKeyValid && incomingKey && existingKey && existingKey.keyId !== incomingKey.keyId) {
          result.conflicts += 1;
          continue;
        }

        if (incomingShared) {
          if (!isSharedProfile(existing)) {
            result.unchanged += 1;
            continue;
          }
          const freshness = compareFreshness(incomingProfile, existing);
          if (freshness === "conflict") {
            result.conflicts += 1;
          } else if (freshness === "newer") {
            profiles[exactIndex] = preserveReceiverLocalFields(incomingProfile, existing);
            result.updated += 1;
          } else {
            result.unchanged += 1;
          }
          continue;
        }

        if (legacyOwner && !incomingProfile.consentProof) {
          if (existing.consentProof) {
            if (!ownerKeyValid || !incomingKey || existing.consentProof.keyId !== incomingKey.keyId) {
              result.conflicts += 1;
              continue;
            }
            acceptedKeyIds.add(incomingKey.profileId);
            if (isSharedProfile(existing)) {
              profiles[exactIndex] = promoteExistingOwner(existing);
              result.updated += 1;
            } else {
              result.unchanged += 1;
            }
            continue;
          }

          const freshness = compareFreshness(incomingProfile, existing);
          if (freshness === "newer") {
            profiles[exactIndex] = incomingProfile;
            result.updated += 1;
          } else if (isSharedProfile(existing)) {
            profiles[exactIndex] = promoteExistingOwner(existing);
            result.updated += 1;
          } else {
            result.unchanged += 1;
          }
          if (ownerKeyValid && incomingKey) acceptedKeyIds.add(incomingKey.profileId);
          continue;
        }

        if (!ownerKeyValid || !incomingKey) {
          result.conflicts += 1;
          continue;
        }

        if (existing.consentProof && existing.consentProof.keyId !== incomingKey.keyId) {
          result.conflicts += 1;
          continue;
        }

        const freshness = compareFreshness(incomingProfile, existing);
        if (freshness === "conflict") {
          result.conflicts += 1;
          continue;
        }

        acceptedKeyIds.add(incomingKey.profileId);
        if (freshness === "newer") {
          profiles[exactIndex] = incomingProfile;
          result.updated += 1;
        } else if (isSharedProfile(existing)) {
          // Keep the same/newer imported content, but restore editability because
          // the backup proves possession of this exact source's private key.
          profiles[exactIndex] = promoteExistingOwner(existing);
          result.updated += 1;
        } else {
          result.unchanged += 1;
        }
      }

      for (const ownerKey of ownerKeys) {
        if (!acceptedKeyIds.has(ownerKey.profileId)) continue;
        const finalProfile = profiles.find((profile) => profile.id === ownerKey.profileId);
        if (!isOwnProfile(finalProfile) || !keyMatchesProfile(ownerKey, finalProfile)) continue;

        const merged = upsertOwnerKey(keys, ownerKey);
        if (merged.conflict) {
          result.conflicts += 1;
          continue;
        }
        keys = merged.keys;
        if (merged.added) result.ownerKeysAdded += 1;
        if (merged.updated) result.ownerKeysUpdated += 1;
      }

      return { profiles, profileOwnerKeys: keys };
    });

    return result;
  }

  store.setState({ restoreBackupProfiles } as unknown as Partial<StoreState>);
  installedStores.add(store as object);
}
