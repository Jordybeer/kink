import { describe, it, expect } from "vitest";
import { formatProfileMetadata } from "@/lib/profileMetadata";

describe("formatProfileMetadata", () => {
  it("all parts present", () => {
    expect(formatProfileMetadata({
      customKinkCount: 3,
      topCategory: "BDSM",
      topCategoryHasRatings: true,
    })).toBe("3 eigen kinks · sterkste: BDSM");
  });

  it("omits custom kinks when zero", () => {
    expect(formatProfileMetadata({
      customKinkCount: 0,
      topCategory: "BDSM",
      topCategoryHasRatings: true,
    })).toBe("sterkste: BDSM");
  });

  it("omits top category when no ratings", () => {
    expect(formatProfileMetadata({
      customKinkCount: 3,
      topCategory: "BDSM",
      topCategoryHasRatings: false,
    })).toBe("3 eigen kinks");
  });

  it("returns empty string when nothing to show", () => {
    expect(formatProfileMetadata({
      customKinkCount: 0,
      topCategory: "BDSM",
      topCategoryHasRatings: false,
    })).toBe("");
  });
});
