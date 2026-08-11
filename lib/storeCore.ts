import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useState, useEffect } from "react";
import type { Profile, KinkEntry, ExperienceLevel, CustomKink, ContractSnapshot, ProfileSnapshot, SceneRecord, AftercareEntry, ProfileOwnerKey, ConsentLedgerEventType } from "@/types";
import { deriveCounts } from "@/lib/profileSnapshot";
import { defaultQuestionnaireSetup, normalizeStoredQuestionnaireProfiles } from "@/lib/questionnaireSetup";
import { partnerDirectionalKinkId, stripDeprecatedDirectionalEntries, stripDeprecatedDirectionalProfile } from "@/lib/directionality";
import { generateProfileVerificationCode, getProfileVerificationCode } from "@/lib/profileVerification";
import {
  createConsentLedgerEvent,
  createConsentSnapshot,
  generateProfileOwnerKey,
  hashProfileConsent,
  projectSceneConsentAgreement,
  signProfileConsent,
  verifyProfileConsent,
} from "@/lib/consentProof";

const SNAPSHOT_CAP_PER_PROFILE = 30;

function uid() {
  return crypto.randomUUID();
}

type Theme = "midnight" | "red" | "forest" | "mono" | "ledger";

interface State {
  profiles: Profile[];
  contracts: ContractSnapshot[];
  profileSnapshots: ProfileSnapshot[];
  scenes: SceneRecord[];
  profileOwnerKeys: ProfileOwnerKey[];
  onboardingComplete: boolean;
  profileTourComplete: boolean;
  installPromptDismissed: boolean;
  notificationPermissionAsked: boolean;
  setNotificationPermissionAsked: () => void;
  theme: Theme;
  pinnedProfileId: string | null;
  pinProfile: (id: string) => void;
  unpinProfile: () => void;
  createProfile: (name: string, role: string, experienceLevel?: ExperienceLevel, relationshipStatus?: string) => string;
  deleteProfile: (id: string) => void;
  renameProfile: (id: string, name: string, role: string, experienceLevel: ExperienceLevel, relationshipStatus?: string, fetLifeUsername?: string, bdsmtestUrl?: string) => void;
  updatePrivateNote: (id: string, note: string) => void;
  setBdsmtestScores: (id: string, scores: import("@/types").BdsmtestScore[]) => void;
  setProfileAvatar: (id: string, avatarDataUrl: string | undefined) => void;
  setEntry: (profileId: string, kinkId: string, patch: Partial<KinkEntry>) => void;
  resetEntry: (profileId: string, kinkId: string) => void;
  getEntry: (profileId: string, kinkId: string) => KinkEntry;
  addCustomKink: (profileId: string, name: string) => void;
  removeCustomKink: (profileId: string, kinkId: string) => void;
  saveContract: (snapshot: Omit<ContractSnapshot, "id">) => void;
  restoreContracts: (snapshots: ContractSnapshot[]) => void;
  deleteContract: (id: string) => void;
  saveProfileSnapshot: (profileId: string) => ProfileSnapshot | null;
  deleteProfileSnapshot: (id: string) => void;
  saveScene: (record: Omit<SceneRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) => string;
  deleteScene: (id: string) => void;
  completeScene: (id: string, aftercare: AftercareEntry) => void;
  updateAftercare: (id: string, aftercare: AftercareEntry) => void;
  completeOnboarding: () => void;
  completeProfileTour: () => void;
  resetProfileTour: () => void;
  importProfiles: (incoming: Profile[]) => void;
  restoreBackupProfiles: (incoming: Profile[], ownerKeys: ProfileOwnerKey[]) => void;
  sealProfileConsent: (profileId: string) => Promise<Profile | null>;
  lockSceneConsent: (sceneId: string) => Promise<{ ok: boolean; message: string }>;
  appendSceneConsentEvent: (sceneId: string, profileId: string, type: Exclude<ConsentLedgerEventType, "locked">, note?: string) => Promise<{ ok: boolean; message: string }>;
  dismissInstallPrompt: () => void;
  setTheme: (t: Theme) => void;
  appLockEnabled: boolean;
  appLockPin: string | null;
  biometricEnabled: boolean;
  biometricCredentialId: string | null;
  setAppLockPin: (hash: string) => void;
  clearAppLockPin: () => void;
  enableBiometric: (credentialId: string) => void;
  disableBiometric: () => void;
}

const EMPTY_ENTRY: KinkEntry = { status: null, comment: "" };

// One auto-moment per profile per day, and only when something actually
// changed — Verloop feeds itself without the owner performing rituals,
// and the 30-cap becomes a rolling month instead of a burst of noise.
const AUTO_SNAPSHOT_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const STORE_PERSIST_VERSION = 22;

export function migrateStoredDirectionalityV22<T extends {
  profiles?: Profile[];
  profileSnapshots?: ProfileSnapshot[];
}>(
  state: T,
  version: number,
): T {
  if (version >= STORE_PERSIST_VERSION) return state;

  if (state.profiles) {
    // Preserve the previous proof as a cryptographic chain anchor. Because the
    // projected entries changed, verifyProfileConsent will reject it until the
    // source profile is re-sealed/re-shared; keeping the proof hash lets that
    // next proof link to the same identity instead of weakening continuity.
    state.profiles = state.profiles.map(stripDeprecatedDirectionalProfile);
  }

  if (state.profileSnapshots) {
    state.profileSnapshots = state.profileSnapshots.map((snapshot) => {
      const entries = stripDeprecatedDirectionalEntries(snapshot.entries);
      return entries === snapshot.entries
        ? snapshot
        : { ...snapshot, entries, counts: deriveCounts(entries) };
    });
  }

  return state;
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      function maybeAutoSnapshot(profileId: string) {
        const s = get();
        const profile = s.profiles.find((p) => p.id === profileId);
        if (!profile) return;
        const newest = s.profileSnapshots.find((snap) => snap.profileId === profileId);
        if (newest) {
          // Cheap gate first: a fresh moment (manual or auto) holds the door 24h.
          if (Date.now() - newest.date < AUTO_SNAPSHOT_MIN_INTERVAL_MS) return;
          // No-op guard: don't immortalise a day where nothing moved.
          if (
            JSON.stringify(newest.entries) === JSON.stringify(profile.entries) &&
            JSON.stringify(newest.customKinks) === JSON.stringify(profile.customKinks)
          ) return;
        }
        s.saveProfileSnapshot(profileId);
      }

      return {
      profiles: [],
      contracts: [],
      profileSnapshots: [],
      scenes: [],
      profileOwnerKeys: [],
      onboardingComplete: false,
      profileTourComplete: false,
      installPromptDismissed: false,
      notificationPermissionAsked: false,
      theme: "midnight" as Theme,
      pinnedProfileId: null,
      appLockEnabled: false,
      appLockPin: null,
      biometricEnabled: false,
      biometricCredentialId: null,

      pinProfile(id) {
        set({ pinnedProfileId: id });
      },

      unpinProfile() {
        set({ pinnedProfileId: null });
      },

      createProfile(name, role, experienceLevel = "beginner", relationshipStatus) {
        const id = uid();
        set((s) => ({
          profiles: [
            ...s.profiles,
            {
              id,
              verificationCode: generateProfileVerificationCode(),
              name,
              role,
              experienceLevel,
              questionnaireSetup: defaultQuestionnaireSetup(),
              relationshipStatus: relationshipStatus || undefined,
              origin: "own" as const,
              customKinks: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
              entries: {},
            },
          ],
        }));
        return id;
      },

      deleteProfile(id) {
        set((s) => ({
          profiles: s.profiles.filter((p) => p.id !== id),
          pinnedProfileId: s.pinnedProfileId === id ? null : s.pinnedProfileId,
          profileSnapshots: s.profileSnapshots.filter((snap) => snap.profileId !== id),
          profileOwnerKeys: s.profileOwnerKeys.filter((key) => key.profileId !== id),
        }));
      },

      renameProfile(id, name, role, experienceLevel, relationshipStatus, fetLifeUsername, bdsmtestUrl) {
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id
              ? { ...p, name, role, experienceLevel, relationshipStatus: relationshipStatus || undefined, fetLifeUsername: fetLifeUsername || undefined, bdsmtestUrl: bdsmtestUrl || undefined, updatedAt: Date.now() }
              : p
          ),
        }));
      },

      updatePrivateNote(id, note) {
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, privateNote: note || undefined } : p
          ),
        }));
      },

      setBdsmtestScores(id, scores) {
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, bdsmtestScores: scores, updatedAt: Date.now() } : p
          ),
        }));
      },

      setProfileAvatar(id, avatarDataUrl) {
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, avatarDataUrl, updatedAt: Date.now() } : p
          ),
        }));
      },

      setEntry(profileId, kinkId, patch) {
        set((s) => ({
          profiles: s.profiles.map((p) => {
            if (p.id !== profileId) return p;
            const prev = p.entries[kinkId] ?? { ...EMPTY_ENTRY };
            return {
              ...p,
              updatedAt: Date.now(),
              entries: { ...p.entries, [kinkId]: { ...prev, ...patch } },
            };
          }),
        }));
        maybeAutoSnapshot(profileId);
      },

      resetEntry(profileId, kinkId) {
        set((s) => ({
          profiles: s.profiles.map((p) => {
            if (p.id !== profileId) return p;
            const entries = { ...p.entries };
            delete entries[kinkId];
            return { ...p, updatedAt: Date.now(), entries };
          }),
        }));
        maybeAutoSnapshot(profileId);
      },

      getEntry(profileId, kinkId) {
        const profile = get().profiles.find((p) => p.id === profileId);
        return profile?.entries[kinkId] ?? { ...EMPTY_ENTRY };
      },

      addCustomKink(profileId, name) {
        const id = "custom_" + uid();
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id !== profileId
              ? p
              : {
                  ...p,
                  updatedAt: Date.now(),
                  customKinks: [...(p.customKinks ?? []), { id, name: name.trim() }],
                }
          ),
        }));
        maybeAutoSnapshot(profileId);
      },

      removeCustomKink(profileId, kinkId) {
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id !== profileId
              ? p
              : {
                  ...p,
                  updatedAt: Date.now(),
                  customKinks: (p.customKinks ?? []).filter((k) => k.id !== kinkId),
                }
          ),
        }));
        maybeAutoSnapshot(profileId);
      },

      saveContract(snapshot) {
        const id = uid();
        set((s) => ({
          contracts: [{ id, ...snapshot }, ...s.contracts].slice(0, 20),
        }));
      },

      restoreContracts(snapshots) {
        set((s) => {
          const existingIds = new Set(s.contracts.map((c) => c.id));
          const novel = snapshots.filter((c) => !existingIds.has(c.id));
          return novel.length === 0 ? s : { contracts: [...novel, ...s.contracts].slice(0, 20) };
        });
      },

      deleteContract(id) {
        set((s) => ({ contracts: s.contracts.filter((c) => c.id !== id) }));
      },

      saveProfileSnapshot(profileId) {
        const profile = get().profiles.find((p) => p.id === profileId);
        if (!profile) return null;
        const snapshot: ProfileSnapshot = {
          id: uid(),
          profileId,
          date: Date.now(),
          entries: profile.entries,
          customKinks: profile.customKinks,
          counts: deriveCounts(profile.entries),
        };
        set((s) => {
          const others = s.profileSnapshots.filter((snap) => snap.profileId !== profileId);
          const mine = s.profileSnapshots.filter((snap) => snap.profileId === profileId);
          const trimmed = [snapshot, ...mine].slice(0, SNAPSHOT_CAP_PER_PROFILE);
          return { profileSnapshots: [...trimmed, ...others] };
        });
        return snapshot;
      },

      deleteProfileSnapshot(id) {
        set((s) => ({ profileSnapshots: s.profileSnapshots.filter((snap) => snap.id !== id) }));
      },

      saveScene(record: Omit<SceneRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
        const id = record.id ?? uid();
        const now = Date.now();
        set((s) => {
          const existing = s.scenes.find((sc) => sc.id === id);
          if (existing) {
            return { scenes: s.scenes.map((sc) => sc.id === id ? { ...sc, ...record, id, updatedAt: now } : sc) };
          }
          return { scenes: [{ ...record, id, createdAt: now, updatedAt: now }, ...s.scenes].slice(0, 50) };
        });
        return id;
      },

      deleteScene(id) {
        set((s) => ({ scenes: s.scenes.filter((sc) => sc.id !== id) }));
      },

      updateAftercare(id, aftercare) {
        set((s) => ({
          scenes: s.scenes.map((sc) =>
            sc.id === id ? { ...sc, aftercare, updatedAt: Date.now() } : sc
          ),
        }));
      },

      completeScene(id, aftercare) {
        set((s) => {
          const scene = s.scenes.find((sc) => sc.id === id);
          if (!scene) return s;
          let profiles = s.profiles;
          for (const item of scene.items) {
            if (!item.kinkId) continue;
            const kinkId = item.kinkId;
            profiles = profiles.map((p) => {
              if (p.id !== scene.profileAId && p.id !== scene.profileBId) return p;
              // Scene kinkId is anchored to profile A; profile B records the explicit counterpart.
              const participantKinkId = p.id === scene.profileBId
                ? partnerDirectionalKinkId(kinkId)
                : kinkId;
              const prev = p.entries[participantKinkId] ?? { status: null, comment: "" };
              return {
                ...p,
                entries: {
                  ...p.entries,
                  [participantKinkId]: { ...prev, usedInScene: (prev.usedInScene ?? 0) + 1 },
                },
              };
            });
          }
          return {
            profiles,
            scenes: s.scenes.map((sc) => sc.id === id ? { ...sc, status: "completed" as const, aftercare, updatedAt: Date.now() } : sc),
          };
        });
        const scene = get().scenes.find((sc) => sc.id === id);
        if (scene) {
          maybeAutoSnapshot(scene.profileAId);
          maybeAutoSnapshot(scene.profileBId);
        }
      },

      completeOnboarding() {
        set({ onboardingComplete: true });
      },

      completeProfileTour() {
        set({ profileTourComplete: true });
      },

      resetProfileTour() {
        set({ profileTourComplete: false });
      },

      importProfiles(incoming) {
        set((s) => {
          const profiles = [...s.profiles];
          for (const raw of incoming) {
            const verificationCode = getProfileVerificationCode(raw);
            const profile = { ...raw, verificationCode, origin: "shared" as const, isImported: true, lockedAt: raw.lockedAt ?? Date.now() };
            const index = profiles.findIndex((candidate) => candidate.id === profile.id || getProfileVerificationCode(candidate) === verificationCode);
            if (index < 0) {
              profiles.push(profile);
              continue;
            }
            const existing = profiles[index];
            const current = existing.consentProof;
            const next = profile.consentProof;
            const shared = existing.origin === "shared" || existing.isImported === true;
            const accepted = shared && next && (!current || (
              next.keyId === current.keyId
              && next.version > current.version
              && next.previousProofHash === current.proofHash
            ));
            if (!accepted) continue;
            profiles[index] = {
              ...profile,
              id: existing.id,
              privateNote: existing.privateNote,
              avatarDataUrl: existing.avatarDataUrl,
              lockedAt: Date.now(),
            };
          }
          return { profiles };
        });
      },

      restoreBackupProfiles(incoming, ownerKeys) {
        set((s) => {
          const profiles = [...s.profiles];
          const ownedIds = new Set(ownerKeys.map((key) => key.profileId));
          for (const profile of incoming) {
            const index = profiles.findIndex((candidate) =>
              candidate.id === profile.id || getProfileVerificationCode(candidate) === getProfileVerificationCode(profile));
            if (index < 0) {
              profiles.push(profile);
              continue;
            }
            const existing = profiles[index];
            const incomingOwned = profile.origin === "own" && ownedIds.has(profile.id);
            const existingShared = existing.origin === "shared" || existing.isImported === true;
            if (incomingOwned && existingShared) profiles[index] = profile;
          }
          const keys = [...s.profileOwnerKeys];
          for (const key of ownerKeys) {
            const index = keys.findIndex((candidate) => candidate.profileId === key.profileId);
            if (index >= 0) keys[index] = key; else keys.push(key);
          }
          return { profiles, profileOwnerKeys: keys };
        });
      },

      async sealProfileConsent(profileId) {
        let profile = get().profiles.find((candidate) => candidate.id === profileId);
        if (!profile || profile.origin === "shared" || profile.isImported === true) return null;
        let ownerKey = get().profileOwnerKeys.find((key) => key.profileId === profileId);
        if (ownerKey && profile.consentProof?.keyId === ownerKey.keyId) {
          const verification = await verifyProfileConsent(profile);
          if (verification.status === "valid") return profile;
        }
        ownerKey = ownerKey ?? await generateProfileOwnerKey(profileId);
        let signed = await signProfileConsent(profile, ownerKey);
        const latest = get().profiles.find((candidate) => candidate.id === profileId);
        if (!latest) return null;
        if (await hashProfileConsent(latest) !== signed.proof.payloadHash) {
          profile = latest;
          signed = await signProfileConsent(profile, ownerKey);
        }
        const sealed = { ...profile, consentProof: signed.proof };
        set((s) => ({
          profiles: s.profiles.map((candidate) => candidate.id === profileId ? sealed : candidate),
          profileOwnerKeys: [signed.ownerKey, ...s.profileOwnerKeys.filter((key) => key.profileId !== profileId)],
        }));
        return sealed;
      },

      async lockSceneConsent(sceneId) {
        const scene = get().scenes.find((candidate) => candidate.id === sceneId);
        if (!scene) return { ok: false, message: "Scène niet gevonden." };
        if (scene.consentSnapshots) return { ok: true, message: "✓ Deze afspraken waren al vastgezet." };
        const ids = [scene.profileAId, scene.profileBId];
        for (const profileId of ids) {
          const profile = get().profiles.find((candidate) => candidate.id === profileId);
          if (!profile) return { ok: false, message: "Een profiel ontbreekt." };
          if (profile.origin === "shared" || profile.isImported === true) {
            const verification = await verifyProfileConsent(profile);
            if (verification.status !== "valid") {
              return { ok: false, message: `${profile.name} heeft nog geen geldige bronbevestiging. Laat het profiel opnieuw delen vanaf het eigen toestel.` };
            }
          } else if (!await get().sealProfileConsent(profileId)) {
            return { ok: false, message: `${profile.name} kon niet worden bevestigd.` };
          }
        }
        const [profileA, profileB] = ids.map((profileId) => get().profiles.find((profile) => profile.id === profileId));
        if (!profileA || !profileB) return { ok: false, message: "Een profiel ontbreekt." };
        const [snapshotA, snapshotB] = await Promise.all([createConsentSnapshot(profileA), createConsentSnapshot(profileB)]);
        if (!snapshotA || !snapshotB) return { ok: false, message: "De bron van één profiel kon niet worden bevestigd." };
        const lockedAt = Date.now();
        const snapshots = { profileA: snapshotA, profileB: snapshotB };
        const agreement = projectSceneConsentAgreement(scene, snapshots);
        const localOwnerKey = get().profileOwnerKeys.find((key) =>
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
        return { ok: true, message: "✓ Afspraken en bronnen zijn vastgezet." };
      },

      async appendSceneConsentEvent(sceneId, profileId, type, note) {
        const scene = get().scenes.find((candidate) => candidate.id === sceneId);
        if (!scene?.consentSnapshots) return { ok: false, message: "Zet eerst de oorspronkelijke afspraken vast." };
        if (profileId !== scene.profileAId && profileId !== scene.profileBId) return { ok: false, message: "Dit profiel hoort niet bij de scène." };
        const profile = get().profiles.find((candidate) => candidate.id === profileId);
        if (!profile) return { ok: false, message: "Profiel niet gevonden." };
        if (profile.origin === "shared" || profile.isImported === true) {
          return { ok: false, message: `Alleen ${profile.name} kan deze wijziging op het eigen toestel bevestigen.` };
        }
        const sealed = await get().sealProfileConsent(profileId);
        if (!sealed) return { ok: false, message: "De wijziging kon niet worden bevestigd." };
        const ownerKey = get().profileOwnerKeys.find((key) => key.profileId === profileId);
        if (!ownerKey) return { ok: false, message: "De eigendomssleutel ontbreekt." };
        const snapshot = type === "changed" ? await createConsentSnapshot(sealed) : undefined;
        const previousEventHash = scene.consentLedger?.at(-1)?.eventHash;
        const event = await createConsentLedgerEvent({
          id: uid(), sceneId, type, profileId, profileName: profile.name,
          createdAt: Date.now(), ...(note ? { note } : {}), ...(snapshot ? { snapshot } : {}),
          ...(previousEventHash ? { previousEventHash } : {}),
        }, ownerKey);
        set((s) => ({ scenes: s.scenes.map((candidate) => candidate.id === sceneId ? {
          ...candidate,
          consentLedger: [...(candidate.consentLedger ?? []), event],
          updatedAt: Date.now(),
        } : candidate) }));
        return { ok: true, message: type === "withdrawn" ? "✓ Intrekking is toegevoegd; eerdere afspraken bleven ongewijzigd." : "✓ Nieuwe toestemmingsversie is toegevoegd." };
      },

      dismissInstallPrompt() {
        set({ installPromptDismissed: true });
      },

      setNotificationPermissionAsked() {
        set({ notificationPermissionAsked: true });
      },

      setTheme(t) {
        set({ theme: t });
      },

      setAppLockPin(hash) {
        set({ appLockEnabled: true, appLockPin: hash });
      },

      clearAppLockPin() {
        set({ appLockEnabled: false, appLockPin: null });
      },

      enableBiometric(credentialId) {
        set({ biometricEnabled: true, biometricCredentialId: credentialId });
      },

      disableBiometric() {
        set({ biometricEnabled: false, biometricCredentialId: null });
      },
      };
    },
    {
      name: "kink-profiles",
      partialize: (state) => ({
        profiles: state.profiles,
        contracts: state.contracts,
        profileSnapshots: state.profileSnapshots,
        scenes: state.scenes,
        profileOwnerKeys: state.profileOwnerKeys,
        onboardingComplete: state.onboardingComplete,
        profileTourComplete: state.profileTourComplete,
        installPromptDismissed: state.installPromptDismissed,
        notificationPermissionAsked: state.notificationPermissionAsked,
        theme: state.theme,
        pinnedProfileId: state.pinnedProfileId,
        appLockEnabled: state.appLockEnabled,
        appLockPin: state.appLockPin,
        biometricEnabled: state.biometricEnabled,
        biometricCredentialId: state.biometricCredentialId,
      }),
      version: STORE_PERSIST_VERSION,
      migrate(persisted: unknown, version: number) {
        const state = persisted as {
          profiles?: Profile[];
          contracts?: ContractSnapshot[];
          profileSnapshots?: ProfileSnapshot[];
          scenes?: SceneRecord[];
          profileOwnerKeys?: ProfileOwnerKey[];
          onboardingComplete?: boolean;
          profileTourComplete?: boolean;
          installPromptDismissed?: boolean;
          notificationPermissionAsked?: boolean;
          theme?: Theme;
          pinnedProfileId?: string | null;
          appLockEnabled?: boolean;
          appLockPin?: string | null;
          biometricEnabled?: boolean;
          biometricCredentialId?: string | null;
        };
        if (version < 2 && state.profiles) {
          state.profiles = state.profiles.map((p) => ({
            ...p,
            experienceLevel: (p as Profile & { experienceLevel?: ExperienceLevel }).experienceLevel ?? "beginner",
            customKinks: (p as Profile & { customKinks?: CustomKink[] }).customKinks ?? [],
          }));
        }
        if (version < 3) {
          state.contracts = state.contracts ?? [];
          state.onboardingComplete = state.onboardingComplete ?? false;
        }
        if (version < 4) {
          state.installPromptDismissed = false;
          state.theme = "midnight";
        }
        // v5: desire + experienced + fetLifeUsername + avatarDataUrl — all optional, no migration needed
        if (version < 6) {
          state.profileTourComplete = false;
        }
        if (version < 7) {
          state.pinnedProfileId = null;
        }
        // v8: bdsmtestUrl + privateNote — both optional, no migration needed
        if (version < 9) {
          state.appLockEnabled = false;
          state.appLockPin = null;
          state.biometricEnabled = false;
          state.biometricCredentialId = null;
        }
        if (version < 10) {
          state.scenes = [];
        }
        if (version < 11) {
          state.scenes = (state.scenes ?? []).map((sc) => {
            if (!sc.aftercare) return sc;
            const a = sc.aftercare as Partial<typeof sc.aftercare>;
            if (!a.trafficLight || !("completedAt" in a)) return { ...sc, aftercare: undefined };
            return sc;
          });
        }
        if (version < 12 && state.contracts && state.profiles) {
          // Backfill IDs on legacy contracts so a later rename can't orphan them
          const byName = new Map(state.profiles.map((p) => [p.name.toLowerCase(), p.id]));
          state.contracts = state.contracts.map((c) => {
            if (c.profileAId && c.profileBId) return c;
            const aId = byName.get(c.profileAName?.toLowerCase());
            const bId = byName.get(c.profileBName?.toLowerCase());
            return aId && bId ? { ...c, profileAId: aId, profileBId: bId } : c;
          });
        }
        if (version < 13) {
          state.notificationPermissionAsked = false;
        }
        if (version < 14) {
          state.profileSnapshots = state.profileSnapshots ?? [];
        }
        if (version < 15 && state.profiles) {
          const STATUS_ORDER = ["hard_no", "no", "maybe", "willing", "yes"] as const;
          state.profiles = state.profiles.map((p) => ({
            ...p,
            entries: Object.fromEntries(
              Object.entries(p.entries).map(([id, e]) => {
                const entry = e as typeof e & { direction?: string; statusGive?: string; statusReceive?: string };
                let status = entry.status;
                if (entry.direction && (entry.statusGive || entry.statusReceive)) {
                  const a = entry.statusGive ?? null;
                  const b = entry.statusReceive ?? null;
                  const collapsed = STATUS_ORDER.find(s => s === a || s === b) ?? a ?? b ?? status;
                  status = collapsed as typeof status;
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { direction, statusGive, statusReceive, ...rest } = entry as typeof entry & { direction?: unknown; statusGive?: unknown; statusReceive?: unknown };
                return [id, { ...rest, status }];
              })
            ),
          }));
        }
        if (version < 16 && state.profiles) {
          state.profiles = state.profiles.map((profile) => ({
            ...profile,
            verificationCode: getProfileVerificationCode(profile),
          }));
        }
        if (version < 17) {
          state.profileOwnerKeys = [];
        }
        if (version < 18 && state.profiles) {
          state.profiles = normalizeStoredQuestionnaireProfiles(state.profiles);
        }
        migrateStoredDirectionalityV22(state, version);
        return state;
      },
    }
  )
);

export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(useStore.persist.hasHydrated());
    return useStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
