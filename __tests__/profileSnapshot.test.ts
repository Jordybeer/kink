import { describe, it, expect } from "vitest";
import {
  PROFILE_TREND_SERIES,
  deriveCounts,
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

  it("respects direction give/receive overrides", () => {
    const entries: Record<string, KinkEntry> = {
      a: { status: "maybe", statusGive: "yes", direction: "give", comment: "" },
      b: { status: "maybe", statusReceive: "willing", direction: "receive", comment: "" },
    };
    expect(deriveCounts(entries)).toEqual({ yes: 1, willing: 1, maybe: 0, no: 0, hard_no: 0 });
  });

  it("picks the strictest side for direction=both (matches session reveal scan)", () => {
    // Scan order is hard_no → no → maybe → yes → willing; first matching side wins.
    const entries: Record<string, KinkEntry> = {
      a: { status: "yes", statusGive: "yes", statusReceive: "hard_no", direction: "both", comment: "" },
      b: { status: "yes", statusGive: "willing", statusReceive: "yes", direction: "both", comment: "" },
    };
    expect(deriveCounts(entries)).toEqual({ yes: 1, willing: 0, maybe: 0, no: 0, hard_no: 1 });
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

describe("deriveCounts — additional edge cases", () => {
  it("returns all zeros for an empty entries object", () => {
    expect(deriveCounts({})).toEqual({ yes: 0, willing: 0, maybe: 0, no: 0, hard_no: 0 });
  });

  it("falls back to status when direction=give but statusGive is undefined", () => {
    const entries: Record<string, KinkEntry> = {
      a: { status: "willing", direction: "give", comment: "" },
    };
    expect(deriveCounts(entries)).toEqual({ yes: 0, willing: 1, maybe: 0, no: 0, hard_no: 0 });
  });

  it("falls back to status when direction=receive but statusReceive is undefined", () => {
    const entries: Record<string, KinkEntry> = {
      a: { status: "maybe", direction: "receive", comment: "" },
    };
    expect(deriveCounts(entries)).toEqual({ yes: 0, willing: 0, maybe: 1, no: 0, hard_no: 0 });
  });

  it("falls back to status when direction=both and neither directional status is set", () => {
    const entries: Record<string, KinkEntry> = {
      a: { status: "yes", direction: "both", comment: "" },
    };
    expect(deriveCounts(entries)).toEqual({ yes: 1, willing: 0, maybe: 0, no: 0, hard_no: 0 });
  });

  it("correctly counts all five statuses appearing together", () => {
    const entries: Record<string, KinkEntry> = {
      a: { status: "yes",     comment: "" },
      b: { status: "willing", comment: "" },
      c: { status: "maybe",   comment: "" },
      d: { status: "no",      comment: "" },
      e: { status: "hard_no", comment: "" },
    };
    expect(deriveCounts(entries)).toEqual({ yes: 1, willing: 1, maybe: 1, no: 1, hard_no: 1 });
  });

  it("skips entries with null status and no direction override", () => {
    const entries: Record<string, KinkEntry> = {
      a: { status: null,  comment: "" },
      b: { status: "yes", comment: "" },
    };
    expect(deriveCounts(entries).yes).toBe(1);
    const total = Object.values(deriveCounts(entries)).reduce((s, n) => s + n, 0);
    expect(total).toBe(1);
  });
});

describe("prepareProfileTrendData — additional edge cases", () => {
  it("each series array has the same length as labels", () => {
    const out = prepareProfileTrendData([
      snap(100, { yes: 1 }),
      snap(200, { yes: 2 }),
      snap(300, { yes: 3 }),
    ]);
    const labelLen = out.labels.length;
    for (const key of ["yes", "willing", "maybe", "no", "hard_no"] as const) {
      expect(out.series[key]).toHaveLength(labelLen);
    }
  });

  it("works correctly with a single snapshot", () => {
    const out = prepareProfileTrendData([snap(1000, { yes: 5, hard_no: 2 })]);
    expect(out.labels).toHaveLength(1);
    expect(out.series.yes).toEqual([5]);
    expect(out.series.hard_no).toEqual([2]);
    expect(out.ascending).toHaveLength(1);
  });

  it("labels are strings (formatted dates)", () => {
    const out = prepareProfileTrendData([snap(0, {}), snap(86_400_000, {})]);
    for (const label of out.labels) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
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
