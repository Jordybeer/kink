import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist } from "zustand/middleware";
import { createQuotaSafeStorage } from "@/lib/persistStorage";
import * as security from "@/lib/storeSecurity";
import type { Profile } from "@/types";

const contact: Profile = {
  id: "contact", name: "Riley", role: "Dominant", experienceLevel: "ervaren",
  verificationCode: "KS-7H3P-9Q2M-A4BC", customKinks: [], entries: {},
  createdAt: 1, updatedAt: 1, origin: "shared", isImported: true,
};

function setup(rejectWrites = false) {
  const values = new Map<string, string>([["kink-profiles", JSON.stringify({ state: { profiles: [] }, version: 0 })]]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (rejectWrites) throw new DOMException("full", "QuotaExceededError");
      values.set(key, value);
    },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(), key: () => null, length: 0,
  };
  const store = createStore(persist(() => ({ profiles: [] as Profile[] }), {
    name: "kink-profiles", storage: createJSONStorage(() => createQuotaSafeStorage(() => storage, () => {})),
  }));
  return { store, storage };
}

const plan = { profiles: [contact], acceptedCount: 1, rejectedProfileIds: [] };

describe("profile import commit", () => {
  it("confirms the actual durable profiles after a legitimate import", () => {
    const { store, storage } = setup();
    expect(security.commitProfileImportPlan(store, plan, storage)).toBe(true);
    expect(store.getState().profiles).toEqual([contact]);
    expect(JSON.parse(storage.getItem("kink-profiles")!).state.profiles).toEqual([contact]);
  });

  it("rolls back memory when quota-safe persistence silently rejects the write", () => {
    const { store, storage } = setup(true);
    expect(security.commitProfileImportPlan(store, plan, storage)).toBe(false);
    expect(store.getState().profiles).toEqual([]);
    expect(JSON.parse(storage.getItem("kink-profiles")!).state.profiles).toEqual([]);
  });
});
