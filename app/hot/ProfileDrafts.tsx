"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { KinkEntry } from "@/types";

type Entries = Record<string, KinkEntry>;
type Drafts = Record<string, Entries>;
type Change = (profile: string, seed: Entries, topic: string, patch: Partial<KinkEntry>) => void;

const Context = createContext<{ drafts: Drafts; change: Change } | null>(null);

// Each synthetic perspective keeps its own answers for the lifetime of the lab layout.
export function ProfileDrafts({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<Drafts>({});
  const change: Change = (profile, seed, topic, patch) => setDrafts(previous => {
    const entries = previous[profile] ?? seed;
    const entry = entries[topic] ?? { status: null, comment: "" };
    return { ...previous, [profile]: { ...entries, [topic]: { ...entry, ...patch } } };
  });
  return <Context.Provider value={{ drafts, change }}>{children}</Context.Provider>;
}

export function useProfileDraft(profile: string, seed: Entries) {
  const context = useContext(Context);
  if (!context) throw new Error("Profile studies require the studio layout");
  return {
    entries: context.drafts[profile] ?? seed,
    updateEntry: (topic: string, patch: Partial<KinkEntry>) => context.change(profile, seed, topic, patch),
  };
}
