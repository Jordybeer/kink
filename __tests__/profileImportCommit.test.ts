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

function setup(rejectWrites = false, initiallyPersisted = true) {
  const values = new Map<string, string>(initiallyPersisted
    ? [["kink-profiles", JSON.stringify({ state: { profiles: [] }, version: 0 })]]
    : []);
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

  it("does not overwrite externally changed persisted profiles while memory is stale", () => {
    const { store, storage } = setup();
    const external = JSON.stringify({ state: { profiles: [{ ...contact, id: "other-contact" }] }, version: 0 });
    storage.setItem("kink-profiles", external);

    expect(security.commitProfileImportPlan(store, plan, storage)).toBe(false);
    expect(store.getState().profiles).toEqual([]);
    expect(storage.getItem("kink-profiles")).toBe(external);
  });

  it("does not write a rollback if persisted storage cannot be read before the write", () => {
    const { store, storage } = setup();
    const external = JSON.stringify({ state: { profiles: [contact] }, version: 0 });
    storage.setItem("kink-profiles", external);
    const read = storage.getItem;
    storage.getItem = () => { throw new Error("unreadable"); };

    expect(security.commitProfileImportPlan(store, plan, storage)).toBe(false);
    expect(store.getState().profiles).toEqual([]);
    expect(read("kink-profiles")).toBe(external);
  });

  it("allows a genuinely fresh empty Zustand store only after its first durable write", () => {
    const { store, storage } = setup(false, false);
    expect(storage.getItem("kink-profiles")).toBeNull();
    expect(security.commitProfileImportPlan(store, plan, storage)).toBe(true);
    expect(JSON.parse(storage.getItem("kink-profiles")!).state.profiles).toEqual([contact]);
  });

  it("fails closed when persisted data is missing for a non-empty in-memory store", () => {
    const { store, storage } = setup();
    store.setState({ profiles: [contact] });
    storage.removeItem("kink-profiles");
    expect(security.commitProfileImportPlan(store, plan, storage)).toBe(false);
    expect(store.getState().profiles).toEqual([contact]);
    expect(storage.getItem("kink-profiles")).toBeNull();
  });

});
