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

  it("cross-direction: A gives (yes) + B receives (willing) = match", () => {
    expect(isKinkMatch(
      e({ statusGive: "yes", direction: "give" }),
      e({ statusReceive: "willing", direction: "receive" })
    )).toBe(true);
  });

  it("cross-direction: B gives (yes) + A receives (yes) = match", () => {
    expect(isKinkMatch(
      e({ statusReceive: "yes", direction: "receive" }),
      e({ statusGive: "yes", direction: "give" })
    )).toBe(true);
  });

  it("cross-direction: A gives (yes) + B receives (no) = no match", () => {
    expect(isKinkMatch(
      e({ statusGive: "yes", direction: "give" }),
      e({ statusReceive: "no", direction: "receive" })
    )).toBe(false);
  });

  it("cross-direction: falls back to status when direction-specific status absent", () => {
    expect(isKinkMatch(
      e({ status: "yes", direction: "give" }),
      e({ status: "willing", direction: "receive" })
    )).toBe(true);
  });
});

describe("isHardLimit", () => {
  it("detects hard_no on status", () => {
    expect(isHardLimit(e({ status: "hard_no" }), e({ status: "yes" }))).toBe(true);
  });

  it("detects hard_no on statusGive", () => {
    expect(isHardLimit(e({ statusGive: "hard_no" }), e({ status: "yes" }))).toBe(true);
  });

  it("detects hard_no on statusReceive", () => {
    expect(isHardLimit(e({ status: "yes" }), e({ statusReceive: "hard_no" }))).toBe(true);
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

describe("nieuwsgierig", () => {
  it("nieuwsgierig + yes is a match (strong)", () => {
    expect(isKinkMatch(e({ status: "nieuwsgierig" }), e({ status: "yes" }))).toBe(true);
  });

  it("nieuwsgierig + maybe is not a strong/perfect match", () => {
    expect(isKinkMatch(e({ status: "nieuwsgierig" }), e({ status: "maybe" }))).toBe(false);
  });

  it("nieuwsgierig pair is not a hard limit", () => {
    expect(isHardLimit(e({ status: "nieuwsgierig" }), e({ status: "nieuwsgierig" }))).toBe(false);
  });

  it("nieuwsgierig + nieuwsgierig surfaces as conversation worth having", () => {
    // both curious, neither tried — lands in discuss bucket → isConflict true
    expect(isConflict(e({ status: "nieuwsgierig" }), e({ status: "nieuwsgierig" }))).toBe(true);
  });

  it("nieuwsgierig vs hard_no = hard limit, not conflict", () => {
    expect(isHardLimit(e({ status: "nieuwsgierig" }), e({ status: "hard_no" }))).toBe(true);
    expect(isConflict(e({ status: "nieuwsgierig" }), e({ status: "hard_no" }))).toBe(false);
  });
});
