import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useState, useEffect } from "react";
import type { Profile, KinkEntry, KinkStatus, ExperienceLevel, CustomKink, ContractSnapshot } from "@/types";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type Theme = "midnight" | "red" | "forest" | "mono";

interface State {
  profiles: Profile[];
  contracts: ContractSnapshot[];
  onboardingComplete: boolean;
  profileTourComplete: boolean;
  installPromptDismissed: boolean;
  theme: Theme;
  pinnedProfileId: string | null;
  pinProfile: (id: string) => void;
  unpinProfile: () => void;
  createProfile: (name: string, role: string, experienceLevel?: ExperienceLevel, relationshipStatus?: string) => string;
  deleteProfile: (id: string) => void;
  renameProfile: (id: string, name: string, role: string, experienceLevel: ExperienceLevel, relationshipStatus?: string, fetLifeUsername?: string, bdsmtestUrl?: string) => void;
  updatePrivateNote: (id: string, note: string) => void;
  setProfileAvatar: (id: string, avatarDataUrl: string | undefined) => void;
  setEntry: (profileId: string, kinkId: string, patch: Partial<KinkEntry>) => void;
  resetEntry: (profileId: string, kinkId: string) => void;
  getEntry: (profileId: string, kinkId: string) => KinkEntry;
  addCustomKink: (profileId: string, name: string) => void;
  removeCustomKink: (profileId: string, kinkId: string) => void;
  saveContract: (snapshot: Omit<ContractSnapshot, "id">) => void;
  deleteContract: (id: string) => void;
  completeOnboarding: () => void;
  completeProfileTour: () => void;
  resetProfileTour: () => void;
  importProfiles: (incoming: Profile[]) => void;
  dismissInstallPrompt: () => void;
  setTheme: (t: Theme) => void;
}

const EMPTY_ENTRY: KinkEntry = { status: null, score: null, comment: "" };

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      profiles: [],
      contracts: [],
      onboardingComplete: false,
      profileTourComplete: false,
      installPromptDismissed: false,
      theme: "midnight" as Theme,
      pinnedProfileId: null,

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

      deleteContract(id) {
        set((s) => ({ contracts: s.contracts.filter((c) => c.id !== id) }));
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

      setTheme(t) {
        set({ theme: t });
      },
    }),
    {
      name: "kink-profiles",
      partialize: (state) => ({
        profiles: state.profiles,
        contracts: state.contracts,
        onboardingComplete: state.onboardingComplete,
        profileTourComplete: state.profileTourComplete,
        installPromptDismissed: state.installPromptDismissed,
        theme: state.theme,
        pinnedProfileId: state.pinnedProfileId,
      }),
      version: 8,
      migrate(persisted: unknown, version: number) {
        const state = persisted as {
          profiles?: Profile[];
          contracts?: ContractSnapshot[];
          onboardingComplete?: boolean;
          profileTourComplete?: boolean;
          installPromptDismissed?: boolean;
          theme?: Theme;
          pinnedProfileId?: string | null;
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
