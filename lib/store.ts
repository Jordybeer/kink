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
  installPromptDismissed: boolean;
  theme: Theme;
  createProfile: (name: string, role: string, experienceLevel?: ExperienceLevel, relationshipStatus?: string) => string;
  deleteProfile: (id: string) => void;
  renameProfile: (id: string, name: string, role: string, experienceLevel: ExperienceLevel, relationshipStatus?: string) => void;
  setEntry: (profileId: string, kinkId: string, patch: Partial<KinkEntry>) => void;
  resetEntry: (profileId: string, kinkId: string) => void;
  getEntry: (profileId: string, kinkId: string) => KinkEntry;
  addCustomKink: (profileId: string, name: string) => void;
  removeCustomKink: (profileId: string, kinkId: string) => void;
  saveContract: (snapshot: Omit<ContractSnapshot, "id">) => void;
  deleteContract: (id: string) => void;
  completeOnboarding: () => void;
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
      installPromptDismissed: false,
      theme: "midnight" as Theme,

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
        set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) }));
      },

      renameProfile(id, name, role, experienceLevel, relationshipStatus) {
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, name, role, experienceLevel, relationshipStatus, updatedAt: Date.now() } : p
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
        installPromptDismissed: state.installPromptDismissed,
        theme: state.theme,
      }),
      version: 4,
      migrate(persisted: unknown, version: number) {
        const state = persisted as {
          profiles?: Profile[];
          contracts?: ContractSnapshot[];
          onboardingComplete?: boolean;
          installPromptDismissed?: boolean;
          theme?: Theme;
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
