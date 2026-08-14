import { describe, expect, it } from "vitest";
import { getClearOverlapPercent, planCompareStory } from "@/lib/compareCopy";
import type { CompareCategoryScore, CompareSummary } from "@/lib/compare";

function summary(overrides: Partial<CompareSummary> = {}): CompareSummary {
  return {
    shared: 27,
    complementary: 0,
    discuss: 9,
    soft: 3,
    conflict: 0,
    limit: 0,
    jointlyAssessed: 39,
    unpairedVisible: 233,
    reasons: [],
    match: 27,
    ...overrides,
  };
}

function category(overrides: Partial<CompareCategoryScore>): CompareCategoryScore {
  return {
    category: "bondage",
    jointlyAssessed: 0,
    shared: 0,
    complementary: 0,
    discuss: 0,
    soft: 0,
    conflict: 0,
    limit: 0,
    ...overrides,
  };
}

describe("compare narrative copy", () => {
  it("maakt een transparant overlappercentage uit alleen duidelijke overlap", () => {
    expect(getClearOverlapPercent(summary())).toBe(69);
    expect(getClearOverlapPercent(summary({ shared: 20, complementary: 5, jointlyAssessed: 40 }))).toBe(63);
    expect(getClearOverlapPercent(summary({ jointlyAssessed: 0 }))).toBeNull();
  });

  it("legt het percentage uit in natuurlijk Nederlands zonder technische stopwoorden", () => {
    const story = planCompareStory(summary());
    expect(story.overlapPercent).toBe(69);
    expect(story.lead).toContain("39 voorkeuren");
    expect(story.lead).toContain("27");
    expect(story.lead).toMatch(/overlap|gemeenschappelijke grond|interesse/i);
    expect(story.lead).not.toMatch(/[—–]/);
    expect(story.lead).not.toMatch(/punten|complementair|asymmetrie|sluiten er .* duidelijk aan/i);
    expect((story.lead.match(/jullie/gi) ?? []).length).toBeLessThanOrEqual(1);
    expect(story.coverage).toContain("233 andere");
  });

  it("splitst gedeelde interesse en geven plus ontvangen begrijpelijk uit", () => {
    const story = planCompareStory(summary({ shared: 24, complementary: 3, match: 27 }));
    expect(story.lead).toMatch(/24.*positieve interesse/i);
    expect(story.lead).toMatch(/3 andere.*geven en ontvangen/i);
  });

  it("houdt harde grenzen belangrijker dan gewone nuance", () => {
    const story = planCompareStory(summary({ conflict: 1, discuss: 5, jointlyAssessed: 36 }));
    expect(story.insights[0]).toMatch(/harde grens/i);
    expect(story.insights[0]).toMatch(/even samen over te praten/i);
  });

  it("laat andere harde grenzen niet verdwijnen wanneer er ook een conflict is", () => {
    const story = planCompareStory(summary({ conflict: 1, limit: 2, discuss: 5, jointlyAssessed: 39 }));
    expect(story.insights[0]).toMatch(/enthousiasme tegenover een harde grens/i);
    expect(story.insights[0]).toMatch(/2 andere voorkeuren/i);
  });

  it("beschrijft directionality als geven en ontvangen, niet als profielrol", () => {
    const story = planCompareStory(summary({ shared: 24, complementary: 3, match: 27 }));
    const copy = `${story.lead} ${story.insights.join(" ")}`;
    expect(copy).toMatch(/geven en ontvangen/i);
    expect(copy).not.toMatch(/rollen mooi|complementair/i);
  });

  it("noemt een categorie alleen wanneer verschillen er echt clusteren", () => {
    const categories = [
      category({ category: "bondage", jointlyAssessed: 8, discuss: 4, soft: 2, shared: 2 }),
      category({ category: "power", jointlyAssessed: 4, discuss: 1, shared: 3 }),
      category({ category: "impact", jointlyAssessed: 7, discuss: 1, shared: 6 }),
    ];
    const story = planCompareStory(summary({ discuss: 6, soft: 2 }), categories);
    const copy = story.insights.join(" ");
    expect(copy).toMatch(/Bondage/);
    expect(copy).not.toMatch(/daarbuiten|vaker op dezelfde lijn/i);
  });

  it("blijft voorzichtig wanneer er nog niets gezamenlijk beoordeeld is", () => {
    const story = planCompareStory(summary({
      shared: 0,
      complementary: 0,
      discuss: 0,
      soft: 0,
      jointlyAssessed: 0,
      unpairedVisible: 12,
      match: 0,
    }));
    expect(story.overlapPercent).toBeNull();
    expect(story.lead).toMatch(/te weinig gedeelde informatie/i);
    expect(story.coverage).toMatch(/12 voorkeuren/i);
  });
});
