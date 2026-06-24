import { describe, it, expect } from "vitest";
import { isKinkMatch, isHardLimit, isConflict } from "@/lib/matching";
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

});

describe("isHardLimit", () => {
  it("detects hard_no on status", () => {
    expect(isHardLimit(e({ status: "hard_no" }), e({ status: "yes" }))).toBe(true);
  });

  it("returns false when no hard_no", () => {
    expect(isHardLimit(e({ status: "yes" }), e({ status: "no" }))).toBe(false);
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

  it("willing + willing is a soft limit, not a conflict", () => {
    // willing+willing → kind "soft", must not show as conflict in the compare page row display
    expect(isConflict(e({ status: "willing" }), e({ status: "willing" }))).toBe(false);
  });
});

