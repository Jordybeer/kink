import { beforeEach, describe, expect, it } from "vitest";
import type { Profile, SceneRecord } from "@/types";
import { useStore } from "@/lib/store";
import {
  generateProfileOwnerKey,
  signProfileConsent,
  verifyProfileConsent,
} from "@/lib/consentProof";
import { verifySceneConsentRecord } from "@/lib/sceneConsentVerification";

function sharedProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "shared-profile",
    verificationCode: "KS-7H3P-9Q2M-A4BC",
    name: "Partner",
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [{ id: "custom-one", name: "Rope ritual" }],
    createdAt: 1,
    updatedAt: 2,
    entries: {
      rope: { status: "yes", comment: "rustig" },
    },
    origin: "shared",
    isImported: true,
    lockedAt: 2,
    ...overrides,
  };
}

function ownProfile(id: string, name: string, code: string, updatedAt = 2): Profile {
  return sharedProfile({
    id,
    name,
    verificationCode: code,
    updatedAt,
    origin: "own",
    isImported: false,
    lockedAt: undefined,
  });
}

function sceneFor(a: Profile, b: Profile, id = "scene-own"): SceneRecord {
  return {
    id,
    title: "Rope",
    profileAId: a.id,
    profileBId: b.id,
    profileAName: a.name,
    profileBName: b.name,
    items: [{ id: "one", name: "Rope", intensity: "midden", duration: "10 min", note: "rustig", fromKink: false }],
    safeword: "rood",
    status: "planned",
    createdAt: 1,
    updatedAt: 1,
  };
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe("shared profile store locks", () => {
  it("blocks consent and identity mutations below the UI", () => {
    const original = sharedProfile();
    useStore.setState({ profiles: [original] });
    const store = useStore.getState();

    store.renameProfile(original.id, "Changed", "Dom", "beginner");
    store.setBdsmtestScores(original.id, [{ role: "Dominant", pct: 99 }]);
    store.setEntry(original.id, "rope", { status: "hard_no", comment: "changed" });
    store.resetEntry(original.id, "rope");
    store.addCustomKink(original.id, "Injected");
    store.removeCustomKink(original.id, "custom-one");

    const after = useStore.getState().profiles[0];
    expect(after.name).toBe("Partner");
    expect(after.role).toBe("Switch");
    expect(after.bdsmtestScores).toBeUndefined();
    expect(after.entries.rope).toEqual(original.entries.rope);
    expect(after.customKinks).toEqual(original.customKinks);
    expect(useStore.getState().profileSnapshots).toEqual([]);
  });

  it("still allows local-only note and avatar metadata", () => {
    const original = sharedProfile();
    useStore.setState({ profiles: [original] });

    useStore.getState().updatePrivateNote(original.id, "Alleen op dit toestel");
    useStore.getState().setProfileAvatar(original.id, "data:image/png;base64,abc");

    const after = useStore.getState().profiles[0];
    expect(after.privateNote).toBe("Alleen op dit toestel");
    expect(after.avatarDataUrl).toBe("data:image/png;base64,abc");
  });

  it("does not overwrite a scene after consent was locked", () => {
    const locked: SceneRecord = {
      id: "locked-scene",
      title: "Original",
      profileAId: "a",
      profileBId: "b",
      profileAName: "A",
      profileBName: "B",
      items: [{ id: "one", name: "Rope", intensity: "midden", duration: "10 min", note: "", fromKink: false }],
      safeword: "rood",
      status: "planned",
      createdAt: 1,
      updatedAt: 1,
      consentLockedAt: 2,
    };
    useStore.setState({ scenes: [locked] });

    useStore.getState().saveScene({
      id: locked.id,
      title: "Changed",
      profileAId: "a",
      profileBId: "b",
      profileAName: "A",
      profileBName: "B",
      items: [],
      safeword: "groen",
      status: "draft",
    });

    expect(useStore.getState().scenes[0]).toEqual(locked);
  });

  it("cannot claim an exact scene agreement when neither owner key is local", async () => {
    const aRaw = ownProfile("a", "A", "KS-7H3P-9Q2M-A4BC");
    const bRaw = ownProfile("b", "B", "KS-8J4R-5T6V-W7XY");
    const aKey = await generateProfileOwnerKey(aRaw.id);
    const bKey = await generateProfileOwnerKey(bRaw.id);
    const aSigned = await signProfileConsent(aRaw, aKey);
    const bSigned = await signProfileConsent(bRaw, bKey);
    const a = { ...aRaw, consentProof: aSigned.proof, origin: "shared" as const, isImported: true };
    const b = { ...bRaw, consentProof: bSigned.proof, origin: "shared" as const, isImported: true };
    const scene = sceneFor(a, b, "shared-only-scene");
    useStore.setState({ profiles: [a, b], scenes: [scene], profileOwnerKeys: [] });

    const result = await useStore.getState().lockSceneConsent(scene.id);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("eigen toestel");
    expect(useStore.getState().scenes[0].consentSnapshots).toBeUndefined();
  });

  it("restores a newer own backup over an existing own profile but never downgrades it", async () => {
    const existing = ownProfile("owner", "Old local", "KS-7H3P-9Q2M-A4BC", 10);
    const newer = ownProfile("owner", "From newer backup", "KS-7H3P-9Q2M-A4BC", 20);
    const older = ownProfile("owner", "From older backup", "KS-7H3P-9Q2M-A4BC", 5);
    const key = await generateProfileOwnerKey(existing.id);
    useStore.setState({ profiles: [existing] });

    const first = useStore.getState().restoreBackupProfiles([newer], [key]);
    expect(first.updated).toBe(1);
    expect(useStore.getState().profiles[0].name).toBe("From newer backup");

    const second = useStore.getState().restoreBackupProfiles([older], [key]);
    expect(second.updated).toBe(0);
    expect(useStore.getState().profiles[0].name).toBe("From newer backup");
  });

  it("never replaces an established source with a newer timestamp from another key", async () => {
    const raw = ownProfile("owner", "Local source", "KS-7H3P-9Q2M-A4BC", 10);
    const localKey = await generateProfileOwnerKey(raw.id);
    const localSigned = await signProfileConsent(raw, localKey);
    const existing = { ...raw, consentProof: localSigned.proof };

    const foreignKey = await generateProfileOwnerKey(raw.id);
    const foreignRaw = ownProfile(raw.id, "Forged newer backup", raw.verificationCode!, 999);
    const foreignSigned = await signProfileConsent(foreignRaw, foreignKey);
    const incoming = { ...foreignRaw, consentProof: foreignSigned.proof };

    useStore.setState({ profiles: [existing], profileOwnerKeys: [localSigned.ownerKey] });
    const result = useStore.getState().restoreBackupProfiles([incoming], [foreignSigned.ownerKey]);

    expect(result.conflicts).toBe(1);
    expect(useStore.getState().profiles[0].name).toBe("Local source");
    expect(useStore.getState().profileOwnerKeys).toEqual([localSigned.ownerKey]);
  });

  it("serializes simultaneous seals and keeps one stable owner key", async () => {
    const profile = ownProfile("owner", "Owner", "KS-7H3P-9Q2M-A4BC");
    useStore.setState({ profiles: [profile] });

    const [first, second] = await Promise.all([
      useStore.getState().sealProfileConsent(profile.id),
      useStore.getState().sealProfileConsent(profile.id),
    ]);

    expect(first?.consentProof?.keyId).toBe(second?.consentProof?.keyId);
    expect(useStore.getState().profileOwnerKeys).toHaveLength(1);
    expect((await verifyProfileConsent(useStore.getState().profiles[0])).status).toBe("valid");
  });

  it("uses profile A deterministically when both local profiles can lock the scene", async () => {
    const a = ownProfile("a", "A", "KS-7H3P-9Q2M-A4BC");
    const b = ownProfile("b", "B", "KS-8J4R-5T6V-W7XY");
    const scene = sceneFor(a, b);
    useStore.setState({ profiles: [a, b], scenes: [scene] });

    const result = await useStore.getState().lockSceneConsent(scene.id);
    const locked = useStore.getState().scenes[0];

    expect(result.ok).toBe(true);
    expect(locked.consentLedger?.[0].profileId).toBe(a.id);
    expect((await verifySceneConsentRecord(locked)).status).toBe("valid");
  });

  it("serializes concurrent appends without forking the ledger", async () => {
    const a = ownProfile("a", "A", "KS-7H3P-9Q2M-A4BC");
    const b = ownProfile("b", "B", "KS-8J4R-5T6V-W7XY");
    const scene = sceneFor(a, b, "append-scene");
    useStore.setState({ profiles: [a, b], scenes: [scene] });
    expect((await useStore.getState().lockSceneConsent(scene.id)).ok).toBe(true);

    const results = await Promise.all([
      useStore.getState().appendSceneConsentEvent(scene.id, a.id, "withdrawn", "stop"),
      useStore.getState().appendSceneConsentEvent(scene.id, a.id, "withdrawn", "nogmaals stop"),
    ]);

    const updated = useStore.getState().scenes[0];
    expect(results.every((result) => result.ok)).toBe(true);
    expect(updated.consentLedger).toHaveLength(3);
    expect((await verifySceneConsentRecord(updated)).status).toBe("valid");
  });
});
