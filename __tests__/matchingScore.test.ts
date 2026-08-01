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

  it("yes + willing → strong (80)", () => {
    expect(kinkMatchScore(e({ status: "yes" }), e({ status: "willing" }))).toEqual({ score: 80, kind: "strong" });
  });

  it("willing + yes → strong (80)", () => {
    expect(kinkMatchScore(e({ status: "willing" }), e({ status: "yes" }))).toEqual({ score: 80, kind: "strong" });
  });

  it("willing + willing → soft (65)", () => {
    expect(kinkMatchScore(e({ status: "willing" }), e({ status: "willing" }))).toEqual({ score: 65, kind: "soft" });
  });

  it("maybe + yes → soft (50)", () => {
    expect(kinkMatchScore(e({ status: "maybe" }), e({ status: "yes" }))).toEqual({ score: 50, kind: "soft" });
  });

  it("maybe + willing → soft (45)", () => {
    expect(kinkMatchScore(e({ status: "maybe" }), e({ status: "willing" }))).toEqual({ score: 45, kind: "soft" });
  });

  it("yes + maybe → soft (50)", () => {
    expect(kinkMatchScore(e({ status: "yes" }), e({ status: "maybe" }))).toEqual({ score: 50, kind: "soft" });
  });

  it("maybe + maybe → soft (30)", () => {
    expect(kinkMatchScore(e({ status: "maybe" }), e({ status: "maybe" }))).toEqual({ score: 30, kind: "soft" });
  });

  it("yes + no → discuss (55) — voor hen scores positively", () => {
    expect(kinkMatchScore(e({ status: "yes" }), e({ status: "no" }))).toEqual({ score: 55, kind: "discuss" });
  });

  it("willing + no → discuss (40)", () => {
    expect(kinkMatchScore(e({ status: "willing" }), e({ status: "no" }))).toEqual({ score: 40, kind: "discuss" });
  });

  it("hard_no on status → limit (0)", () => {
    expect(kinkMatchScore(e({ status: "hard_no" }), e({ status: "yes" }))).toEqual({ score: 0, kind: "limit" });
  });

  it("one-sided hard_no stays visible as a limit", () => {
    expect(kinkMatchScore(e({ status: "hard_no" }), e())).toEqual({ score: 0, kind: "limit" });
  });

  it("unrated A, rated B → none (0)", () => {
    expect(kinkMatchScore(e(), e({ status: "yes" }))).toEqual({ score: 0, kind: "none" });
  });

  it("both unrated → none (0)", () => {
    expect(kinkMatchScore(e(), e())).toEqual({ score: 0, kind: "none" });
  });
});


describe("kinkMatchScore — symmetric voor-hen cases (PR v5 rubric)", () => {
  it("no + yes → discuss (55) — symmetric of yes+no", () => {
    expect(kinkMatchScore(e({ status: "no" }), e({ status: "yes" }))).toEqual({ score: 55, kind: "discuss" });
  });

  it("no + willing → discuss (40) — symmetric of willing+no", () => {
    expect(kinkMatchScore(e({ status: "no" }), e({ status: "willing" }))).toEqual({ score: 40, kind: "discuss" });
  });

  it("maybe + no → discuss (20)", () => {
    expect(kinkMatchScore(e({ status: "maybe" }), e({ status: "no" }))).toEqual({ score: 20, kind: "discuss" });
  });

  it("no + maybe → discuss (20) — symmetric", () => {
    expect(kinkMatchScore(e({ status: "no" }), e({ status: "maybe" }))).toEqual({ score: 20, kind: "discuss" });
  });

  it("no + no → conflict (15)", () => {
    expect(kinkMatchScore(e({ status: "no" }), e({ status: "no" }))).toEqual({ score: 15, kind: "conflict" });
  });

  it("willing + maybe → soft (45) — symmetric of maybe+willing", () => {
    expect(kinkMatchScore(e({ status: "willing" }), e({ status: "maybe" }))).toEqual({ score: 45, kind: "soft" });
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

  it("normalizes a perfect joint rating to 100%", () => {
    const a = makeProfile({ [k0.id]: { status: "yes" } });
    const b = makeProfile({ [k0.id]: { status: "yes" } });
    const result = profileMatchScore(a, b);
    expect(result.overall).toBe(100);
    expect(result.comparedTotal).toBe(1);
  });

  it("uses weighted compatibility instead of direct-match share", () => {
    const a = makeProfile({
      [k0.id]: { status: "yes" },
      [k1.id]: { status: "willing" },
    });
    const b = makeProfile({
      [k0.id]: { status: "yes" },
      [k1.id]: { status: "willing" },
    });
    const result = profileMatchScore(a, b);
    expect(result.comparedTotal).toBe(2);
    expect(result.overall).toBe(84);
  });

  it("keeps an unknown hard limit visible without lowering compatibility", () => {
    const a = makeProfile({
      [k0.id]: { status: "yes" },
      [k1.id]: { status: "hard_no" },
    });
    const b = makeProfile({ [k0.id]: { status: "yes" } });
    const result = profileMatchScore(a, b);
    expect(result.counts.limit).toBe(1);
    expect(result.unscoredLimits).toBe(1);
    expect(result.comparedTotal).toBe(1);
    expect(result.overall).toBe(100);
  });

  it("lets a jointly rated hard limit lower compatibility", () => {
    const a = makeProfile({
      [k0.id]: { status: "yes" },
      [k1.id]: { status: "hard_no" },
    });
    const b = makeProfile({
      [k0.id]: { status: "yes" },
      [k1.id]: { status: "yes" },
    });
    const result = profileMatchScore(a, b);
    expect(result.unscoredLimits).toBe(0);
    expect(result.comparedTotal).toBe(2);
    expect(result.overall).toBe(50);
  });

  it("ignores ordinary one-sided answers in the percentage", () => {
    const a = makeProfile({
      [k0.id]: { status: "yes" },
      [k1.id]: { status: "yes" },
    });
    const b = makeProfile({ [k0.id]: { status: "yes" } });
    const result = profileMatchScore(a, b);
    expect(result.comparedTotal).toBe(1);
    expect(result.overall).toBe(100);
    expect(result.counts.none).toBe(KINKS.length - 1);
  });

  it("soft is distinct from discuss — willing+willing is soft, maybe+no is discuss", () => {
    const a = makeProfile({
      [k0.id]: { status: "yes" },
      [k1.id]: { status: "willing" },
      [k2.id]: { status: "maybe" },
    });
    const b = makeProfile({
      [k0.id]: { status: "yes" },
      [k1.id]: { status: "willing" },
      [k2.id]: { status: "no" },
    });
    const { counts } = profileMatchScore(a, b);
    expect(counts.soft).toBeGreaterThanOrEqual(1);
    expect(counts.discuss).toBeGreaterThanOrEqual(1);
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
