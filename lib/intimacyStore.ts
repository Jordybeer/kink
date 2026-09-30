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
  reminderDaysBefore?: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface IntimacyRestoreResult {
  added: number;
  updated: number;
  unchanged: number;
}

interface IntimacyState {
  entries: IntimacyRecord[];
  addEntry: (entry: Omit<IntimacyRecord, "id" | "createdAt" | "updatedAt">) => string;
  updateEntry: (id: string, patch: Partial<Omit<IntimacyRecord, "id" | "createdAt">>) => void;
  deleteEntry: (id: string) => void;
  restoreEntries: (incoming: IntimacyRecord[]) => IntimacyRestoreResult;
}

const storage = createQuotaSafeStorage();
const MAX_ENTRIES = 300;

function uid() {
  return crypto.randomUUID();
}

function newestFirst(entries: Iterable<IntimacyRecord>): IntimacyRecord[] {
  return [...entries]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_ENTRIES);
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
        if (record.status === "completed") delete record.reminderDaysBefore;
        set((state) => ({
          entries: [record, ...state.entries].slice(0, MAX_ENTRIES),
        }));
        return id;
      },

      updateEntry(id, patch) {
        const now = Date.now();
        set((state) => ({
          entries: state.entries.map((entry) => {
            if (entry.id !== id) return entry;
            const status = patch.status ?? entry.status;
            const next: IntimacyRecord = {
              ...entry,
              ...patch,
              status,
              updatedAt: now,
            };
            if (status === "planned") {
              delete next.completedAt;
            } else {
              delete next.reminderDaysBefore;
              if (!next.completedAt) next.completedAt = now;
            }
            return next;
          }),
        }));
      },

      deleteEntry(id) {
        set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) }));
      },

      restoreEntries(incoming) {
        const current = useIntimacyStore.getState().entries;
        const merged = new Map(current.map((entry) => [entry.id, entry]));
        let added = 0;
        let updated = 0;
        let unchanged = 0;

        for (const entry of incoming) {
          const existing = merged.get(entry.id);
          if (!existing) {
            merged.set(entry.id, entry);
            added++;
          } else if (entry.updatedAt > existing.updatedAt) {
            merged.set(entry.id, entry);
            updated++;
          } else {
            unchanged++;
          }
        }

        set({ entries: newestFirst(merged.values()) });
        return { added, updated, unchanged };
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
