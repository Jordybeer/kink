import { describe, it, expect } from "vitest";
import { parseLocalDate } from "@/lib/dates";

describe("parseLocalDate", () => {
  it("keeps the given year/month/day in local time regardless of TZ", () => {
    const d = parseLocalDate("2026-06-17");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5); // 0-indexed: June
    expect(d.getDate()).toBe(17);
  });

  it("does not shift a day backwards the way `new Date(str)` can in negative-UTC zones", () => {
    const viaUtcParse = new Date("2026-06-17").getUTCDate();
    expect(parseLocalDate("2026-06-17").getDate()).toBe(viaUtcParse);
  });
});
