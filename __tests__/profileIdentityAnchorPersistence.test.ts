import { describe, expect, it } from "vitest";
import type { ProfileIdentityAnchor } from "@/types";
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
  it("stores anchors under a dedicated local-only schema-versioned key", () => {
    const storage = new MemoryStorage();

    expect(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY).not.toBe("kink-profiles");
    expect(PROFILE_IDENTITY_ANCHOR_STORAGE_SCHEMA).toBe(1);
    expect(persistProfileIdentityAnchor(ALICE_ANCHOR, storage)).toBe(true);

    expect(JSON.parse(storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)!)).toEqual({
      schema: 1,
      anchors: [ALICE_ANCHOR],
    });
  });

  it("round-trips the exact anchor without changing trust material", () => {
    const storage = new MemoryStorage();
    expect(persistProfileIdentityAnchor(ALICE_ANCHOR, storage)).toBe(true);

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

  it("fails closed on malformed JSON and refuses to overwrite it", () => {
    const storage = new MemoryStorage();
    storage.setItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY, "{not-json");

    expect(readProfileIdentityAnchorRegistry(storage)).toEqual({ schema: 1, anchors: [] });
    expect(persistProfileIdentityAnchor(ALICE_ANCHOR, storage)).toBe(false);
    expect(storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)).toBe("{not-json");
  });

  it("fails closed on an unsupported future schema and refuses downgrade overwrite", () => {
    const storage = new MemoryStorage();
    const future = JSON.stringify({ schema: 2, anchors: [ALICE_ANCHOR] });
    storage.setItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY, future);

    expect(readProfileIdentityAnchorRegistry(storage)).toEqual({ schema: 1, anchors: [] });
    expect(persistProfileIdentityAnchor(ALICE_ANCHOR, storage)).toBe(false);
    expect(storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)).toBe(future);
  });

  it("fails closed when persisted anchor records are malformed", () => {
    const storage = new MemoryStorage();
    const malformed = JSON.stringify({
      schema: 1,
      anchors: [{ ...ALICE_ANCHOR, verificationCode: "not-a-code" }],
    });
    storage.setItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY, malformed);

    expect(readProfileIdentityAnchorRegistry(storage)).toEqual({ schema: 1, anchors: [] });
    expect(persistProfileIdentityAnchor(ALICE_ANCHOR, storage)).toBe(false);
    expect(storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)).toBe(malformed);
  });

  it("accepts an exact repeated write idempotently without duplicating the anchor", () => {
    const storage = new MemoryStorage();
    expect(persistProfileIdentityAnchor(ALICE_ANCHOR, storage)).toBe(true);
    const once = storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY);

    expect(persistProfileIdentityAnchor(ALICE_ANCHOR, storage)).toBe(true);
    expect(storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)).toBe(once);
    expect(readProfileIdentityAnchorRegistry(storage).anchors).toHaveLength(1);
  });

  it("refuses anchor replacement for the same profile id", () => {
    const storage = new MemoryStorage();
    expect(persistProfileIdentityAnchor(ALICE_ANCHOR, storage)).toBe(true);
    const original = storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY);

    expect(persistProfileIdentityAnchor({ ...ALICE_ANCHOR, keyId: "mallory-key" }, storage)).toBe(false);
    expect(storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)).toBe(original);
    expect(getPersistedProfileIdentityAnchor("alice-profile", storage)).toEqual(ALICE_ANCHOR);
  });

  it("rejects a registry that contains duplicate profile identities", () => {
    const storage = new MemoryStorage();
    storage.setItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY, JSON.stringify({
      schema: 1,
      anchors: [ALICE_ANCHOR, { ...ALICE_ANCHOR, keyId: "other-key" }],
    }));

    expect(readProfileIdentityAnchorRegistry(storage)).toEqual({ schema: 1, anchors: [] });
    expect(persistProfileIdentityAnchor(ALICE_ANCHOR, storage)).toBe(false);
  });

  it("removes only the explicitly selected persisted anchor", () => {
    const storage = new MemoryStorage();
    const bob: ProfileIdentityAnchor = {
      ...ALICE_ANCHOR,
      profileId: "bob-profile",
      verificationCode: "KS-8J4R-5T6V-W7XY",
      keyId: "bob-key",
      fingerprint: "collar-steady-gold-shadow",
    };
    expect(persistProfileIdentityAnchor(ALICE_ANCHOR, storage)).toBe(true);
    expect(persistProfileIdentityAnchor(bob, storage)).toBe(true);

    expect(removePersistedProfileIdentityAnchor("alice-profile", storage)).toBe(true);
    expect(readProfileIdentityAnchorRegistry(storage)).toEqual({ schema: 1, anchors: [bob] });
  });

  it("rolls back only the exact anchor created by the current operation", () => {
    const storage = new MemoryStorage();
    expect(persistProfileIdentityAnchor(ALICE_ANCHOR, storage)).toBe(true);

    expect(removePersistedProfileIdentityAnchorIfMatches(
      { ...ALICE_ANCHOR, anchoredAt: ALICE_ANCHOR.anchoredAt + 1 },
      storage,
    )).toBe(false);
    expect(getPersistedProfileIdentityAnchor(ALICE_ANCHOR.profileId, storage)).toEqual(ALICE_ANCHOR);

    expect(removePersistedProfileIdentityAnchorIfMatches(ALICE_ANCHOR, storage)).toBe(true);
    expect(getPersistedProfileIdentityAnchor(ALICE_ANCHOR.profileId, storage)).toBeUndefined();
  });

  it("reports storage write failure without mutating the in-memory trust decision", () => {
    const storage = {
      getItem: () => null,
      setItem: () => { throw new Error("quota"); },
      removeItem: () => undefined,
    };

    expect(persistProfileIdentityAnchor(ALICE_ANCHOR, storage)).toBe(false);
    expect(readProfileIdentityAnchorRegistry(storage)).toEqual({ schema: 1, anchors: [] });
  });
});
