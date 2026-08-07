import { describe, expect, it } from "vitest";
import { backupFileSizeAllowed } from "@/lib/importLimits";

describe("untrusted import limits", () => {
  it("rejects an oversized backup before FileReader allocates it", () => {
    expect(backupFileSizeAllowed(10 * 1024 * 1024)).toBe(true);
    expect(backupFileSizeAllowed(10 * 1024 * 1024 + 1)).toBe(false);
  });
});
