import { describe, expect, it } from "vitest";
import { STATUS_HINT, STATUS_LABEL, STATUS_ORDER, STATUS_VAR, statusPairRank } from "@/lib/statusLabels";

// Guards the one house vocabulary — eight hand-copied maps once let
// hard_no drift between "Grens" and "Harde grens". Never again.
describe("statusLabels", () => {
  it("covers all five verdicts exactly once, in the canonical order", () => {
    expect(STATUS_ORDER).toEqual(["yes", "willing", "maybe", "no", "hard_no"]);
    for (const s of STATUS_ORDER) {
      expect(STATUS_LABEL[s]).toBeTruthy();
      expect(STATUS_HINT[s]).toBeTruthy();
      expect(STATUS_VAR[s]).toMatch(/^var\(--[a-z-]+\)$/);
    }
  });

  it("names a limit unambiguously — a hard limit is always 'Harde grens'", () => {
    expect(STATUS_LABEL.hard_no).toBe("Harde grens");
  });

  it("ranks status pairs by eagerness — keenest verdict leads, partner breaks ties", () => {
    // Heel graag + Heel graag tops everything
    expect(statusPairRank("yes", "yes")).toBeLessThan(statusPairRank("yes", "willing"));
    // The keenest side wins before the tiebreak: Heel graag + Voor hen > Ja + Ja
    expect(statusPairRank("yes", "no")).toBeLessThan(statusPairRank("willing", "willing"));
    // Order of arguments is irrelevant — a pair is a pair
    expect(statusPairRank("maybe", "yes")).toBe(statusPairRank("yes", "maybe"));
    // An unrated side sorts below every rated verdict at the same lead
    expect(statusPairRank("yes", "hard_no")).toBeLessThan(statusPairRank("yes", null));
    // Full ladder holds: yes > willing > maybe > no > hard_no as the lead verdict
    const ladder = STATUS_ORDER.map((s) => statusPairRank(s, s));
    expect([...ladder].sort((a, b) => a - b)).toEqual(ladder);
  });
});
