import type { Profile, ProfileOwnerKey, ProfileIdentityAnchor } from "@/types";
import {
  canonicalJson,
  createConsentLedgerEvent,
  createConsentSnapshot,
  generateProfileOwnerKey,
  projectSceneConsentAgreement,
  signProfileConsent,
  verifyProfileConsent,
} from "@/lib/consentProof";
import {
  classifyProfileImport,
  getProfileVerificationCode,
} from "@/lib/profileVerification";
import { isProfileIdentityAnchor } from "@/lib/profileIdentityTrust";
import type { useStore as CoreUseStore } from "@/lib/storeCore";

export const PROFILE_IDENTITY_ANCHOR_STORAGE_KEY = "kinksync-profile-identity-anchors";
export const PROFILE_IDENTITY_ANCHOR_STORAGE_SCHEMA = 1 as const;

export interface ProfileIdentityAnchorRegistry {
  schema: typeof PROFILE_IDENTITY_ANCHOR_STORAGE_SCHEMA;
  anchors: ProfileIdentityAnchor[];
}

type IdentityAnchorStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const EMPTY_PROFILE_IDENTITY_ANCHOR_REGISTRY: ProfileIdentityAnchorRegistry = {
  schema: PROFILE_IDENTITY_ANCHOR_STORAGE_SCHEMA,
  anchors: [],
};

export function sameProfileIdentityAnchor(
  left: ProfileIdentityAnchor,
  right: ProfileIdentityAnchor,
): boolean {
  return left.schema === right.schema
    && left.profileId === right.profileId
    && left.verificationCode === right.verificationCode
    && left.keyId === right.keyId
    && left.fingerprint === right.fingerprint
    && left.anchoredAt === right.anchoredAt
    && left.method === right.method;
}

function parseProfileIdentityAnchorRegistry(raw: unknown): ProfileIdentityAnchorRegistry | null {
  if (!raw || typeof raw !== "object") return null;
  const registry = raw as Record<string, unknown>;
  if (registry.schema !== PROFILE_IDENTITY_ANCHOR_STORAGE_SCHEMA || !Array.isArray(registry.anchors)) {
    return null;
  }

  const anchors: ProfileIdentityAnchor[] = [];
  const seenProfileIds = new Set<string>();
  for (const candidate of registry.anchors) {
    if (!isProfileIdentityAnchor(candidate) || seenProfileIds.has(candidate.profileId)) return null;
    seenProfileIds.add(candidate.profileId);
    anchors.push(candidate);
  }

  return { schema: PROFILE_IDENTITY_ANCHOR_STORAGE_SCHEMA, anchors };
}

function browserIdentityAnchorStorage(): IdentityAnchorStorage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function loadWritableProfileIdentityAnchorRegistry(
  storage: IdentityAnchorStorage | undefined,
): ProfileIdentityAnchorRegistry | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY);
    if (raw === null) return { ...EMPTY_PROFILE_IDENTITY_ANCHOR_REGISTRY, anchors: [] };
    return parseProfileIdentityAnchorRegistry(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function readProfileIdentityAnchorRegistry(
  storage: IdentityAnchorStorage | undefined = browserIdentityAnchorStorage(),
): ProfileIdentityAnchorRegistry {
  const registry = loadWritableProfileIdentityAnchorRegistry(storage);
  return registry ?? { ...EMPTY_PROFILE_IDENTITY_ANCHOR_REGISTRY, anchors: [] };
}

export function getPersistedProfileIdentityAnchor(
  profileId: string,
  storage: IdentityAnchorStorage | undefined = browserIdentityAnchorStorage(),
): ProfileIdentityAnchor | undefined {
  return readProfileIdentityAnchorRegistry(storage).anchors.find((anchor) => anchor.profileId === profileId);
}

export function persistProfileIdentityAnchor(
  anchor: ProfileIdentityAnchor,
  storage: IdentityAnchorStorage | undefined = browserIdentityAnchorStorage(),
): boolean {
  if (!isProfileIdentityAnchor(anchor)) return false;
  const registry = loadWritableProfileIdentityAnchorRegistry(storage);
  if (!registry || !storage) return false;

  const existing = registry.anchors.find((candidate) => candidate.profileId === anchor.profileId);
  if (existing) return sameProfileIdentityAnchor(existing, anchor);

  try {
    storage.setItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY, JSON.stringify({
      schema: PROFILE_IDENTITY_ANCHOR_STORAGE_SCHEMA,
      anchors: [...registry.anchors, anchor],
    } satisfies ProfileIdentityAnchorRegistry));
    return true;
  } catch {
    return false;
  }
}

export function removePersistedProfileIdentityAnchor(
  profileId: string,
  storage: IdentityAnchorStorage | undefined = browserIdentityAnchorStorage(),
): boolean {
  const registry = loadWritableProfileIdentityAnchorRegistry(storage);
  if (!registry || !storage) return false;
  const anchors = registry.anchors.filter((anchor) => anchor.profileId !== profileId);
  if (anchors.length === registry.anchors.length) return true;

  try {
    storage.setItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY, JSON.stringify({
      schema: PROFILE_IDENTITY_ANCHOR_STORAGE_SCHEMA,
      anchors,
    } satisfies ProfileIdentityAnchorRegistry));
    return true;
  } catch {
    return false;
  }
}

export function removePersistedProfileIdentityAnchorIfMatches(
  expected: ProfileIdentityAnchor,
  storage: IdentityAnchorStorage | undefined = browserIdentityAnchorStorage(),
): boolean {
  const registry = loadWritableProfileIdentityAnchorRegistry(storage);
  if (!registry || !storage) return false;
  const existing = registry.anchors.find((anchor) => anchor.profileId === expected.profileId);
  if (!existing) return true;
  if (!sameProfileIdentityAnchor(existing, expected)) return false;

  try {
    storage.setItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY, JSON.stringify({
      schema: PROFILE_IDENTITY_ANCHOR_STORAGE_SCHEMA,
      anchors: registry.anchors.filter((anchor) => anchor.profileId !== expected.profileId),
    } satisfies ProfileIdentityAnchorRegistry));
    return true;
  } catch {
    return false;
  }
}

export interface BackupRestoreResult {
  added: number;
  updated: number;
  unchanged: number;
  conflicts: number;
  ownerKeysAdded: number;
  ownerKeysUpdated: number;
}

type StoreHook = typeof CoreUseStore;
type StoreState = ReturnType<StoreHook["getState"]>;
type ConsentActionResult = { ok: boolean; message: string };

type ProfileFreshness = "newer" | "same" | "older" | "conflict";

const installedStores = new WeakSet<object>();
const sealsInFlight = new Map<string, Promise<Profile | null>>();
const sceneLocksInFlight = new Map<string, Promise<ConsentActionResult>>();
const sceneAppendQueues = new Map<string, Promise<ConsentActionResult>>();

function isSharedProfile(profile: Profile | undefined): boolean {
  return !!profile && (profile.origin === "shared" || profile.isImported === true);
}

function isOwnedProfile(profile: Profile | undefined): boolean {
  return !!profile && !isSharedProfile(profile) && profile.origin === "own";
}

function sameTechnicalIdentity(existing: Profile, incoming: Profile): boolean {
  return existing.id === incoming.id
    && getProfileVerificationCode(existing) === getProfileVerificationCode(incoming);
}

function compareBackupFreshness(incoming: Profile, existing: Profile): ProfileFreshness {
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

function preserveLocalMetadata(incoming: Profile, existing: Profile): Profile {
  return {
    ...incoming,
    ...(existing.privateNote !== undefined ? { privateNote: existing.privateNote } : {}),
    ...(existing.avatarDataUrl !== undefined ? { avatarDataUrl: existing.avatarDataUrl } : {}),
  };
}

export interface SafeProfileImportPlan {
  profiles: Profile[];
  acceptedCount: number;
  rejectedProfileIds: string[];
}

export function planSafeProfileImport(
  existingProfiles: readonly Profile[],
  incoming: readonly Profile[],
  now = Date.now(),
): SafeProfileImportPlan {
  const profiles = [...existingProfiles];
  let acceptedCount = 0;
  const rejectedProfileIds: string[] = [];

  for (const raw of incoming) {
    const profile = {
      ...raw,
      verificationCode: getProfileVerificationCode(raw),
      origin: "shared" as const,
      isImported: true,
      lockedAt: raw.lockedAt ?? now,
    };
    const exactId = profiles.find((candidate) => candidate.id === profile.id);
    if (exactId && getProfileVerificationCode(exactId) !== getProfileVerificationCode(profile)) {
      rejectedProfileIds.push(profile.id);
      continue;
    }

    const identity = classifyProfileImport(profiles, profile);
    if (identity.kind === "new") {
      profiles.push(profile);
      acceptedCount += 1;
      continue;
    }

    if (identity.kind !== "signed-update" || identity.profile.id !== profile.id) {
      rejectedProfileIds.push(profile.id);
      continue;
    }
    const index = profiles.findIndex((candidate) => candidate.id === identity.profile.id);
    if (index < 0) {
      rejectedProfileIds.push(profile.id);
      continue;
    }
    profiles[index] = preserveLocalMetadata({
      ...profile,
      lockedAt: identity.profile.lockedAt ?? now,
    }, identity.profile);
    acceptedCount += 1;
  }

  return { profiles, acceptedCount, rejectedProfileIds };
}

function upsertOwnerKey(
  keys: ProfileOwnerKey[],
  incoming: ProfileOwnerKey,
): { keys: ProfileOwnerKey[]; added: boolean; updated: boolean } {
  const index = keys.findIndex((candidate) => candidate.profileId === incoming.profileId);
  if (index < 0) {
    return { keys: [incoming, ...keys], added: true, updated: false };
  }

  const existing = keys[index];
  if (existing.keyId !== incoming.keyId || incoming.version <= existing.version) {
    return { keys, added: false, updated: false };
  }

  const next = [...keys];
  next[index] = incoming;
  return { keys: next, added: false, updated: true };
}

export function installStoreSecurity(store: StoreHook): void {
  if (installedStores.has(store as object)) return;

  const original = store.getState();
  const baseActions = {
    renameProfile: original.renameProfile,
    setBdsmtestScores: original.setBdsmtestScores,
    setEntry: original.setEntry,
    resetEntry: original.resetEntry,
    addCustomKink: original.addCustomKink,
    removeCustomKink: original.removeCustomKink,
    saveScene: original.saveScene,
  };

  const editable = (profileId: string) => {
    const profile = store.getState().profiles.find((candidate) => candidate.id === profileId);
    return !!profile && !isSharedProfile(profile);
  };

  function safeImportProfiles(incoming: Profile[]): void {
    store.setState((state) => ({
      profiles: planSafeProfileImport(state.profiles, incoming).profiles,
    }));
  }

  function safeRestoreBackupProfiles(
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
      const keyByProfileId = new Map(ownerKeys.map((key) => [key.profileId, key]));
      const acceptedOwnedIds = new Set<string>();

      for (const profile of incoming) {
        const incomingKey = keyByProfileId.get(profile.id);
        const incomingOwned = isOwnedProfile(profile) && !!incomingKey;
        const exactIndex = profiles.findIndex((candidate) => candidate.id === profile.id);
        const sameCodeIndex = profiles.findIndex(
          (candidate) => getProfileVerificationCode(candidate) === getProfileVerificationCode(profile),
        );

        if (exactIndex < 0) {
          if (sameCodeIndex >= 0) {
            result.conflicts += 1;
            continue;
          }
          profiles.push(profile);
          if (incomingOwned) acceptedOwnedIds.add(profile.id);
          result.added += 1;
          continue;
        }

        const existing = profiles[exactIndex];
        if (!sameTechnicalIdentity(existing, profile)) {
          result.conflicts += 1;
          continue;
        }

        const existingKey = state.profileOwnerKeys.find((key) => key.profileId === existing.id);
        if (incomingOwned && existingKey && incomingKey && existingKey.keyId !== incomingKey.keyId) {
          result.conflicts += 1;
          continue;
        }

        if (!incomingOwned && !isSharedProfile(profile)) {
          result.conflicts += 1;
          continue;
        }

        if (isSharedProfile(profile) && !isSharedProfile(existing)) {
          result.unchanged += 1;
          continue;
        }

        const freshness = compareBackupFreshness(profile, existing);
        if (freshness === "conflict") {
          result.conflicts += 1;
          continue;
        }

        if (incomingOwned) acceptedOwnedIds.add(profile.id);

        if (freshness === "newer") {
          profiles[exactIndex] = isSharedProfile(profile)
            ? preserveLocalMetadata(profile, existing)
            : profile;
          result.updated += 1;
        } else {
          result.unchanged += 1;
        }
      }

      let keys = [...state.profileOwnerKeys];
      for (const key of ownerKeys) {
        if (!acceptedOwnedIds.has(key.profileId)) continue;
        const finalProfile = profiles.find((profile) => profile.id === key.profileId);
        if (!isOwnedProfile(finalProfile)) continue;
        if (finalProfile?.consentProof && finalProfile.consentProof.keyId !== key.keyId) continue;

        const merged = upsertOwnerKey(keys, key);
        keys = merged.keys;
        if (merged.added) result.ownerKeysAdded += 1;
        if (merged.updated) result.ownerKeysUpdated += 1;
      }

      return { profiles, profileOwnerKeys: keys };
    });

    return result;
  }

  function safeSealProfileConsent(profileId: string): Promise<Profile | null> {
    const running = sealsInFlight.get(profileId);
    if (running) return running;

    const task = (async () => {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const profile = store.getState().profiles.find((candidate) => candidate.id === profileId);
        if (!profile || isSharedProfile(profile)) return null;

        let ownerKey = store.getState().profileOwnerKeys.find((key) => key.profileId === profileId);
        if (profile.consentProof) {
          if (!ownerKey || ownerKey.keyId !== profile.consentProof.keyId) return null;
          const verification = await verifyProfileConsent(profile);
          if (verification.status === "valid") return profile;
        }

        ownerKey = ownerKey ?? await generateProfileOwnerKey(profileId);
        const signed = await signProfileConsent(profile, ownerKey);
        let committed = false;

        store.setState((state) => {
          const candidate = state.profiles.find((item) => item.id === profileId);
          const mergedKey = upsertOwnerKey(state.profileOwnerKeys, signed.ownerKey).keys;
          if (candidate !== profile || isSharedProfile(candidate)) {
            return { profileOwnerKeys: mergedKey };
          }

          committed = true;
          return {
            profiles: state.profiles.map((item) =>
              item === profile ? { ...item, consentProof: signed.proof } : item),
            profileOwnerKeys: mergedKey,
          };
        });

        if (committed) {
          return store.getState().profiles.find((candidate) => candidate.id === profileId) ?? null;
        }
      }
      return null;
    })().finally(() => sealsInFlight.delete(profileId));

    sealsInFlight.set(profileId, task);
    return task;
  }

  function safeLockSceneConsent(sceneId: string): Promise<ConsentActionResult> {
    const running = sceneLocksInFlight.get(sceneId);
    if (running) return running;

    const task = (async () => {
      const initialScene = store.getState().scenes.find((candidate) => candidate.id === sceneId);
      if (!initialScene) return { ok: false, message: "Scène niet gevonden." };
      if (initialScene.consentSnapshots) {
        return { ok: true, message: "✓ Deze afspraken waren al vastgezet." };
      }

      for (const profileId of [initialScene.profileAId, initialScene.profileBId]) {
        const profile = store.getState().profiles.find((candidate) => candidate.id === profileId);
        if (!profile) return { ok: false, message: "Een profiel ontbreekt." };
        if (isSharedProfile(profile)) {
          const verification = await verifyProfileConsent(profile);
          if (verification.status !== "valid") {
            return {
              ok: false,
              message: `${profile.name} heeft geen geldige bronbevestiging. Laat het profiel opnieuw delen vanaf het eigen toestel.`,
            };
          }
        } else if (!await safeSealProfileConsent(profileId)) {
          return { ok: false, message: `${profile.name} kon niet worden bevestigd.` };
        }
      }

      const stateAfterSeal = store.getState();
      const profileA = stateAfterSeal.profiles.find((profile) => profile.id === initialScene.profileAId);
      const profileB = stateAfterSeal.profiles.find((profile) => profile.id === initialScene.profileBId);
      if (!profileA || !profileB) return { ok: false, message: "Een profiel ontbreekt." };

      const [snapshotA, snapshotB] = await Promise.all([
        createConsentSnapshot(profileA),
        createConsentSnapshot(profileB),
      ]);
      if (!snapshotA || !snapshotB) {
        return { ok: false, message: "De bron van één profiel kon niet worden bevestigd." };
      }

      const currentScene = store.getState().scenes.find((candidate) => candidate.id === sceneId);
      if (!currentScene || currentScene !== initialScene || currentScene.consentSnapshots) {
        return { ok: false, message: "De scène werd ondertussen gewijzigd of al vastgezet." };
      }

      const snapshots = { profileA: snapshotA, profileB: snapshotB };
      const agreement = projectSceneConsentAgreement(currentScene, snapshots);
      const keys = store.getState().profileOwnerKeys;
      const ownerKeyA = keys.find((key) =>
        key.profileId === profileA.id && key.keyId === snapshotA.proof.keyId);
      const ownerKeyB = keys.find((key) =>
        key.profileId === profileB.id && key.keyId === snapshotB.proof.keyId);
      const signerKey = ownerKeyA ?? ownerKeyB;
      const signerProfile = ownerKeyA ? profileA : ownerKeyB ? profileB : undefined;
      if (!signerKey || !signerProfile) {
        return { ok: false, message: "Minstens één deelnemer moet dit op het eigen toestel vastzetten." };
      }

      const lockedAt = Date.now();
      const event = await createConsentLedgerEvent({
        id: crypto.randomUUID(),
        sceneId,
        type: "locked",
        profileId: signerProfile.id,
        profileName: signerProfile.name,
        createdAt: lockedAt,
        agreement,
        note: "De profielversies en scène-afspraken bij de start zijn vastgezet.",
      }, signerKey);

      let committed = false;
      store.setState((state) => ({
        scenes: state.scenes.map((candidate) => {
          if (candidate !== currentScene || candidate.consentSnapshots) return candidate;
          if (canonicalJson(projectSceneConsentAgreement(candidate, snapshots)) !== canonicalJson(agreement)) {
            return candidate;
          }
          committed = true;
          return {
            ...candidate,
            consentLockedAt: lockedAt,
            consentSnapshots: snapshots,
            consentAgreement: agreement,
            consentLedger: [event],
            updatedAt: Date.now(),
          };
        }),
      }));

      return committed
        ? { ok: true, message: `✓ Afspraken vastgezet door ${signerProfile.name}.` }
        : { ok: false, message: "De scène veranderde tijdens het vastzetten. Controleer en probeer opnieuw." };
    })().finally(() => sceneLocksInFlight.delete(sceneId));

    sceneLocksInFlight.set(sceneId, task);
    return task;
  }

  async function performSceneConsentAppend(
    sceneId: string,
    profileId: string,
    type: "changed" | "withdrawn",
    note?: string,
  ): Promise<ConsentActionResult> {
    const scene = store.getState().scenes.find((candidate) => candidate.id === sceneId);
    if (!scene?.consentSnapshots) {
      return { ok: false, message: "Zet eerst de oorspronkelijke afspraken vast." };
    }
    if (profileId !== scene.profileAId && profileId !== scene.profileBId) {
      return { ok: false, message: "Dit profiel hoort niet bij de scène." };
    }

    const profile = store.getState().profiles.find((candidate) => candidate.id === profileId);
    if (!profile) return { ok: false, message: "Profiel niet gevonden." };
    if (isSharedProfile(profile)) {
      return { ok: false, message: `Alleen ${profile.name} kan deze wijziging op het eigen toestel bevestigen.` };
    }

    const sealed = await safeSealProfileConsent(profileId);
    if (!sealed) return { ok: false, message: "De wijziging kon niet worden bevestigd." };

    const participantSnapshot = scene.consentSnapshots.profileA.profileId === profileId
      ? scene.consentSnapshots.profileA
      : scene.consentSnapshots.profileB;
    const ownerKey = store.getState().profileOwnerKeys.find((key) =>
      key.profileId === profileId && key.keyId === participantSnapshot.proof.keyId);
    if (!ownerKey) return { ok: false, message: "De passende eigendomssleutel ontbreekt." };

    const snapshot = type === "changed" ? await createConsentSnapshot(sealed) : undefined;
    if (type === "changed" && !snapshot) {
      return { ok: false, message: "De nieuwe profielversie kon niet worden vastgelegd." };
    }

    const latestScene = store.getState().scenes.find((candidate) => candidate.id === sceneId);
    if (!latestScene?.consentSnapshots) {
      return { ok: false, message: "De vastgezette scène ontbreekt." };
    }
    const expectedTail = latestScene.consentLedger?.at(-1)?.eventHash;
    const event = await createConsentLedgerEvent({
      id: crypto.randomUUID(),
      sceneId,
      type,
      profileId,
      profileName: sealed.name,
      createdAt: Date.now(),
      ...(note ? { note } : {}),
      ...(snapshot ? { snapshot } : {}),
      ...(expectedTail ? { previousEventHash: expectedTail } : {}),
    }, ownerKey);

    let committed = false;
    store.setState((state) => ({
      scenes: state.scenes.map((candidate) => {
        if (candidate !== latestScene) return candidate;
        const actualTail = candidate.consentLedger?.at(-1)?.eventHash;
        if (actualTail !== expectedTail) return candidate;
        committed = true;
        return {
          ...candidate,
          consentLedger: [...(candidate.consentLedger ?? []), event],
          updatedAt: Date.now(),
        };
      }),
    }));

    if (!committed) {
      return { ok: false, message: "Er werd tegelijk een andere wijziging toegevoegd. Controleer het log en probeer opnieuw." };
    }
    return type === "withdrawn"
      ? { ok: true, message: "✓ Intrekking toegevoegd; eerdere afspraken bleven ongewijzigd." }
      : { ok: true, message: "✓ Nieuwe toestemmingsversie toegevoegd." };
  }

  function safeAppendSceneConsentEvent(
    sceneId: string,
    profileId: string,
    type: "changed" | "withdrawn",
    note?: string,
  ): Promise<ConsentActionResult> {
    const previous = sceneAppendQueues.get(sceneId) ?? Promise.resolve({ ok: true, message: "" });
    const task = previous
      .catch(() => ({ ok: false, message: "De vorige wijziging kon niet worden verwerkt." }))
      .then(() => performSceneConsentAppend(sceneId, profileId, type, note))
      .finally(() => {
        if (sceneAppendQueues.get(sceneId) === task) sceneAppendQueues.delete(sceneId);
      });
    sceneAppendQueues.set(sceneId, task);
    return task;
  }

  const guardedRename: StoreState["renameProfile"] = (...args) => {
    if (editable(args[0])) baseActions.renameProfile(...args);
  };

  store.setState({
    renameProfile: guardedRename,
    setBdsmtestScores: (...args) => {
      if (editable(args[0])) baseActions.setBdsmtestScores(...args);
    },
    setEntry: (...args) => {
      if (editable(args[0])) baseActions.setEntry(...args);
    },
    resetEntry: (...args) => {
      if (editable(args[0])) baseActions.resetEntry(...args);
    },
    addCustomKink: (...args) => {
      if (editable(args[0])) baseActions.addCustomKink(...args);
    },
    removeCustomKink: (...args) => {
      if (editable(args[0])) baseActions.removeCustomKink(...args);
    },
    saveScene: (record) => {
      const existing = record.id
        ? store.getState().scenes.find((scene) => scene.id === record.id)
        : undefined;
      if (existing?.consentLockedAt || existing?.consentSnapshots || existing?.consentAgreement) {
        return existing.id;
      }
      return baseActions.saveScene(record);
    },
    importProfiles: safeImportProfiles,
    restoreBackupProfiles: safeRestoreBackupProfiles,
    sealProfileConsent: safeSealProfileConsent,
    lockSceneConsent: safeLockSceneConsent,
    appendSceneConsentEvent: safeAppendSceneConsentEvent,
  });

  installedStores.add(store as object);
}
