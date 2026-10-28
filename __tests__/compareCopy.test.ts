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
  it("houdt het overlappercentage beschikbaar als intern transparant feit", () => {
    expect(getClearOverlapPercent(summary())).toBe(69);
    expect(getClearOverlapPercent(summary({ shared: 20, complementary: 5, jointlyAssessed: 40 }))).toBe(63);
    expect(getClearOverlapPercent(summary({ jointlyAssessed: 0 }))).toBeNull();
  });

  it.each([
    ["very-overlapping", { shared: 34, discuss: 3, soft: 2, jointlyAssessed: 39 }],
    ["overlapping", {}],
    ["discuss-heavy", { shared: 12, discuss: 16, soft: 3, jointlyAssessed: 31 }],
    ["different", { shared: 7, discuss: 5, soft: 11, jointlyAssessed: 23 }],
    ["mixed", { shared: 12, discuss: 7, soft: 5, conflict: 1, jointlyAssessed: 25 }],
    ["low-coverage", { shared: 3, discuss: 1, soft: 1, jointlyAssessed: 5 }],
  ] as const)("houdt %s intern beschikbaar en beschrijft alleen het zichtbare aantal", (kind, overrides) => {
    const input = summary(overrides);
    const story = planCompareStory(input);
    expect(story.kind).toBe(kind);
    expect(story.lead).toBe(`Jullie hebben allebei een zichtbaar antwoord bij ${input.jointlyAssessed} onderwerpen.`);
    expect(story.lead).not.toMatch(/golflengte|één lijn|compatib|goed gesprek|anders over|ontdekken|%/i);
  });

  it("onderscheidt geen gezamenlijke antwoorden van gedeeltelijk ingevulde profielen", () => {
    const story = planCompareStory(summary({
      shared: 0, complementary: 0, discuss: 0, soft: 0, conflict: 0, limit: 0,
      jointlyAssessed: 0, unpairedVisible: 12, match: 0,
    }));
    expect(story.lead).toBe("Er zijn nog geen onderwerpen met een zichtbaar antwoord van jullie allebei.");
    expect(story.coverage).toBe("Bij 12 andere onderwerpen ontbreekt nog één zichtbaar antwoord.");
    expect(story.overlapCount).toBe(0);
    expect(story.overlapPercent).toBeNull();
    expect(story.insights).toEqual([]);
  });

  it("laat bij volledig lege profielen geen extra dekkingszin achter", () => {
    const story = planCompareStory(summary({
      shared: 0, complementary: 0, discuss: 0, soft: 0, conflict: 0, limit: 0,
      jointlyAssessed: 0, unpairedVisible: 0, match: 0,
    }));
    expect(story.coverage).toBe("");
    expect(story.lead).toBe("Er zijn nog geen onderwerpen met een zichtbaar antwoord van jullie allebei.");
  });

  it("gebruikt enkelvoud voor één gezamenlijk of eenzijdig zichtbaar onderwerp", () => {
    const story = planCompareStory(summary({
      shared: 1, complementary: 0, discuss: 0, soft: 0, conflict: 0, limit: 0,
      jointlyAssessed: 1, unpairedVisible: 1, match: 1,
    }));
    expect(story.lead).toBe("Jullie hebben allebei een zichtbaar antwoord bij 1 onderwerp.");
    expect(story.coverage).toBe("Bij 1 ander onderwerp ontbreekt nog één zichtbaar antwoord.");
  });

  it("telt gedeelde en aanvullende antwoorden samen als overlap", () => {
    const story = planCompareStory(summary({ shared: 4, complementary: 3, jointlyAssessed: 10 }));
    expect(story.overlapCount).toBe(7);
    expect(story.overlapPercent).toBe(70);
  });

  it("houdt alle harde grenzen zichtbaar zonder de algemene story over te nemen", () => {
    const story = planCompareStory(summary({ shared: 32, discuss: 2, soft: 2, conflict: 1, limit: 2, jointlyAssessed: 39 }));
    expect(story.kind).toBe("very-overlapping");
    expect(story.insights[0]).toEqual({
      kind: "boundaries",
      title: "Grenzen",
      body: "Bij één antwoord staat enthousiasme tegenover een harde grens. Daarnaast staan bij 2 andere antwoorden harde grenzen. Daar staan jullie best even bij stil.",
    });
  });

  it("houdt enkelvoud correct wanneer naast een conflict één andere harde grens staat", () => {
    const story = planCompareStory(summary({ shared: 18, discuss: 4, soft: 2, conflict: 2, limit: 1, jointlyAssessed: 27 }));
    expect(story.insights[0]?.body).toBe("Bij 2 antwoorden staat enthousiasme tegenover een harde grens. Daarnaast staat bij één ander antwoord een harde grens. Daar staan jullie best even bij stil.");
  });

  it("noemt een categorie alleen wanneer verschillen er echt clusteren", () => {
    const categories = [
      category({ category: "bondage", jointlyAssessed: 8, discuss: 4, soft: 2, shared: 2 }),
      category({ category: "power", jointlyAssessed: 4, discuss: 1, shared: 3 }),
      category({ category: "impact", jointlyAssessed: 7, discuss: 1, shared: 6 }),
    ];
    const story = planCompareStory(summary({ shared: 11, discuss: 6, soft: 2, jointlyAssessed: 19 }), categories);
    const categoryCopy = story.insights.find((insight) => insight.kind === "category");
    expect(categoryCopy?.body).toMatch(/Bondage/);
  });

  it("gebruikt nergens gedachtestreepjes in de zichtbare story-copy", () => {
    const stories = [
      planCompareStory(summary()),
      planCompareStory(summary({ shared: 34, discuss: 3, soft: 2, jointlyAssessed: 39 })),
      planCompareStory(summary({ shared: 12, discuss: 16, soft: 3, jointlyAssessed: 31 })),
      planCompareStory(summary({ shared: 7, discuss: 5, soft: 11, jointlyAssessed: 23 })),
      planCompareStory(summary({ shared: 12, discuss: 7, soft: 5, conflict: 1, jointlyAssessed: 25 })),
    ];
    const copy = stories.flatMap((story) => [story.lead, story.coverage, ...story.insights.flatMap((insight) => [insight.title, insight.body])]).join(" ");
    expect(copy).not.toMatch(/[—–]/);
  });
});
