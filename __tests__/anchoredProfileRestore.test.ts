import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist } from "zustand/middleware";
import { inflateSync } from "node:zlib";
import type { Profile, ProfileOwnerKey } from "@/types";
import { generateProfileOwnerKey, signProfileConsent, verifyProfileConsent } from "@/lib/consentProof";
import { createProfileIdentityAnchor } from "@/lib/profileIdentityTrust";
import { classifyProfileImportWithIdentityAnchor } from "@/lib/profileVerification";
import { encodeProfileShareBundle, encodeProfileShareTransport, encodeProfileV3 } from "@/lib/profileShareV3";
import { decodeSharedProfileTransfer, encodeSwitchProfileShareTransport } from "@/lib/profileSwitchShare";
import {
  commitProfileImportPlan, persistProfileIdentityAnchor, planSafeProfileImport,
  readProfileIdentityAnchorRegistry, PROFILE_IDENTITY_ANCHOR_STORAGE_KEY,
} from "@/lib/storeSecurity";
import { createQuotaSafeStorage } from "@/lib/persistStorage";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "archived-dom", verificationCode: "KS-7H3P-9Q2M-A4BC", name: "Riley", role: "Dominant",
    experienceLevel: "ervaren", customKinks: [], createdAt: 1, updatedAt: 2, origin: "own",
    entries: { rope_bondage_give: { status: "yes", comment: "Slowly" } }, ...overrides,
  };
}

async function seal(source: Profile) {
  const key = await generateProfileOwnerKey(source.id);
  const signed = await signProfileConsent(source, key);
  return { profile: { ...source, consentProof: signed.proof }, key: signed.ownerKey };
}

function setup() {
  const values = new Map<string, string>();
  let rejectProfileWrites = false;
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (rejectProfileWrites && key === "kink-profiles") throw new DOMException("full", "QuotaExceededError");
      values.set(key, value);
    },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(), key: () => null, length: 0,
  };
  const store = createStore(persist(() => ({
    profiles: [] as Profile[], profileOwnerKeys: [] as ProfileOwnerKey[],
    contracts: [{ id: "unchanged-agreement" }], scenes: [{ id: "unchanged-scene" }],
  }), {
    name: "kink-profiles", storage: createJSONStorage(() => createQuotaSafeStorage(() => storage, () => {})),
  }));
  const lock = { runExclusive: async <T>(operation: () => T) => operation() };
  return { store, storage, lock, rejectProfileWrites: () => { rejectProfileWrites = true; } };
}

async function anchorImported(imported: Profile[], target: ReturnType<typeof setup>) {
  for (const candidate of imported) {
    const verification = await verifyProfileConsent(candidate);
    expect(verification.status).toBe("valid");
    if (verification.status !== "valid") throw new Error("invalid fixture");
    const anchor = createProfileIdentityAnchor(candidate, verification.proof, 1234, "source-device-fingerprint");
    expect(await persistProfileIdentityAnchor(anchor, target.storage, target.lock)).toBe(true);
  }
}

describe("anchored shared profile restore", () => {
  it("restores a deleted signed shared version without changing its retained anchor or other state", async () => {
    const source = await seal(profile());
    const encoded = await encodeProfileV3(source.profile);
    const decoded = (await decodeSharedProfileTransfer(encoded)).profiles;
    const target = setup();
    await anchorImported(decoded, target);
    target.store.setState({ profiles: decoded });
    target.store.setState({ profiles: [] }); // deleting a shared record leaves its identity registry intact
    const anchorBefore = target.storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY);
    const otherState = target.store.getState();
    const incoming = (await decodeSharedProfileTransfer(encoded)).profiles;
    const anchors = readProfileIdentityAnchorRegistry(target.storage).anchors;
    expect(classifyProfileImportWithIdentityAnchor([], incoming[0], anchors).kind).toBe("anchored-restore");

    const plan = planSafeProfileImport(target.store.getState().profiles, incoming, 2000);
    expect(plan.acceptedCount).toBe(1);
    expect(commitProfileImportPlan(target.store, plan, target.storage)).toBe(true);
    const restored = target.store.getState().profiles[0];
    expect(restored).toMatchObject({ id: source.profile.id, origin: "shared", isImported: true, consentProof: source.profile.consentProof });
    expect(target.store.getState().profileOwnerKeys).toEqual([]);
    expect(target.store.getState().contracts).toBe(otherState.contracts);
    expect(target.store.getState().scenes).toBe(otherState.scenes);
    expect(target.storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)).toBe(anchorBefore);
    expect(JSON.parse(target.storage.getItem("kink-profiles")!).state.profiles).toEqual([restored]);
  });

  it("restores one deleted Switch perspective while retaining the other exact profile and local context", async () => {
    const dominant = await seal(profile({ personGroupId: "own-switch", perspective: "dominant" }));
    const submissive = await seal(profile({
      id: "archived-sub", verificationCode: "KS-8J4R-2T6W-B5CD", role: "Submissive",
      personGroupId: "own-switch", perspective: "submissive",
      entries: { rope_bondage_receive: { status: "maybe", comment: "Ask first" } },
    }));
    const transfer = await encodeSwitchProfileShareTransport(dominant.profile, submissive.profile, { ownerKeys: [dominant.key, submissive.key] });
    const decoded = (await decodeSharedProfileTransfer(transfer.encoded)).profiles;
    const target = setup();
    await anchorImported(decoded, target);
    const retained = { ...decoded[0], privateNote: "local context" };
    target.store.setState({ profiles: [retained, decoded[1]] });
    target.store.setState({ profiles: [retained] });
    const anchorBefore = target.storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY);
    const incoming = (await decodeSharedProfileTransfer(transfer.encoded)).profiles;
    const anchors = readProfileIdentityAnchorRegistry(target.storage).anchors;
    expect(incoming.map((candidate) => classifyProfileImportWithIdentityAnchor([retained], candidate, anchors).kind)).toEqual(["anchored-existing", "anchored-restore"]);

    const plan = planSafeProfileImport([retained], incoming, 2000);
    expect(plan.acceptedCount).toBe(2);
    expect(commitProfileImportPlan(target.store, plan, target.storage)).toBe(true);
    const restored = target.store.getState().profiles;
    expect(restored).toHaveLength(2);
    expect(restored[0]).toBe(retained);
    expect(restored[1]).toMatchObject({ id: submissive.profile.id, origin: "shared", isImported: true, entries: incoming[1].entries });
    expect(restored[1].entries.rope_bondage_give).toBeUndefined();
    expect(target.store.getState().profileOwnerKeys).toEqual([]);
    expect(target.storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)).toBe(anchorBefore);
  });

  it("keeps the retained anchor and deleted state when durable restore writing fails", async () => {
    const source = await seal(profile());
    const incoming = (await decodeSharedProfileTransfer(await encodeProfileV3(source.profile))).profiles;
    const target = setup();
    await anchorImported(incoming, target);
    target.store.setState({ profiles: [] });
    const anchorBefore = target.storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY);
    const anchors = readProfileIdentityAnchorRegistry(target.storage).anchors;
    expect(classifyProfileImportWithIdentityAnchor([], incoming[0], anchors).kind).toBe("anchored-restore");
    target.rejectProfileWrites();
    const plan = planSafeProfileImport([], incoming);
    expect(commitProfileImportPlan(target.store, plan, target.storage)).toBe(false);
    expect(target.store.getState().profiles).toEqual([]);
    expect(JSON.parse(target.storage.getItem("kink-profiles")!).state.profiles).toEqual([]);
    expect(target.storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)).toBe(anchorBefore);
  });

  it("rejects a tampered signed archive before it can become a restore candidate", async () => {
    const source = await seal(profile());
    const encoded = await encodeProfileV3(source.profile);
    const compressed = Buffer.from(encoded.slice(3), "base64url");
    const raw = encoded.startsWith("3d.") ? inflateSync(compressed) : compressed;
    const payload = JSON.parse(raw.toString());
    payload.n = "Substituted person";
    const tampered = "3r." + Buffer.from(JSON.stringify(payload)).toString("base64url");
    await expect(decodeSharedProfileTransfer(tampered)).rejects.toThrow();
  });

  it("rejects an otherwise valid signed replacement key for the deleted contact", async () => {
    const trusted = await seal(profile());
    const original = (await decodeSharedProfileTransfer(await encodeProfileV3(trusted.profile))).profiles;
    const target = setup();
    await anchorImported(original, target);
    const before = target.storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY);
    const replacement = await seal(profile());
    const incoming = (await decodeSharedProfileTransfer(await encodeProfileV3(replacement.profile))).profiles;
    expect((await verifyProfileConsent(incoming[0])).status).toBe("valid");
    const anchors = readProfileIdentityAnchorRegistry(target.storage).anchors;
    expect(classifyProfileImportWithIdentityAnchor([], incoming[0], anchors)).toMatchObject({ kind: "identity-conflict", reason: "key-id" });
    expect(target.store.getState().profiles).toEqual([]);
    expect(target.store.getState().profileOwnerKeys).toEqual([]);
    expect(target.storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)).toBe(before);
  });


  it("rejects a legacy v1 archive that copies a retained proof onto changed signed content", async () => {
    const source = await seal(profile());
    const legacy = Buffer.from(JSON.stringify({ ...source.profile, name: "Substituted person" })).toString("base64url");
    await expect(decodeSharedProfileTransfer(legacy)).rejects.toThrow();
  });

  it("retains compatibility with a valid signed legacy v1 archive", async () => {
    const source = await seal(profile({ avatarDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6l4P8AAAAASUVORK5CYII=" }));
    const legacy = Buffer.from(JSON.stringify(source.profile)).toString("base64url");
    const incoming = (await decodeSharedProfileTransfer(legacy)).profiles[0];
    expect((await verifyProfileConsent(incoming)).status).toBe("valid");
    expect(incoming.avatarDataUrl).toBeUndefined();
    const anchor = createProfileIdentityAnchor(source.profile, source.profile.consentProof, 1234, "source-device-fingerprint");
    expect(classifyProfileImportWithIdentityAnchor([], incoming, [anchor]).kind).toBe("anchored-restore");
  });


  it("rejects legacy signed-content substitution inside a valid avatar bundle", async () => {
    const source = await seal(profile({ avatarDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6l4P8AAAAASUVORK5CYII=" }));
    const transfer = await encodeProfileShareTransport(source.profile, { includeAvatar: true, profileOwnerKey: source.key });
    expect(transfer.avatarPayload).toBeDefined();
    const legacy = Buffer.from(JSON.stringify({ ...source.profile, name: "Substituted person" })).toString("base64url");
    const bundle = encodeProfileShareBundle(legacy, transfer.avatarPayload!);
    await expect(decodeSharedProfileTransfer(bundle)).rejects.toThrow();
  });

  it("rejects unauthenticated enrichment attached to a valid core proof in raw and bundled legacy transfers", async () => {
    const source = await seal(profile({ avatarDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6l4P8AAAAASUVORK5CYII=" }));
    const transfer = await encodeProfileShareTransport(source.profile, { includeAvatar: true, profileOwnerKey: source.key });
    const legacy = Buffer.from(JSON.stringify({ ...source.profile, bdsmtestUrl: "https://bdsmtest.org/r/forged", bdsmtestScores: [{ role: "Switch", pct: 99 }] })).toString("base64url");
    await expect(decodeSharedProfileTransfer(legacy)).rejects.toThrow("BDSMTest-openbaarmaking ontbreekt");
    await expect(decodeSharedProfileTransfer(encodeProfileShareBundle(legacy, transfer.avatarPayload!))).rejects.toThrow("BDSMTest-openbaarmaking ontbreekt");
  });

  it("keeps unsigned legacy core content readable while stripping unverified external enrichment", async () => {
    const source = profile({ bdsmtestUrl: "https://bdsmtest.org/r/unverified", bdsmtestScores: [{ role: "Switch", pct: 99 }] });
    const legacy = Buffer.from(JSON.stringify(source)).toString("base64url");
    const incoming = (await decodeSharedProfileTransfer(legacy)).profiles[0];
    expect(incoming).toMatchObject({ id: source.id, name: source.name, entries: source.entries });
    expect(incoming.bdsmtestUrl).toBeUndefined();
    expect(incoming.bdsmtestScores).toBeUndefined();
  });

});
