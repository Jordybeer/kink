import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "@/lib/store";

// Verloop feeds itself: the first meaningful change of a profile's day
// leaves a moment behind automatically. One per 24h, never for no-ops,
// and a manual save holds the door like any other fresh moment.

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-12T10:00:00Z"));
  useStore.setState(useStore.getInitialState());
});

afterEach(() => {
  vi.useRealTimers();
});

function snapshotsOf(profileId: string) {
  return useStore.getState().profileSnapshots.filter((s) => s.profileId === profileId);
}

describe("auto-snapshots", () => {
  it("the first rating of the day leaves a moment behind", () => {
    const id = useStore.getState().createProfile("Mira", "Sub");
    useStore.getState().setEntry(id, "spanking_hand", { status: "yes" });
    expect(snapshotsOf(id)).toHaveLength(1);
    expect(snapshotsOf(id)[0].entries.spanking_hand.status).toBe("yes");
  });

  it("a second change the same day does not stack another", () => {
    const id = useStore.getState().createProfile("Mira", "Sub");
    useStore.getState().setEntry(id, "spanking_hand", { status: "yes" });
    useStore.getState().setEntry(id, "flogging", { status: "willing" });
    useStore.getState().addCustomKink(id, "Eigen ding");
    expect(snapshotsOf(id)).toHaveLength(1);
  });

  it("25 hours later the next change earns a fresh moment", () => {
    const id = useStore.getState().createProfile("Mira", "Sub");
    useStore.getState().setEntry(id, "spanking_hand", { status: "yes" });
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    useStore.getState().setEntry(id, "flogging", { status: "maybe" });
    expect(snapshotsOf(id)).toHaveLength(2);
    // newest first: yesterday's moment lacks flogging, today's has it
    expect(snapshotsOf(id)[0].entries.flogging.status).toBe("maybe");
    expect(snapshotsOf(id)[1].entries.flogging).toBeUndefined();
  });

  it("a day-old identical state is not immortalised (no-op guard)", () => {
    const id = useStore.getState().createProfile("Mira", "Sub");
    useStore.getState().setEntry(id, "spanking_hand", { status: "yes" });
    vi.advanceTimersByTime(2 * DAY);
    // resetEntry on a key that was never set — state ends up identical
    useStore.getState().resetEntry(id, "never_rated");
    expect(snapshotsOf(id)).toHaveLength(1);
  });

  it("a manual save suppresses auto for the next 24h", () => {
    const id = useStore.getState().createProfile("Mira", "Sub");
    useStore.getState().saveProfileSnapshot(id);
    useStore.getState().setEntry(id, "spanking_hand", { status: "yes" });
    expect(snapshotsOf(id)).toHaveLength(1); // still only the manual one
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    useStore.getState().setEntry(id, "flogging", { status: "no" });
    expect(snapshotsOf(id)).toHaveLength(2);
  });

  it("completing a scene leaves a moment for both partners", () => {
    const a = useStore.getState().createProfile("Mira", "Sub");
    const b = useStore.getState().createProfile("Sander", "Dom");
    // burn today's auto-moment budget deliberately, then move a day ahead
    const sceneId = useStore.getState().saveScene({
      title: "Avond", profileAId: a, profileBId: b, profileAName: "Mira", profileBName: "Sander",
      items: [{ id: "i1", name: "Spanking", intensity: "zacht", duration: "10m", note: "", fromKink: true, kinkId: "spanking_hand" }],
      status: "planned",
    });
    useStore.getState().completeScene(sceneId, {
      trafficLight: "green", wentWell: "", remember: "", completedAt: Date.now(),
    });
    expect(snapshotsOf(a)).toHaveLength(1);
    expect(snapshotsOf(b)).toHaveLength(1);
    expect(snapshotsOf(a)[0].entries.spanking_hand.usedInScene).toBe(1);
  });

  it("respects the 30-cap: a month of dailies never overflows", () => {
    const id = useStore.getState().createProfile("Mira", "Sub");
    for (let day = 0; day < 40; day++) {
      useStore.getState().setEntry(id, "spanking_hand", { desire: day % 6 });
      vi.advanceTimersByTime(DAY + 60_000);
    }
    expect(snapshotsOf(id)).toHaveLength(30);
  });

  it("does nothing for unknown profiles", () => {
    useStore.getState().setEntry("ghost", "spanking_hand", { status: "yes" });
    expect(useStore.getState().profileSnapshots).toHaveLength(0);
  });
});
