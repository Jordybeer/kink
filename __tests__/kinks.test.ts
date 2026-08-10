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
import { LEGACY_COMPACT_KINK_IDS_V2 } from "@/lib/legacyCompactCatalog";

const RELEASE_A_IDS = [
  "remote_toy",
  "nude_photography",
  "adult_content_creation",
  "mutual_masturbation",
  "partner_masturbation_watch",
  "thigh_focus",
  "muscle_focus",
  "pregnancy_attraction",
  "smeared_makeup",
  "crying_tears",
  "vampire_fangs",
  "erotic_massage",
  "vibration_play",
  "sound_deprivation",
  "wetlook",
  "prostate_massage",
  "sex_machine",
  "drool_play",
  "being_heard",
  "play_party",
  "next_day_check_in",
  "aftercare_cleanup",
  "dollification",
  "pet_training",
  "pet_grooming",
  "diaper_wetting",
  "diaper_messing",
  "diaper_changing",
  "breeding_fantasy",
  "creampie",
] as const;

const DIRECTIONAL_RELEASE_IDS = ["pegging_give", "pegging_receive"] as const;

const RETIRED_COMPOSITE_OR_DUPLICATE_IDS = [
  "filmen_prive",
  "trampling_voeten",
  "breeding_creampie",
  "luiers_gebruik",
  "deepthroat",
  "pegging",
] as const;

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

  it("keeps every user-facing category populated", () => {
    expect(CATEGORIES.filter((category) => getKinksByCategory(category).length === 0)).toEqual([]);
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

  it("lands Release A plus explicit pegging directionality without deciding auto-masturbation", () => {
    const ids = new Set(KINKS.map((kink) => kink.id));
    expect(RELEASE_A_IDS.filter((id) => !ids.has(id))).toEqual([]);
    expect(DIRECTIONAL_RELEASE_IDS.filter((id) => !ids.has(id))).toEqual([]);
    expect(KINKS).toHaveLength(292);

    expect(ids.has("pegging")).toBe(false);
    expect([...ids].some((id) => id.includes("auto_masturb"))).toBe(false);
  });

  it("retires composite or duplicate questions instead of copying their answer meaning", () => {
    const ids = new Set(KINKS.map((kink) => kink.id));
    expect(RETIRED_COMPOSITE_OR_DUPLICATE_IDS.filter((id) => ids.has(id))).toEqual([]);
    expect(ids.has("breeding_fantasy")).toBe(true);
    expect(ids.has("creampie")).toBe(true);
    expect(ids.has("diaper_wetting")).toBe(true);
    expect(ids.has("diaper_messing")).toBe(true);
    expect(ids.has("diaper_changing")).toBe(true);
  });

  it("changes the historical catalog only through the reviewed retire/add sets", () => {
    const activeIds = new Set(KINKS.map((kink) => kink.id));
    const historicalIds = new Set<string>(LEGACY_COMPACT_KINK_IDS_V2);
    const retired = [...historicalIds].filter((id) => !activeIds.has(id)).sort();
    const added = [...activeIds].filter((id) => !historicalIds.has(id)).sort();

    expect(retired).toEqual([...RETIRED_COMPOSITE_OR_DUPLICATE_IDS].sort());
    expect(added).toEqual([...RELEASE_A_IDS, ...DIRECTIONAL_RELEASE_IDS].sort());
  });

  it("separates definitions from a conservative safety note where reviewed", () => {
    const safetyReviewedIds = [
      "bullwhip", "gag_opblaasbaar", "gag_rubber", "borsten_afbinden", "gasmasker",
      "suspension_rechtop", "suspension_ondersteboven", "suspension_horizontaal",
      "opsluiting_kooi", "opsluiting_donker", "opsluiting_kleine_ruimte", "vacuumbed",
      "forced_orgasm", "facesitting", "badkamer_controle", "dienen_asbak", "lifestyle_247",
      "free_use", "erotische_hypnose", "toestemmingsprotocol", "punishment",
      "strafoefeningen", "mondzeep", "somnofilie", "choking", "scarification",
      "naaldjes_borst_buik", "naaldjes_intiem", "artistiek_snijden", "powerbox_basis",
      "powerbox_intiem", "dogging", "recording", "webcam", "remote_toy_publiek",
      "petplay_kooi", "urine_intiem", "plas_desperation", "bloed_play",
      "katheters_urethral", "klysma_reiniging", "klysma_straf", "penisring_cockring",
      "rubber_latex_kleding", "korset_middelafname", "luiers_dragen", "adult_content_creation",
      "crying_tears", "sound_deprivation", "prostate_massage", "sex_machine",
      "play_party", "diaper_messing", "breeding_fantasy", "creampie",
    ];
    const byId = new Map(KINKS.map((kink) => [kink.id, kink]));
    expect(safetyReviewedIds.filter((id) => !byId.get(id)?.safetyNote?.trim())).toEqual([]);
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
