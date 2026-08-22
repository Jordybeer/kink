"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createQuotaSafeStorage } from "@/lib/persistStorage";

export type IntimacyStatus = "planned" | "completed";

export interface IntimacyRecord {
  id: string;
  status: IntimacyStatus;
  date: string;
  time?: string;
  title?: string;
  partnerProfileId?: string;
  partnerName?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

interface IntimacyState {
  entries: IntimacyRecord[];
  addEntry: (entry: Omit<IntimacyRecord, "id" | "createdAt" | "updatedAt">) => string;
  completeEntry: (id: string) => void;
  deleteEntry: (id: string) => void;
}

const storage = createQuotaSafeStorage();
const MAX_ENTRIES = 300;

function uid() {
  return crypto.randomUUID();
}

export const useIntimacyStore = create<IntimacyState>()(
  persist(
    (set) => ({
      entries: [],

      addEntry(entry) {
        const id = uid();
        const now = Date.now();
        const record: IntimacyRecord = {
          ...entry,
          id,
          createdAt: now,
          updatedAt: now,
          ...(entry.status === "completed" && !entry.completedAt ? { completedAt: now } : {}),
        };
        set((state) => ({
          entries: [record, ...state.entries].slice(0, MAX_ENTRIES),
        }));
        return id;
      },

      completeEntry(id) {
        const now = Date.now();
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id
              ? { ...entry, status: "completed" as const, completedAt: now, updatedAt: now }
              : entry
          ),
        }));
      },

      deleteEntry(id) {
        set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) }));
      },
    }),
    {
      name: "kinksync-intimacy",
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({ entries: state.entries }),
      version: 1,
    }
  )
);

export function useIntimacyHasHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useIntimacyStore.persist.hasHydrated());
    return useIntimacyStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
