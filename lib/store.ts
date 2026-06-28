import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useState, useEffect } from "react";
import type { Profile, KinkEntry, KinkStatus, ExperienceLevel, CustomKink, ContractSnapshot, ProfileSnapshot, SceneRecord, AftercareEntry } from "@/types";
import { deriveCounts } from "@/lib/profileSnapshot";

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

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      profiles: [],
      contracts: [],
      profileSnapshots: [],
      scenes: [],
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
              name,
              role,
              experienceLevel,
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
              const prev = p.entries[kinkId] ?? { status: null, comment: "" };
              return { ...p, entries: { ...p.entries, [kinkId]: { ...prev, usedInScene: (prev.usedInScene ?? 0) + 1 } } };
            });
          }
          return {
            profiles,
            scenes: s.scenes.map((sc) => sc.id === id ? { ...sc, status: "completed" as const, aftercare, updatedAt: Date.now() } : sc),
          };
        });
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
          const existingIds = new Set(s.profiles.map((p) => p.id));
          const novel = incoming.filter((p) => !existingIds.has(p.id));
          return novel.length === 0 ? s : { profiles: [...s.profiles, ...novel] };
        });
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
    }),
    {
      name: "kink-profiles",
      partialize: (state) => ({
        profiles: state.profiles,
        contracts: state.contracts,
        profileSnapshots: state.profileSnapshots,
        scenes: state.scenes,
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
      version: 15,
      migrate(persisted: unknown, version: number) {
        const state = persisted as {
          profiles?: Profile[];
          contracts?: ContractSnapshot[];
          profileSnapshots?: ProfileSnapshot[];
          scenes?: SceneRecord[];
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
