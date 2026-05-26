import { describe, it, expect } from "vitest";
import {
  KINKS,
  CATEGORIES,
  LEVEL_MAX,
  getKinksByCategory,
  getKinksByCategoryAndLevel,
} from "@/lib/kinks";

describe("kink database integrity", () => {
  it("every kink has a unique id", () => {
    const ids = KINKS.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every kink has a level between 1 and 4", () => {
    const bad = KINKS.filter((k) => k.level < 1 || k.level > 4);
    expect(bad).toHaveLength(0);
  });

  it("every kink belongs to a known category", () => {
    const catSet = new Set(CATEGORIES);
    const bad = KINKS.filter((k) => !catSet.has(k.category));
    expect(bad).toHaveLength(0);
  });
});

describe("getKinksByCategory", () => {
  it("returns only kinks from the requested category", () => {
    const cat = CATEGORIES[0];
    const result = getKinksByCategory(cat);
    expect(result.every((k) => k.category === cat)).toBe(true);
  });

  it("returns empty array for unknown category", () => {
    expect(getKinksByCategory("Unicorn Grooming")).toHaveLength(0);
  });
});

describe("getKinksByCategoryAndLevel", () => {
  it("filters out kinks above maxLevel", () => {
    const cat = CATEGORIES[0];
    const result = getKinksByCategoryAndLevel(cat, 1);
    expect(result.every((k) => k.level <= 1)).toBe(true);
  });

  it("includes all levels when maxLevel is 4", () => {
    const cat = CATEGORIES[0];
    const all = getKinksByCategory(cat);
    const filtered = getKinksByCategoryAndLevel(cat, 4);
    expect(filtered).toHaveLength(all.length);
  });
});

describe("LEVEL_MAX", () => {
  it("maps all four experience levels", () => {
    expect(LEVEL_MAX.beginner).toBe(1);
    expect(LEVEL_MAX.gevorderd).toBe(2);
    expect(LEVEL_MAX.ervaren).toBe(3);
    expect(LEVEL_MAX.diepgaand).toBe(4);
  });
});
