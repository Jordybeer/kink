import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useState, useEffect } from "react";
import type { Profile, KinkEntry, KinkStatus, ExperienceLevel, CustomKink } from "@/types";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface State {
  profiles: Profile[];
  createProfile: (name: string, role: string, experienceLevel?: ExperienceLevel) => string;
  deleteProfile: (id: string) => void;
  renameProfile: (id: string, name: string, role: string, experienceLevel: ExperienceLevel) => void;
  setEntry: (profileId: string, kinkId: string, patch: Partial<KinkEntry>) => void;
  resetEntry: (profileId: string, kinkId: string) => void;
  getEntry: (profileId: string, kinkId: string) => KinkEntry;
  addCustomKink: (profileId: string, name: string) => void;
  removeCustomKink: (profileId: string, kinkId: string) => void;
}

const EMPTY_ENTRY: KinkEntry = { status: null, score: null, comment: "" };

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      profiles: [],

      createProfile(name, role, experienceLevel = "beginner") {
        const id = uid();
        set((s) => ({
          profiles: [
            ...s.profiles,
            {
              id,
              name,
              role,
              experienceLevel,
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

      renameProfile(id, name, role, experienceLevel) {
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, name, role, experienceLevel, updatedAt: Date.now() } : p
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
    }),
    {
      name: "kink-profiles",
      partialize: (state) => ({ profiles: state.profiles }),
      // Migrate existing profiles missing the new fields
      version: 2,
      migrate(persisted: unknown, version: number) {
        const state = persisted as { profiles?: Profile[] };
        if (version < 2 && state.profiles) {
          state.profiles = state.profiles.map((p) => ({
            ...p,
            experienceLevel: (p as Profile & { experienceLevel?: ExperienceLevel }).experienceLevel ?? "beginner",
            customKinks: (p as Profile & { customKinks?: CustomKink[] }).customKinks ?? [],
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
