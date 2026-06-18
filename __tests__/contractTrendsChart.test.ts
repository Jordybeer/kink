import { describe, it, expect } from "vitest";
import type { ContractSnapshot } from "@/types";
import { prepareTrendData, TREND_SERIES } from "@/components/ContractTrendsChart";

const make = (id: string, date: number, counts: Partial<ContractSnapshot>): ContractSnapshot => ({
  id,
  date,
  profileAName: "Alice",
  profileBName: "Bob",
  matchCount: 0,
  discussCount: 0,
  softLimitCount: 0,
  hardLimitCount: 0,
  ...counts,
});

describe("prepareTrendData", () => {
  it("sorts contracts ascending by date regardless of input order", () => {
    const input: ContractSnapshot[] = [
      make("c", 3000, { matchCount: 30 }),
      make("a", 1000, { matchCount: 10 }),
      make("b", 2000, { matchCount: 20 }),
    ];
    const out = prepareTrendData(input);
    expect(out.ascending.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(out.series.matchCount).toEqual([10, 20, 30]);
  });

  it("projects all four series in the ascending order", () => {
    const input: ContractSnapshot[] = [
      make("1", 1000, { matchCount: 5, discussCount: 2, softLimitCount: 1, hardLimitCount: 0 }),
      make("2", 2000, { matchCount: 8, discussCount: 1, softLimitCount: 1, hardLimitCount: 1 }),
    ];
    const out = prepareTrendData(input);
    expect(out.series.matchCount).toEqual([5, 8]);
    expect(out.series.discussCount).toEqual([2, 1]);
    expect(out.series.softLimitCount).toEqual([1, 1]);
    expect(out.series.hardLimitCount).toEqual([0, 1]);
  });

  it("returns one label per contract in ascending order", () => {
    const input: ContractSnapshot[] = [
      make("1", new Date("2026-06-01").getTime(), {}),
      make("2", new Date("2026-06-17").getTime(), {}),
    ];
    const out = prepareTrendData(input);
    expect(out.labels).toHaveLength(2);
    expect(out.labels[0]).not.toEqual(out.labels[1]);
  });

  it("does not mutate the input array", () => {
    const input: ContractSnapshot[] = [
      make("b", 2000, {}),
      make("a", 1000, {}),
    ];
    const before = input.map((c) => c.id);
    prepareTrendData(input);
    expect(input.map((c) => c.id)).toEqual(before);
  });

  it("handles empty input safely", () => {
    const out = prepareTrendData([]);
    expect(out.ascending).toEqual([]);
    expect(out.labels).toEqual([]);
    expect(out.series.matchCount).toEqual([]);
    expect(out.series.discussCount).toEqual([]);
    expect(out.series.softLimitCount).toEqual([]);
    expect(out.series.hardLimitCount).toEqual([]);
  });
});

describe("TREND_SERIES contract", () => {
  it("declares four series mapped to ContractSnapshot count fields", () => {
    expect(TREND_SERIES.map((s) => s.key).sort()).toEqual(
      ["discussCount", "hardLimitCount", "matchCount", "softLimitCount"],
    );
  });

  it("each series declares a label and CSS var token", () => {
    for (const s of TREND_SERIES) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.cssVar.startsWith("--")).toBe(true);
    }
  });
});
