import { describe, it, expect } from "vitest";
import { kinkMatchScore, profileMatchScore } from "@/lib/matching";
import { KINKS } from "@/lib/kinks";
import type { KinkEntry, Profile } from "@/types";

function e(overrides: Partial<KinkEntry> = {}): KinkEntry {
  return { status: null, score: null, comment: "", ...overrides };
}

function makeProfile(entries: Record<string, Partial<KinkEntry>>): Profile {
  return {
    id: "test",
    name: "Test",
    origin: "local",
    isImported: false,
    kinks: [],
    customKinks: [],
    createdAt: 0,
    updatedAt: 0,
    entries: Object.fromEntries(
      Object.entries(entries).map(([k, v]) => [k, e(v)])
    ),
  } as unknown as Profile;
}

describe("kinkMatchScore — rubric rows", () => {
  it("yes + yes → perfect (95)", () => {
    expect(kinkMatchScore(e({ status: "yes" }), e({ status: "yes" }))).toEqual({ score: 95, kind: "perfect" });
  });

  it("yes + willing → strong (75)", () => {
    expect(kinkMatchScore(e({ status: "yes" }), e({ status: "willing" }))).toEqual({ score: 75, kind: "strong" });
  });

  it("willing + yes → strong (75)", () => {
    expect(kinkMatchScore(e({ status: "willing" }), e({ status: "yes" }))).toEqual({ score: 75, kind: "strong" });
  });

  it("willing + willing → soft (60)", () => {
    expect(kinkMatchScore(e({ status: "willing" }), e({ status: "willing" }))).toEqual({ score: 60, kind: "soft" });
  });

  it("maybe + yes → discuss (45)", () => {
    expect(kinkMatchScore(e({ status: "maybe" }), e({ status: "yes" }))).toEqual({ score: 45, kind: "discuss" });
  });

  it("maybe + willing → discuss (45)", () => {
    // willing+maybe no longer leaks into match — intentional v4 change
    expect(kinkMatchScore(e({ status: "maybe" }), e({ status: "willing" }))).toEqual({ score: 45, kind: "discuss" });
  });

  it("yes + maybe → discuss (45)", () => {
    expect(kinkMatchScore(e({ status: "yes" }), e({ status: "maybe" }))).toEqual({ score: 45, kind: "discuss" });
  });

  it("maybe + maybe → discuss (30)", () => {
    expect(kinkMatchScore(e({ status: "maybe" }), e({ status: "maybe" }))).toEqual({ score: 30, kind: "discuss" });
  });

  it("yes + no → discuss (10)", () => {
    expect(kinkMatchScore(e({ status: "yes" }), e({ status: "no" }))).toEqual({ score: 10, kind: "discuss" });
  });

  it("willing + no → discuss (10)", () => {
    expect(kinkMatchScore(e({ status: "willing" }), e({ status: "no" }))).toEqual({ score: 10, kind: "discuss" });
  });

  it("hard_no on status → limit (0)", () => {
    expect(kinkMatchScore(e({ status: "hard_no" }), e({ status: "yes" }))).toEqual({ score: 0, kind: "limit" });
  });

  it("hard_no on statusReceive → limit (0)", () => {
    expect(kinkMatchScore(e({ status: "yes" }), e({ statusReceive: "hard_no" }))).toEqual({ score: 0, kind: "limit" });
  });

  it("unrated A, rated B → none (0)", () => {
    expect(kinkMatchScore(e(), e({ status: "yes" }))).toEqual({ score: 0, kind: "none" });
  });

  it("both unrated → none (0)", () => {
    expect(kinkMatchScore(e(), e())).toEqual({ score: 0, kind: "none" });
  });
});

describe("kinkMatchScore — directional", () => {
  it("yes give / yes receive → perfect (100)", () => {
    expect(kinkMatchScore(
      e({ statusGive: "yes", direction: "give" }),
      e({ statusReceive: "yes", direction: "receive" })
    )).toEqual({ score: 100, kind: "perfect" });
  });

  it("yes give / willing receive → strong (85)", () => {
    expect(kinkMatchScore(
      e({ statusGive: "yes", direction: "give" }),
      e({ statusReceive: "willing", direction: "receive" })
    )).toEqual({ score: 85, kind: "strong" });
  });

  it("both want to give, neither receives → conflict (25)", () => {
    expect(kinkMatchScore(
      e({ statusGive: "yes", statusReceive: "no", direction: "give" }),
      e({ statusGive: "yes", statusReceive: "no", direction: "give" })
    )).toEqual({ score: 25, kind: "conflict" });
  });
});

describe("profileMatchScore", () => {
  const [k0, k1, k2, k3] = KINKS;

  it("one perfect + one limit → correct counts", () => {
    const a = makeProfile({ [k0.id]: { status: "yes" }, [k1.id]: { status: "hard_no" } });
    const b = makeProfile({ [k0.id]: { status: "yes" }, [k1.id]: { status: "yes" } });
    const { counts } = profileMatchScore(a, b);
    expect(counts.perfect).toBeGreaterThanOrEqual(1);
    expect(counts.limit).toBeGreaterThanOrEqual(1);
  });

  it("soft is distinct from discuss — willing+willing lands in soft bucket, not discuss", () => {
    const a = makeProfile({
      [k0.id]: { status: "yes" },
      [k1.id]: { status: "willing" },
      [k2.id]: { status: "maybe" },
    });
    const b = makeProfile({
      [k0.id]: { status: "yes" },
      [k1.id]: { status: "willing" },
      [k2.id]: { status: "yes" },
    });
    const { counts } = profileMatchScore(a, b);
    expect(counts.soft).toBeGreaterThanOrEqual(1);
    expect(counts.discuss).toBeGreaterThanOrEqual(1);
    // soft and discuss are separate — soft not folded into discuss
    expect(counts.soft).toBe(1);
  });

  it("four buckets are disjoint — rated counts sum to 4, none covers the rest", () => {
    const a = makeProfile({
      [k0.id]: { status: "yes" },
      [k1.id]: { status: "willing" },
      [k2.id]: { status: "maybe" },
      [k3.id]: { status: "hard_no" },
    });
    const b = makeProfile({
      [k0.id]: { status: "yes" },
      [k1.id]: { status: "willing" },
      [k2.id]: { status: "yes" },
      [k3.id]: { status: "yes" },
    });
    const { counts } = profileMatchScore(a, b);
    const ratedSum = (counts.perfect ?? 0) + (counts.strong ?? 0) +
      (counts.soft ?? 0) + (counts.discuss ?? 0) +
      (counts.conflict ?? 0) + (counts.limit ?? 0);
    expect(ratedSum).toBe(4);
    expect(ratedSum + (counts.none ?? 0)).toBe(KINKS.length);
  });
});
