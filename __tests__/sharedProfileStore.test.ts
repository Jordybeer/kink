import { beforeEach, describe, expect, it } from "vitest";
import type { Profile, SceneRecord } from "@/types";
import { useStore } from "@/lib/store";
import { generateProfileOwnerKey, signProfileConsent } from "@/lib/consentProof";

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
    const aRaw = sharedProfile({ id: "a", name: "A", verificationCode: "KS-7H3P-9Q2M-A4BC", origin: "own", isImported: false });
    const bRaw = sharedProfile({ id: "b", name: "B", verificationCode: "KS-8J4R-5T6V-W7XY", origin: "own", isImported: false });
    const aKey = await generateProfileOwnerKey(aRaw.id);
    const bKey = await generateProfileOwnerKey(bRaw.id);
    const aSigned = await signProfileConsent(aRaw, aKey);
    const bSigned = await signProfileConsent(bRaw, bKey);
    const a = { ...aRaw, consentProof: aSigned.proof, origin: "shared" as const, isImported: true };
    const b = { ...bRaw, consentProof: bSigned.proof, origin: "shared" as const, isImported: true };
    const scene: SceneRecord = {
      id: "shared-only-scene",
      title: "Shared only",
      profileAId: a.id,
      profileBId: b.id,
      profileAName: a.name,
      profileBName: b.name,
      items: [{ id: "one", name: "Rope", intensity: "midden", duration: "10 min", note: "", fromKink: false }],
      status: "planned",
      createdAt: 1,
      updatedAt: 1,
    };
    useStore.setState({ profiles: [a, b], scenes: [scene], profileOwnerKeys: [] });

    const result = await useStore.getState().lockSceneConsent(scene.id);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("eigen toestel");
    expect(useStore.getState().scenes[0].consentSnapshots).toBeUndefined();
  });
});
