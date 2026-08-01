import { describe, it, expect } from "vitest";
import { isKinkMatch, isHardLimit, isConflict, kinkMatchScore } from "@/lib/matching";
import type { KinkEntry } from "@/types";

function e(overrides: Partial<KinkEntry> = {}): KinkEntry {
  return { status: null, score: null, comment: "", ...overrides };
}

describe("isKinkMatch", () => {
  it("legacy: both yes/willing = match", () => {
    expect(isKinkMatch(e({ status: "yes" }), e({ status: "willing" }))).toBe(true);
  });

  it("legacy: one no = no match", () => {
    expect(isKinkMatch(e({ status: "yes" }), e({ status: "no" }))).toBe(false);
  });

  it("does not infer a match from a private response", () => {
    expect(isKinkMatch(
      e({ status: "yes", privateResponse: true }),
      e({ status: "yes" }),
    )).toBe(false);
    expect(kinkMatchScore(
      e({ status: "yes", privateResponse: true }),
      e({ status: "yes" }),
    ).kind).toBe("none");
  });
});

describe("isHardLimit", () => {
  it("detects hard_no on status", () => {
    expect(isHardLimit(e({ status: "hard_no" }), e({ status: "yes" }))).toBe(true);
  });

  it("returns false when no hard_no", () => {
    expect(isHardLimit(e({ status: "yes" }), e({ status: "no" }))).toBe(false);
  });

  it("does not expose a private hard limit", () => {
    expect(isHardLimit(e({ status: "hard_no", privateResponse: true }), e({ status: "yes" }))).toBe(false);
  });
});

describe("isConflict", () => {
  it("hard_no is not a conflict", () => {
    expect(isConflict(e({ status: "hard_no" }), e({ status: "yes" }))).toBe(false);
  });

  it("match is not a conflict", () => {
    expect(isConflict(e({ status: "yes" }), e({ status: "willing" }))).toBe(false);
  });

  it("one yes, one no = conflict", () => {
    expect(isConflict(e({ status: "yes" }), e({ status: "no" }))).toBe(true);
  });

  it("unrated entry is not a conflict", () => {
    expect(isConflict(e({ status: "yes" }), e())).toBe(false);
  });

  it("a private disagreement is not exposed as a conflict", () => {
    expect(isConflict(e({ status: "yes", privateResponse: true }), e({ status: "no" }))).toBe(false);
  });

  it("willing + willing is a soft limit, not a conflict", () => {
    // willing+willing → kind "soft", must not show as conflict in the compare page row display
    expect(isConflict(e({ status: "willing" }), e({ status: "willing" }))).toBe(false);
  });
});
