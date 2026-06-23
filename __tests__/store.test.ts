import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/lib/store";
import type { Profile } from "@/types";

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

  it("deleteProfile evicts that profile's snapshots but leaves others alone", () => {
    const a = useStore.getState().createProfile("Mira", "Sub");
    const b = useStore.getState().createProfile("Sander", "Dom");
    useStore.getState().saveProfileSnapshot(a);
    useStore.getState().saveProfileSnapshot(a);
    useStore.getState().saveProfileSnapshot(b);
    useStore.getState().deleteProfile(a);
    const snaps = useStore.getState().profileSnapshots;
    expect(snaps.filter((s) => s.profileId === a)).toHaveLength(0);
    expect(snaps.filter((s) => s.profileId === b)).toHaveLength(1);
  });
});

describe("importProfiles", () => {
  it("adds novel profiles to the store", () => {
    const before = useStore.getState().profiles.length;
    useStore.getState().importProfiles([
      {
        id: "imported-1",
        name: "Partner",
        role: "Dom",
        experienceLevel: "beginner",
        customKinks: [],
        entries: {},
        createdAt: 1000,
        updatedAt: 1000,
        isImported: true,
        origin: "shared",
        lockedAt: 1000,
      } as unknown as Profile,
    ]);
    expect(useStore.getState().profiles.length).toBe(before + 1);
  });

  it("skips profiles whose id already exists (deduplication)", () => {
    const id = useStore.getState().createProfile("Mira", "Sub");
    const countBefore = useStore.getState().profiles.length;
    useStore.getState().importProfiles([
      {
        id,
        name: "Duplicate",
        role: "Dom",
        experienceLevel: "beginner",
        customKinks: [],
        entries: {},
        createdAt: 1000,
        updatedAt: 1000,
        isImported: true,
        origin: "shared",
        lockedAt: 1000,
      } as unknown as Profile,
    ]);
    expect(useStore.getState().profiles.length).toBe(countBefore);
  });

  it("is a no-op for an empty incoming array", () => {
    useStore.getState().createProfile("Mira", "Sub");
    const countBefore = useStore.getState().profiles.length;
    useStore.getState().importProfiles([]);
    expect(useStore.getState().profiles.length).toBe(countBefore);
  });

  it("adds only novel profiles when the list is mixed (some new, some duplicates)", () => {
    const existingId = useStore.getState().createProfile("Mira", "Sub");
    const countBefore = useStore.getState().profiles.length;
    useStore.getState().importProfiles([
      {
        id: existingId,
        name: "Dupe",
        role: "Dom",
        experienceLevel: "beginner",
        customKinks: [],
        entries: {},
        createdAt: 1000,
        updatedAt: 1000,
        isImported: true,
        origin: "shared",
        lockedAt: 1000,
      } as unknown as Profile,
      {
        id: "brand-new-uuid",
        name: "Sander",
        role: "Switch",
        experienceLevel: "gevorderd",
        customKinks: [],
        entries: {},
        createdAt: 2000,
        updatedAt: 2000,
        isImported: true,
        origin: "shared",
        lockedAt: 2000,
      } as unknown as Profile,
    ]);
    expect(useStore.getState().profiles.length).toBe(countBefore + 1);
    expect(useStore.getState().profiles.find((p) => p.id === "brand-new-uuid")).toBeDefined();
  });
});

describe("saveProfileSnapshot — additional edge cases", () => {
  it("each snapshot gets a unique id", () => {
    const id = useStore.getState().createProfile("Mira", "Sub");
    useStore.getState().saveProfileSnapshot(id);
    useStore.getState().saveProfileSnapshot(id);
    const snaps = useStore.getState().profileSnapshots.filter((s) => s.profileId === id);
    expect(snaps[0].id).not.toBe(snaps[1].id);
  });

  it("counts reflect the entries at save time, not later mutations", () => {
    const id = useStore.getState().createProfile("Mira", "Sub");
    useStore.getState().setEntry(id, "spanking_hand", { status: "yes" });
    const snap = useStore.getState().saveProfileSnapshot(id)!;
    const countAtSave = snap.counts.yes;
    // Mutate AFTER the snapshot
    useStore.getState().setEntry(id, "flogging", { status: "yes" });
    // The persisted snapshot.counts should remain unchanged
    const persisted = useStore.getState().profileSnapshots.find((s) => s.id === snap.id)!;
    expect(persisted.counts.yes).toBe(countAtSave);
  });

  it("snapshot profileId always matches the requested profile", () => {
    const a = useStore.getState().createProfile("Mira", "Sub");
    const b = useStore.getState().createProfile("Sander", "Dom");
    useStore.getState().saveProfileSnapshot(a);
    useStore.getState().saveProfileSnapshot(b);
    const allSnaps = useStore.getState().profileSnapshots;
    expect(allSnaps.every((s) => s.profileId === a || s.profileId === b)).toBe(true);
    expect(allSnaps.filter((s) => s.profileId === a)).toHaveLength(1);
    expect(allSnaps.filter((s) => s.profileId === b)).toHaveLength(1);
  });

  it("deleteProfileSnapshot is a no-op for unknown id", () => {
    const id = useStore.getState().createProfile("Mira", "Sub");
    useStore.getState().saveProfileSnapshot(id);
    const countBefore = useStore.getState().profileSnapshots.length;
    useStore.getState().deleteProfileSnapshot("does-not-exist");
    expect(useStore.getState().profileSnapshots.length).toBe(countBefore);
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
