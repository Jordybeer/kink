import { describe, it, expect } from "vitest";
import { formatProfileMetadata } from "@/lib/profileMetadata";

describe("formatProfileMetadata", () => {
  it("all parts present", () => {
    expect(formatProfileMetadata({
      totalRated: 12,
      totalVisible: 100,
      customKinkCount: 3,
      topCategory: "BDSM",
      topCategoryHasRatings: true,
    })).toBe("12 van 100 beoordeeld · 3 eigen kinks · sterkste: BDSM");
  });

  it("omits custom kinks when zero", () => {
    expect(formatProfileMetadata({
      totalRated: 12,
      totalVisible: 100,
      customKinkCount: 0,
      topCategory: "BDSM",
      topCategoryHasRatings: true,
    })).toBe("12 van 100 beoordeeld · sterkste: BDSM");
  });

  it("omits top category when no ratings", () => {
    expect(formatProfileMetadata({
      totalRated: 12,
      totalVisible: 100,
      customKinkCount: 3,
      topCategory: "BDSM",
      topCategoryHasRatings: false,
    })).toBe("12 van 100 beoordeeld · 3 eigen kinks");
  });

  it("minimal case", () => {
    expect(formatProfileMetadata({
      totalRated: 0,
      totalVisible: 100,
      customKinkCount: 0,
      topCategory: "BDSM",
      topCategoryHasRatings: false,
    })).toBe("0 van 100 beoordeeld");
  });
});
