import { describe, expect, it } from "vitest";
import type { ProfileIdentityAnchor } from "@/types";
import type { ProfileIdentityAnchorLock } from "@/lib/storeSecurity";
import {
  PROFILE_IDENTITY_ANCHOR_STORAGE_KEY,
  PROFILE_IDENTITY_ANCHOR_STORAGE_SCHEMA,
  getPersistedProfileIdentityAnchor,
  persistProfileIdentityAnchor,
  readProfileIdentityAnchorRegistry,
  removePersistedProfileIdentityAnchor,
  removePersistedProfileIdentityAnchorIfMatches,
} from "@/lib/storeSecurity";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

class MemoryLock implements ProfileIdentityAnchorLock {
  private tail: Promise<void> = Promise.resolve();

  runExclusive<T>(operation: () => T): Promise<T> {
    const result = this.tail.then(operation);
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }
}

const ALICE_ANCHOR: ProfileIdentityAnchor = {
  schema: 1,
  profileId: "alice-profile",
  verificationCode: "KS-7H3P-9Q2M-A4BC",
  keyId: "alice-key",
  fingerprint: "rope-trust-velvet-moon",
  anchoredAt: 1234,
  method: "source-device-fingerprint",
};

describe("profile identity anchor persistence", () => {
  it("stores anchors under a dedicated local-only schema-versioned key", async () => {
    const storage = new MemoryStorage();
    const lock = new MemoryLock();

    expect(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY).not.toBe("kink-profiles");
    expect(PROFILE_IDENTITY_ANCHOR_STORAGE_SCHEMA).toBe(1);
    expect(await persistProfileIdentityAnchor(ALICE_ANCHOR, storage, lock)).toBe(true);

    expect(JSON.parse(storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)!)).toEqual({
      schema: 1,
      anchors: [ALICE_ANCHOR],
    });
  });

  it("round-trips the exact anchor without changing trust material", async () => {
    const storage = new MemoryStorage();
    expect(await persistProfileIdentityAnchor(ALICE_ANCHOR, storage, new MemoryLock())).toBe(true);

    expect(readProfileIdentityAnchorRegistry(storage)).toEqual({
      schema: 1,
      anchors: [ALICE_ANCHOR],
    });
    expect(getPersistedProfileIdentityAnchor("alice-profile", storage)).toEqual(ALICE_ANCHOR);
  });

  it("treats a missing registry as an empty current-schema registry", () => {
    const storage = new MemoryStorage();
    expect(readProfileIdentityAnchorRegistry(storage)).toEqual({ schema: 1, anchors: [] });
  });

  it("fails closed on malformed JSON and refuses to overwrite it", async () => {
    const storage = new MemoryStorage();
    storage.setItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY, "{not-json");

    expect(readProfileIdentityAnchorRegistry(storage)).toEqual({ schema: 1, anchors: [] });
    expect(await persistProfileIdentityAnchor(ALICE_ANCHOR, storage, new MemoryLock())).toBe(false);
    expect(storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)).toBe("{not-json");
  });

  it("fails closed on an unsupported future schema and refuses downgrade overwrite", async () => {
    const storage = new MemoryStorage();
    const future = JSON.stringify({ schema: 2, anchors: [ALICE_ANCHOR] });
    storage.setItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY, future);

    expect(readProfileIdentityAnchorRegistry(storage)).toEqual({ schema: 1, anchors: [] });
    expect(await persistProfileIdentityAnchor(ALICE_ANCHOR, storage, new MemoryLock())).toBe(false);
    expect(storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)).toBe(future);
  });

  it("fails closed when persisted anchor records are malformed", async () => {
    const storage = new MemoryStorage();
    const malformed = JSON.stringify({
      schema: 1,
      anchors: [{ ...ALICE_ANCHOR, verificationCode: "not-a-code" }],
    });
    storage.setItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY, malformed);

    expect(readProfileIdentityAnchorRegistry(storage)).toEqual({ schema: 1, anchors: [] });
    expect(await persistProfileIdentityAnchor(ALICE_ANCHOR, storage, new MemoryLock())).toBe(false);
    expect(storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)).toBe(malformed);
  });

  it("accepts an exact repeated write idempotently without duplicating the anchor", async () => {
    const storage = new MemoryStorage();
    const lock = new MemoryLock();
    expect(await persistProfileIdentityAnchor(ALICE_ANCHOR, storage, lock)).toBe(true);
    const once = storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY);

    expect(await persistProfileIdentityAnchor(ALICE_ANCHOR, storage, lock)).toBe(true);
    expect(storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)).toBe(once);
    expect(readProfileIdentityAnchorRegistry(storage).anchors).toHaveLength(1);
  });

  it("refuses anchor replacement for the same profile id", async () => {
    const storage = new MemoryStorage();
    const lock = new MemoryLock();
    expect(await persistProfileIdentityAnchor(ALICE_ANCHOR, storage, lock)).toBe(true);
    const original = storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY);

    expect(await persistProfileIdentityAnchor(
      { ...ALICE_ANCHOR, keyId: "mallory-key" },
      storage,
      lock,
    )).toBe(false);
    expect(storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)).toBe(original);
    expect(getPersistedProfileIdentityAnchor("alice-profile", storage)).toEqual(ALICE_ANCHOR);
  });

  it("rejects a registry that contains duplicate profile identities", async () => {
    const storage = new MemoryStorage();
    storage.setItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY, JSON.stringify({
      schema: 1,
      anchors: [ALICE_ANCHOR, { ...ALICE_ANCHOR, keyId: "other-key" }],
    }));

    expect(readProfileIdentityAnchorRegistry(storage)).toEqual({ schema: 1, anchors: [] });
    expect(await persistProfileIdentityAnchor(ALICE_ANCHOR, storage, new MemoryLock())).toBe(false);
  });

  it("removes only the explicitly selected persisted anchor", async () => {
    const storage = new MemoryStorage();
    const lock = new MemoryLock();
    const bob: ProfileIdentityAnchor = {
      ...ALICE_ANCHOR,
      profileId: "bob-profile",
      verificationCode: "KS-8J4R-5T6V-W7XY",
      keyId: "bob-key",
      fingerprint: "collar-steady-gold-shadow",
    };
    expect(await persistProfileIdentityAnchor(ALICE_ANCHOR, storage, lock)).toBe(true);
    expect(await persistProfileIdentityAnchor(bob, storage, lock)).toBe(true);

    expect(await removePersistedProfileIdentityAnchor("alice-profile", storage, lock)).toBe(true);
    expect(readProfileIdentityAnchorRegistry(storage)).toEqual({ schema: 1, anchors: [bob] });
  });

  it("rolls back only the exact anchor created by the current operation", async () => {
    const storage = new MemoryStorage();
    const lock = new MemoryLock();
    expect(await persistProfileIdentityAnchor(ALICE_ANCHOR, storage, lock)).toBe(true);

    expect(await removePersistedProfileIdentityAnchorIfMatches(
      { ...ALICE_ANCHOR, anchoredAt: ALICE_ANCHOR.anchoredAt + 1 },
      storage,
      lock,
    )).toBe(false);
    expect(getPersistedProfileIdentityAnchor(ALICE_ANCHOR.profileId, storage)).toEqual(ALICE_ANCHOR);

    expect(await removePersistedProfileIdentityAnchorIfMatches(ALICE_ANCHOR, storage, lock)).toBe(true);
    expect(getPersistedProfileIdentityAnchor(ALICE_ANCHOR.profileId, storage)).toBeUndefined();
  });

  it("reports storage write failure without mutating the in-memory trust decision", async () => {
    const storage = {
      getItem: () => null,
      setItem: () => { throw new Error("quota"); },
      removeItem: () => undefined,
    };

    expect(await persistProfileIdentityAnchor(ALICE_ANCHOR, storage, new MemoryLock())).toBe(false);
    expect(readProfileIdentityAnchorRegistry(storage)).toEqual({ schema: 1, anchors: [] });
  });

  it("fails closed when an exclusive cross-tab lock is unavailable", async () => {
    const storage = new MemoryStorage();
    expect(await persistProfileIdentityAnchor(ALICE_ANCHOR, storage, null)).toBe(false);
    expect(readProfileIdentityAnchorRegistry(storage).anchors).toEqual([]);
  });

  it("serializes competing first anchors and never lets the second key replace the first", async () => {
    const storage = new MemoryStorage();
    const lock = new MemoryLock();
    const competing = { ...ALICE_ANCHOR, keyId: "mallory-key", fingerprint: "mallory-fingerprint" };

    const results = await Promise.all([
      persistProfileIdentityAnchor(ALICE_ANCHOR, storage, lock),
      persistProfileIdentityAnchor(competing, storage, lock),
    ]);

    expect(results).toEqual([true, false]);
    expect(readProfileIdentityAnchorRegistry(storage).anchors).toEqual([ALICE_ANCHOR]);
  });

  it("re-reads inside the lock so concurrent unrelated anchors are both retained", async () => {
    const storage = new MemoryStorage();
    const lock = new MemoryLock();
    const bob: ProfileIdentityAnchor = {
      ...ALICE_ANCHOR,
      profileId: "bob-profile",
      verificationCode: "KS-8J4R-5T6V-W7XY",
      keyId: "bob-key",
      fingerprint: "bob-fingerprint",
    };

    expect(await Promise.all([
      persistProfileIdentityAnchor(ALICE_ANCHOR, storage, lock),
      persistProfileIdentityAnchor(bob, storage, lock),
    ])).toEqual([true, true]);
    expect(readProfileIdentityAnchorRegistry(storage).anchors).toEqual([ALICE_ANCHOR, bob]);
  });
});
