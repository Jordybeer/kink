import { describe, it, expect } from "vitest";
import { formatProfileHeader } from "@/lib/profileHeader";

describe("formatProfileHeader", () => {
  it("returns name alone when no role", () => {
    expect(formatProfileHeader("Lily")).toBe("Lily");
    expect(formatProfileHeader("Lily", "")).toBe("Lily");
    expect(formatProfileHeader("Lily", undefined)).toBe("Lily");
  });

  it("returns name — role with em-dash when role present", () => {
    expect(formatProfileHeader("Lily", "Dominant")).toBe("Lily — Dominant");
    expect(formatProfileHeader("Alex", "Switch")).toBe("Alex — Switch");
  });

  it("never produces a trailing em-dash", () => {
    const result = formatProfileHeader("Lily", "");
    expect(result).not.toContain("—");
  });
});
