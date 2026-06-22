import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/lib/store";

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe("saveProfileSnapshot", () => {
  it("returns null when the profile is unknown", () => {
    expect(useStore.getState().saveProfileSnapshot("ghost")).toBeNull();
    expect(useStore.getState().profileSnapshots).toEqual([]);
  });

  it("snapshots entries + customKinks + derived counts", () => {
    const id = useStore.getState().createProfile("Mira", "Sub");
    useStore.getState().setEntry(id, "spanking_hand", { status: "yes" });
    useStore.getState().setEntry(id, "flogging", { status: "willing" });
    useStore.getState().addCustomKink(id, "Eigen ding");
    const saved = useStore.getState().saveProfileSnapshot(id)!;
    expect(saved.profileId).toBe(id);
    expect(saved.counts.yes).toBe(1);
    expect(saved.counts.willing).toBe(1);
    expect(saved.customKinks.map((c) => c.name)).toContain("Eigen ding");
    expect(useStore.getState().profileSnapshots).toHaveLength(1);
  });

  it("caps snapshots at 30 per profile (FIFO)", () => {
    const id = useStore.getState().createProfile("Mira", "Sub");
    for (let i = 0; i < 35; i++) useStore.getState().saveProfileSnapshot(id);
    const mine = useStore.getState().profileSnapshots.filter((s) => s.profileId === id);
    expect(mine).toHaveLength(30);
  });

  it("does not evict other profiles' snapshots when capping", () => {
    const a = useStore.getState().createProfile("Mira", "Sub");
    const b = useStore.getState().createProfile("Sander", "Dom");
    for (let i = 0; i < 31; i++) useStore.getState().saveProfileSnapshot(a);
    useStore.getState().saveProfileSnapshot(b);
    const ofA = useStore.getState().profileSnapshots.filter((s) => s.profileId === a);
    const ofB = useStore.getState().profileSnapshots.filter((s) => s.profileId === b);
    expect(ofA).toHaveLength(30);
    expect(ofB).toHaveLength(1);
  });

  it("deleteProfileSnapshot removes the matching id", () => {
    const id = useStore.getState().createProfile("Mira", "Sub");
    const saved = useStore.getState().saveProfileSnapshot(id)!;
    useStore.getState().deleteProfileSnapshot(saved.id);
    expect(useStore.getState().profileSnapshots).toEqual([]);
  });
});

describe("createProfile", () => {
  it("sets origin to 'own' by default", () => {
    const id = useStore.getState().createProfile("Test", "Switch");
    const profile = useStore.getState().profiles.find((p) => p.id === id);
    expect(profile).toBeDefined();
    expect(profile!.origin).toBe("own");
  });

  it("sets experienceLevel to 'beginner' when omitted", () => {
    const id = useStore.getState().createProfile("Test", "Dom");
    const profile = useStore.getState().profiles.find((p) => p.id === id);
    expect(profile!.experienceLevel).toBe("beginner");
  });

  it("stores the given name and role", () => {
    const id = useStore.getState().createProfile("Saar", "Sub");
    const profile = useStore.getState().profiles.find((p) => p.id === id);
    expect(profile!.name).toBe("Saar");
    expect(profile!.role).toBe("Sub");
  });
});

describe("saveScene", () => {
  it("creates a new scene with generated id and timestamps", () => {
    const before = Date.now();
    const id = useStore.getState().saveScene({
      title: "Test Scene",
      profileAId: "a",
      profileBId: "b",
      profileAName: "Alice",
      profileBName: "Bob",
      items: [],
      status: "draft",
    });
    const scene = useStore.getState().scenes.find((s) => s.id === id);
    expect(scene).toBeDefined();
    expect(scene!.id).toBe(id);
    expect(scene!.createdAt).toBeGreaterThanOrEqual(before);
    expect(scene!.updatedAt).toBeGreaterThanOrEqual(before);
    expect(scene!.createdAt).toBe(scene!.updatedAt);
  });

  it("updates existing scene and only updates updatedAt", () => {
    const id = useStore.getState().saveScene({
      title: "Original",
      profileAId: "a",
      profileBId: "b",
      profileAName: "Alice",
      profileBName: "Bob",
      items: [],
      status: "draft",
    });
    const originalScene = useStore.getState().scenes.find((s) => s.id === id)!;
    const originalCreatedAt = originalScene.createdAt;
    const originalUpdatedAt = originalScene.updatedAt;

    // Wait a tick to ensure timestamp difference
    const before = Date.now();
    useStore.getState().saveScene({
      id,
      title: "Updated",
      profileAId: "a",
      profileBId: "b",
      profileAName: "Alice",
      profileBName: "Bob",
      items: [{ id: "item1", name: "Test", intensity: "midden", duration: "", note: "", fromKink: false }],
      status: "planned",
    });

    const updated = useStore.getState().scenes.find((s) => s.id === id)!;
    expect(updated.title).toBe("Updated");
    expect(updated.items).toHaveLength(1);
    expect(updated.createdAt).toBe(originalCreatedAt);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("enforces 50-scene cap", () => {
    // Add 51 scenes
    for (let i = 0; i < 51; i++) {
      useStore.getState().saveScene({
        title: `Scene ${i}`,
        profileAId: "a",
        profileBId: "b",
        profileAName: "Alice",
        profileBName: "Bob",
        items: [],
        status: "draft",
      });
    }
    expect(useStore.getState().scenes).toHaveLength(50);
  });
});

describe("deleteScene", () => {
  it("removes scene by id", () => {
    const id = useStore.getState().saveScene({
      title: "To Delete",
      profileAId: "a",
      profileBId: "b",
      profileAName: "Alice",
      profileBName: "Bob",
      items: [],
      status: "draft",
    });
    expect(useStore.getState().scenes.find((s) => s.id === id)).toBeDefined();
    useStore.getState().deleteScene(id);
    expect(useStore.getState().scenes.find((s) => s.id === id)).toBeUndefined();
  });
});

describe("completeScene", () => {
  it("marks scene as completed and sets aftercare", () => {
    const profileAId = useStore.getState().createProfile("Alice", "Dom");
    const profileBId = useStore.getState().createProfile("Bob", "Sub");
    const sceneId = useStore.getState().saveScene({
      title: "Test Scene",
      profileAId,
      profileBId,
      profileAName: "Alice",
      profileBName: "Bob",
      items: [
        { id: "i1", name: "Bondage", kinkId: "kink_001", intensity: "midden", duration: "", note: "", fromKink: true },
      ],
      status: "planned",
    });

    const aftercare = {
      completedAt: Date.now(),
      trafficLight: "green" as const,
      wentWell: "Great session",
      remember: "",
    };

    useStore.getState().completeScene(sceneId, aftercare);
    const scene = useStore.getState().scenes.find((s) => s.id === sceneId)!;
    expect(scene.status).toBe("completed");
    expect(scene.aftercare).toEqual(aftercare);
  });

  it("increments usedInScene for involved profiles only", () => {
    const profileAId = useStore.getState().createProfile("Alice", "Dom");
    const profileBId = useStore.getState().createProfile("Bob", "Sub");
    const profileCId = useStore.getState().createProfile("Charlie", "Switch");

    const kinkId = "kink_001";
    const sceneId = useStore.getState().saveScene({
      title: "Test Scene",
      profileAId,
      profileBId,
      profileAName: "Alice",
      profileBName: "Bob",
      items: [
        { id: "i1", name: "Bondage", kinkId, intensity: "midden", duration: "", note: "", fromKink: true },
      ],
      status: "planned",
    });

    useStore.getState().completeScene(sceneId, {
      completedAt: Date.now(),
      trafficLight: "green",
      wentWell: "",
      remember: "",
    });

    const profileA = useStore.getState().profiles.find((p) => p.id === profileAId)!;
    const profileB = useStore.getState().profiles.find((p) => p.id === profileBId)!;
    const profileC = useStore.getState().profiles.find((p) => p.id === profileCId)!;

    expect(profileA.entries[kinkId]?.usedInScene).toBe(1);
    expect(profileB.entries[kinkId]?.usedInScene).toBe(1);
    expect(profileC.entries[kinkId]?.usedInScene).toBeUndefined();
  });

  it("updates updatedAt timestamp", () => {
    const profileAId = useStore.getState().createProfile("Alice", "Dom");
    const profileBId = useStore.getState().createProfile("Bob", "Sub");
    const sceneId = useStore.getState().saveScene({
      title: "Test Scene",
      profileAId,
      profileBId,
      profileAName: "Alice",
      profileBName: "Bob",
      items: [],
      status: "planned",
    });

    const originalScene = useStore.getState().scenes.find((s) => s.id === sceneId)!;
    const before = Date.now();

    useStore.getState().completeScene(sceneId, {
      completedAt: Date.now(),
      trafficLight: "green",
      wentWell: "",
      remember: "",
    });

    const updated = useStore.getState().scenes.find((s) => s.id === sceneId)!;
    expect(updated.updatedAt).toBeGreaterThanOrEqual(before);
  });
});

describe("v10 migration", () => {
  it("store has scenes field initialized", () => {
    // When state is loaded (even on a fresh store), scenes should be an empty array
    const state = useStore.getInitialState();
    expect(state).toHaveProperty("scenes");
    expect(Array.isArray(state.scenes)).toBe(true);
  });
});
