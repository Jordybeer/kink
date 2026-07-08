import { describe, expect, it } from "vitest";
import { STATUS_HINT, STATUS_LABEL, STATUS_ORDER, STATUS_VAR } from "@/lib/statusLabels";

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
});
