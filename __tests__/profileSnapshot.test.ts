import { describe, it, expect } from "vitest";
import {
  PROFILE_TREND_SERIES,
  deriveCounts,
  diffSnapshotEntries,
  prepareProfileTrendData,
} from "@/lib/profileSnapshot";
import type { KinkEntry, ProfileSnapshot } from "@/types";

function snap(date: number, counts: Partial<ProfileSnapshot["counts"]>): ProfileSnapshot {
  return {
    id: String(date),
    profileId: "p1",
    date,
    entries: {},
    customKinks: [],
    counts: { yes: 0, willing: 0, maybe: 0, no: 0, hard_no: 0, ...counts },
  };
}

describe("deriveCounts", () => {
  it("counts direct statuses", () => {
    const entries: Record<string, KinkEntry> = {
      a: { status: "yes", comment: "" },
      b: { status: "yes", comment: "" },
      c: { status: "maybe", comment: "" },
      d: { status: "hard_no", comment: "" },
      e: { status: null, comment: "" },
    };
    expect(deriveCounts(entries)).toEqual({ yes: 2, willing: 0, maybe: 1, no: 0, hard_no: 1 });
  });

});

describe("prepareProfileTrendData", () => {
  it("sorts snapshots ascending by date", () => {
    const out = prepareProfileTrendData([
      snap(300, { yes: 3 }),
      snap(100, { yes: 1 }),
      snap(200, { yes: 2 }),
    ]);
    expect(out.series.yes).toEqual([1, 2, 3]);
    expect(out.ascending.map((s) => s.date)).toEqual([100, 200, 300]);
  });

  it("projects all five series in label order", () => {
    const out = prepareProfileTrendData([
      snap(100, { yes: 1, willing: 2, maybe: 3, no: 4, hard_no: 5 }),
      snap(200, { yes: 6, willing: 7, maybe: 8, no: 9, hard_no: 10 }),
    ]);
    expect(out.series.yes).toEqual([1, 6]);
    expect(out.series.willing).toEqual([2, 7]);
    expect(out.series.maybe).toEqual([3, 8]);
    expect(out.series.no).toEqual([4, 9]);
    expect(out.series.hard_no).toEqual([5, 10]);
  });

  it("returns one label per snapshot", () => {
    const out = prepareProfileTrendData([snap(100, {}), snap(200, {}), snap(300, {})]);
    expect(out.labels).toHaveLength(3);
  });

  it("does not mutate input", () => {
    const input = [snap(300, { yes: 3 }), snap(100, { yes: 1 })];
    const snapshot = input.map((s) => s.date);
    prepareProfileTrendData(input);
    expect(input.map((s) => s.date)).toEqual(snapshot);
  });

  it("handles empty input safely", () => {
    const out = prepareProfileTrendData([]);
    expect(out.labels).toEqual([]);
    expect(out.series.yes).toEqual([]);
    expect(out.ascending).toEqual([]);
  });
});

describe("PROFILE_TREND_SERIES", () => {
  it("declares all five status series with CSS vars", () => {
    expect(PROFILE_TREND_SERIES.map((s) => s.key)).toEqual([
      "yes", "willing", "maybe", "no", "hard_no",
    ]);
    for (const s of PROFILE_TREND_SERIES) {
      expect(s.cssVar.startsWith("--")).toBe(true);
      expect(s.label.length).toBeGreaterThan(0);
    }
  });
});

describe("diffSnapshotEntries", () => {
  const e = (status: "yes" | "willing" | "maybe" | "no" | "hard_no" | null) =>
    ({ status, comment: "" });

  it("names exactly the kinks whose verdict moved", () => {
    const older = { flogging: e("maybe"), caning: e("hard_no"), paddling: e("yes") };
    const newer = { flogging: e("yes"), caning: e("hard_no"), paddling: e("yes") };
    expect(diffSnapshotEntries(older, newer)).toEqual([
      { kinkId: "flogging", from: "maybe", to: "yes" },
    ]);
  });

  it("fresh verdicts lead, withdrawals trail, keenest destination first", () => {
    const older = { a_old: e("yes"), b_changed: e("no") };
    const newer = { b_changed: e("willing"), c_new: e("maybe"), d_new: e("yes") };
    expect(diffSnapshotEntries(older, newer).map((s) => s.kinkId)).toEqual([
      "d_new", "c_new", "b_changed", "a_old",
    ]);
  });

  it("identical moments confess nothing", () => {
    const same = { flogging: e("yes") };
    expect(diffSnapshotEntries(same, { ...same })).toEqual([]);
  });

  it("a nulled status counts as withdrawn, not changed", () => {
    const shifts = diffSnapshotEntries({ flogging: e("yes") }, { flogging: e(null) });
    expect(shifts).toEqual([{ kinkId: "flogging", from: "yes", to: null }]);
  });
});
