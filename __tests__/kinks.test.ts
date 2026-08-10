import { describe, it, expect } from "vitest";
import {
  KINKS,
  CATEGORIES,
  KINK_CATEGORY_DEFINITIONS,
  LEVEL_MAX,
  getKinksByCategory,
  getKinksByCategoryAndLevel,
  kinkCategoryLabel,
} from "@/lib/kinks";
import { kinkCategorySearchTerms } from "@/lib/kinkCategories";

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

  it("keeps canonical names unique after normalization", () => {
    const normalizedNames = KINKS.map((kink) => kink.name
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ""));
    expect(new Set(normalizedNames).size).toBe(normalizedNames.length);
  });

  it("gives every active kink an explanation", () => {
    expect(KINKS.filter((kink) => !kink.description?.trim())).toHaveLength(0);
  });

  it("keeps stable category ids separate from unique display labels", () => {
    expect(KINK_CATEGORY_DEFINITIONS.map(({ id }) => id)).toEqual(CATEGORIES);
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length);
    expect(new Set(KINK_CATEGORY_DEFINITIONS.map(({ label }) => label)).size)
      .toBe(KINK_CATEGORY_DEFINITIONS.length);
    expect(CATEGORIES.every((category) => kinkCategoryLabel(category).length > 0)).toBe(true);
    expect(KINK_CATEGORY_DEFINITIONS.every(({ aliases }) => aliases.length > 0)).toBe(true);
    expect(kinkCategorySearchTerms("aftercare")).toContain("Nazorg");
  });

  it("keeps aliases non-empty and distinct from their canonical name", () => {
    for (const kink of KINKS) {
      const aliases = kink.aliases ?? [];
      expect(aliases.every((alias) => alias.trim().length > 0)).toBe(true);
      const normalized = [kink.name, ...aliases].map((value) => value.trim().toLowerCase());
      expect(new Set(normalized).size).toBe(normalized.length);
    }
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
    expect(CATEGORIES).toContain("discipline");
    expect(CATEGORIES).toContain("rituals");
    expect(kinkCategoryLabel("discipline")).toBe("Discipline & Correction");
    expect(kinkCategoryLabel("rituals")).toBe("Rituals & Protocols");
    // the umbrella entries moved into their new homes, ids intact
    expect(KINKS.find((k) => k.id === "punishment")?.category).toBe("discipline");
    expect(KINKS.find((k) => k.id === "collaring")?.category).toBe("rituals");
    expect(getKinksByCategoryAndLevel("discipline", 4).length).toBeGreaterThanOrEqual(15);
    expect(getKinksByCategoryAndLevel("rituals", 4).length).toBeGreaterThanOrEqual(16);
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
