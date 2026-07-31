"use client";

import { useEffect } from "react";
import type { Profile, ProfileOwnerKey } from "@/types";
import {
  canonicalJson,
  createConsentLedgerEvent,
  createConsentSnapshot,
  generateProfileOwnerKey,
  hashProfileConsent,
  projectSceneConsentAgreement,
  signProfileConsent,
  verifyProfileConsent,
} from "@/lib/consentProof";
import { getProfileVerificationCode } from "@/lib/profileVerification";
import { useStore } from "@/lib/store";

function isSharedProfile(profile: Profile | undefined): boolean {
  return !!profile && (profile.origin === "shared" || profile.isImported === true);
}

function proofVersion(profile: Profile): number {
  return profile.consentProof?.version ?? 0;
}

function incomingProfileIsNewer(incoming: Profile, existing: Profile): boolean {
  const incomingProof = incoming.consentProof;
  const existingProof = existing.consentProof;
  if (incomingProof && existingProof && incomingProof.keyId === existingProof.keyId) {
    if (incomingProof.version !== existingProof.version) {
      return incomingProof.version > existingProof.version;
    }
  }
  return incoming.updatedAt > existing.updatedAt;
}

function newerOwnerKey(incoming: ProfileOwnerKey, existing: ProfileOwnerKey | undefined): boolean {
  if (!existing) return true;
  if (incoming.keyId !== existing.keyId) return false;
  return incoming.version >= existing.version;
}

type StoreState = ReturnType<typeof useStore.getState>;
type ConsentActionResult = { ok: boolean; message: string };

let installedAgainst: StoreState["renameProfile"] | null = null;
let baseActions: Pick<StoreState,
  | "renameProfile"
  | "setBdsmtestScores"
  | "setEntry"
  | "resetEntry"
  | "addCustomKink"
  | "removeCustomKink"
  | "saveScene"
> | null = null;

const sealsInFlight = new Map<string, Promise<Profile | null>>();
const sceneLocksInFlight = new Map<string, Promise<ConsentActionResult>>();
const sceneAppendsInFlight = new Map<string, Promise<ConsentActionResult>>();

function safeSealProfileConsent(profileId: string): Promise<Profile | null> {
  const running = sealsInFlight.get(profileId);
  if (running) return running;

  const task = (async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const profile = useStore.getState().profiles.find((candidate) => candidate.id === profileId);
      if (!profile || isSharedProfile(profile)) return null;

      let ownerKey = useStore.getState().profileOwnerKeys.find((key) => key.profileId === profileId);
      if (ownerKey && profile.consentProof?.keyId === ownerKey.keyId) {
        const verification = await verifyProfileConsent(profile);
        if (verification.status === "valid") return profile;
      }

      ownerKey = ownerKey ?? await generateProfileOwnerKey(profileId);
      const signed = await signProfileConsent(profile, ownerKey);
      const latest = useStore.getState().profiles.find((candidate) => candidate.id === profileId);
      if (!latest || isSharedProfile(latest)) return null;

      if (await hashProfileConsent(latest) !== signed.proof.payloadHash) {
        // An edit landed while Web Crypto was working. Sign the newest data;
        // never write the stale profile snapshot back over that edit.
        useStore.setState((state) => ({
          profileOwnerKeys: [
            signed.ownerKey,
            ...state.profileOwnerKeys.filter((key) => key.profileId !== profileId),
          ],
        }));
        continue;
      }

      useStore.setState((state) => ({
        profiles: state.profiles.map((candidate) =>
          candidate.id === profileId && !isSharedProfile(candidate)
            ? { ...candidate, consentProof: signed.proof }
            : candidate),
        profileOwnerKeys: [
          signed.ownerKey,
          ...state.profileOwnerKeys.filter((key) => key.profileId !== profileId),
        ],
      }));
      return useStore.getState().profiles.find((candidate) => candidate.id === profileId) ?? null;
    }
    return null;
  })().finally(() => sealsInFlight.delete(profileId));

  sealsInFlight.set(profileId, task);
  return task;
}

function safeRestoreBackupProfiles(incoming: Profile[], ownerKeys: ProfileOwnerKey[]): void {
  useStore.setState((state) => {
    const profiles = [...state.profiles];
    const ownedIds = new Set(ownerKeys.map((key) => key.profileId));

    for (const profile of incoming) {
      const code = getProfileVerificationCode(profile);
      const index = profiles.findIndex((candidate) =>
        candidate.id === profile.id || getProfileVerificationCode(candidate) === code);
      if (index < 0) {
        profiles.push(profile);
        continue;
      }

      const existing = profiles[index];
      const incomingOwned = profile.origin === "own" && ownedIds.has(profile.id);
      const existingShared = isSharedProfile(existing);
      const incomingShared = isSharedProfile(profile);

      if (incomingOwned && (existingShared || incomingProfileIsNewer(profile, existing))) {
        profiles[index] = profile;
      } else if (incomingShared && existingShared && incomingProfileIsNewer(profile, existing)) {
        profiles[index] = { ...profile, id: existing.id };
      }
    }

    const keys = [...state.profileOwnerKeys];
    for (const key of ownerKeys) {
      const index = keys.findIndex((candidate) => candidate.profileId === key.profileId);
      if (index < 0) keys.push(key);
      else if (newerOwnerKey(key, keys[index])) keys[index] = key;
    }

    return { profiles, profileOwnerKeys: keys };
  });
}

function safeLockSceneConsent(sceneId: string): Promise<ConsentActionResult> {
  const running = sceneLocksInFlight.get(sceneId);
  if (running) return running;

  const task = (async () => {
    const initialScene = useStore.getState().scenes.find((candidate) => candidate.id === sceneId);
    if (!initialScene) return { ok: false, message: "Scène niet gevonden." };
    if (initialScene.consentSnapshots) return { ok: true, message: "✓ Deze afspraken waren al vastgezet." };

    const ids = [initialScene.profileAId, initialScene.profileBId];
    for (const profileId of ids) {
      const profile = useStore.getState().profiles.find((candidate) => candidate.id === profileId);
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

    const stateAfterSeal = useStore.getState();
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

    const currentScene = useStore.getState().scenes.find((candidate) => candidate.id === sceneId);
    if (!currentScene || currentScene.consentSnapshots) {
      return { ok: false, message: "De scène werd ondertussen gewijzigd of al vastgezet." };
    }

    const snapshots = { profileA: snapshotA, profileB: snapshotB };
    const agreement = projectSceneConsentAgreement(currentScene, snapshots);
    const ownerKeyA = useStore.getState().profileOwnerKeys.find((key) => key.profileId === profileA.id);
    const ownerKeyB = useStore.getState().profileOwnerKeys.find((key) => key.profileId === profileB.id);
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
    useStore.setState((state) => ({
      scenes: state.scenes.map((candidate) => {
        if (candidate.id !== sceneId || candidate.consentSnapshots) return candidate;
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

function safeAppendSceneConsentEvent(
  sceneId: string,
  profileId: string,
  type: "changed" | "withdrawn",
  note?: string,
): Promise<ConsentActionResult> {
  const running = sceneAppendsInFlight.get(sceneId);
  if (running) return running;

  const task = (async () => {
    const scene = useStore.getState().scenes.find((candidate) => candidate.id === sceneId);
    if (!scene?.consentSnapshots) {
      return { ok: false, message: "Zet eerst de oorspronkelijke afspraken vast." };
    }
    if (profileId !== scene.profileAId && profileId !== scene.profileBId) {
      return { ok: false, message: "Dit profiel hoort niet bij de scène." };
    }

    const profile = useStore.getState().profiles.find((candidate) => candidate.id === profileId);
    if (!profile) return { ok: false, message: "Profiel niet gevonden." };
    if (isSharedProfile(profile)) {
      return { ok: false, message: `Alleen ${profile.name} kan deze wijziging op het eigen toestel bevestigen.` };
    }

    const sealed = await safeSealProfileConsent(profileId);
    if (!sealed) return { ok: false, message: "De wijziging kon niet worden bevestigd." };
    const ownerKey = useStore.getState().profileOwnerKeys.find((key) => key.profileId === profileId);
    if (!ownerKey) return { ok: false, message: "De eigendomssleutel ontbreekt." };

    const snapshot = type === "changed" ? await createConsentSnapshot(sealed) : undefined;
    if (type === "changed" && !snapshot) {
      return { ok: false, message: "De nieuwe profielversie kon niet worden vastgelegd." };
    }

    const latestScene = useStore.getState().scenes.find((candidate) => candidate.id === sceneId);
    if (!latestScene?.consentSnapshots) {
      return { ok: false, message: "De vastgezette scène ontbreekt." };
    }
    const expectedTail = latestScene.consentLedger?.at(-1)?.eventHash;
    const event = await createConsentLedgerEvent({
      id: crypto.randomUUID(),
      sceneId,
      type,
      profileId,
      profileName: profile.name,
      createdAt: Date.now(),
      ...(note ? { note } : {}),
      ...(snapshot ? { snapshot } : {}),
      ...(expectedTail ? { previousEventHash: expectedTail } : {}),
    }, ownerKey);

    let committed = false;
    useStore.setState((state) => ({
      scenes: state.scenes.map((candidate) => {
        if (candidate.id !== sceneId) return candidate;
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
  })().finally(() => sceneAppendsInFlight.delete(sceneId));

  sceneAppendsInFlight.set(sceneId, task);
  return task;
}

/**
 * Wraps persisted store actions so imported consent and locked agreements
 * cannot be silently rewritten by another component. The cryptographic proof
 * remains the source of truth; these guards enforce the same rules at runtime.
 */
export function installStoreSecurityGuards(): void {
  const current = useStore.getState();
  if (installedAgainst === current.renameProfile) return;

  baseActions ??= {
    renameProfile: current.renameProfile,
    setBdsmtestScores: current.setBdsmtestScores,
    setEntry: current.setEntry,
    resetEntry: current.resetEntry,
    addCustomKink: current.addCustomKink,
    removeCustomKink: current.removeCustomKink,
    saveScene: current.saveScene,
  };
  const originals = baseActions;

  const editable = (profileId: string) => {
    const profile = useStore.getState().profiles.find((candidate) => candidate.id === profileId);
    return !!profile && !isSharedProfile(profile);
  };

  const guardedRename: StoreState["renameProfile"] = (...args) => {
    if (editable(args[0])) originals.renameProfile(...args);
  };

  useStore.setState({
    renameProfile: guardedRename,
    setBdsmtestScores: (...args) => {
      if (editable(args[0])) originals.setBdsmtestScores(...args);
    },
    setEntry: (...args) => {
      if (editable(args[0])) originals.setEntry(...args);
    },
    resetEntry: (...args) => {
      if (editable(args[0])) originals.resetEntry(...args);
    },
    addCustomKink: (...args) => {
      if (editable(args[0])) originals.addCustomKink(...args);
    },
    removeCustomKink: (...args) => {
      if (editable(args[0])) originals.removeCustomKink(...args);
    },
    saveScene: (record) => {
      const existing = record.id
        ? useStore.getState().scenes.find((scene) => scene.id === record.id)
        : undefined;
      if (existing?.consentLockedAt || existing?.consentSnapshots) return existing.id;
      return originals.saveScene(record);
    },
    restoreBackupProfiles: safeRestoreBackupProfiles,
    sealProfileConsent: safeSealProfileConsent,
    lockSceneConsent: safeLockSceneConsent,
    appendSceneConsentEvent: safeAppendSceneConsentEvent,
  });

  installedAgainst = guardedRename;
}

if (typeof window !== "undefined") installStoreSecurityGuards();

export default function StoreSecurityGuards() {
  useEffect(() => {
    installStoreSecurityGuards();
  }, []);
  return null;
}
