import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile, KinkEntry, KinkStatus } from "@/types";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface State {
  profiles: Profile[];
  _hasHydrated: boolean;
  createProfile: (name: string, role: string) => string;
  deleteProfile: (id: string) => void;
  renameProfile: (id: string, name: string, role: string) => void;
  setEntry: (profileId: string, kinkId: string, patch: Partial<KinkEntry>) => void;
  resetEntry: (profileId: string, kinkId: string) => void;
  getEntry: (profileId: string, kinkId: string) => KinkEntry;
}

const EMPTY_ENTRY: KinkEntry = { status: null, score: null, comment: "" };

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      profiles: [],
      _hasHydrated: false,

      createProfile(name, role) {
        const id = uid();
        set((s) => ({
          profiles: [
            ...s.profiles,
            { id, name, role, createdAt: Date.now(), updatedAt: Date.now(), entries: {} },
          ],
        }));
        return id;
      },

      deleteProfile(id) {
        set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) }));
      },

      renameProfile(id, name, role) {
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, name, role, updatedAt: Date.now() } : p
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
    }),
    {
      name: "kink-profiles",
      onRehydrateStorage: () => () => {
        useStore.setState({ _hasHydrated: true });
      },
    }
  )
);
