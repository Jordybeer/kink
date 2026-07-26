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

describe("intensity ordering (juli 2026 uitbreiding)", () => {
  it("every category listing climbs from beginner to diepgaand", () => {
    for (const cat of CATEGORIES) {
      const levels = getKinksByCategoryAndLevel(cat, 4).map((k) => k.level);
      const sorted = [...levels].sort((a, b) => a - b);
      expect(levels).toEqual(sorted);
    }
  });

  it("the new temptations joined the catalogue", () => {
    const ids = new Set(KINKS.map((k) => k.id));
    for (const id of [
      "rimmen", "dirty_talk", "free_use", "keyholding", "predicament_bondage",
      "primal_play", "glory_hole", "figging", "body_slapping", "trio_groepsseks",
    ]) {
      expect(ids.has(id), `missing kink: ${id}`).toBe(true);
    }
    expect(KINKS.length).toBeGreaterThanOrEqual(242);
  });

  it("straf corrigeert, rituelen trainen — the two new houses stand", () => {
    expect(CATEGORIES).toContain("Straf & Correctie");
    expect(CATEGORIES).toContain("Rituelen & Training");
    // the umbrella entries moved into their new homes, ids intact
    expect(KINKS.find((k) => k.id === "punishment")?.category).toBe("Straf & Correctie");
    expect(KINKS.find((k) => k.id === "collaring")?.category).toBe("Rituelen & Training");
    expect(getKinksByCategoryAndLevel("Straf & Correctie", 4).length).toBeGreaterThanOrEqual(15);
    expect(getKinksByCategoryAndLevel("Rituelen & Training", 4).length).toBeGreaterThanOrEqual(16);
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
