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

  it("kiest de heel-veel-overlap tekst zonder de cijfers opnieuw uit te schrijven", () => {
    const story = planCompareStory(summary({ shared: 34, discuss: 3, soft: 2, jointlyAssessed: 39 }));
    expect(story.kind).toBe("very-overlapping");
    expect(story.lead).toBe("Jullie zitten wel héél vaak op dezelfde golflengte 😏 Misschien zijn de paar verschillen juist het leukst om samen verder te ontdekken.");
    expect(story.lead).not.toMatch(/\b34\b|\b39\b|%/);
  });

  it("kiest de gewone overlaptekst en houdt de emoji natuurlijk in de zin", () => {
    const story = planCompareStory(summary());
    expect(story.kind).toBe("overlapping");
    expect(story.lead).toBe("Jullie zitten verrassend vaak op dezelfde golflengte 👀 Waar jullie antwoorden verschillen, valt misschien nog iets nieuws te ontdekken.");
    expect(story.lead).not.toContain("golflengte. 👀");
  });

  it("kiest bespreekbaar wanneer onduidelijkheid duidelijk domineert", () => {
    const story = planCompareStory(summary({ shared: 12, discuss: 16, soft: 3, conflict: 0, limit: 0, jointlyAssessed: 31 }));
    expect(story.kind).toBe("discuss-heavy");
    expect(story.lead).toBe("Niet alles is meteen duidelijk tussen jullie. Sommige antwoorden liggen dicht bij elkaar, andere vragen misschien om een goed gesprek.");
  });

  it("kiest verschillen wanneer zachte verschillen de niet-overlap domineren", () => {
    const story = planCompareStory(summary({ shared: 7, discuss: 5, soft: 11, conflict: 0, limit: 0, jointlyAssessed: 23 }));
    expect(story.kind).toBe("different");
    expect(story.lead).toBe("Jullie denken er best vaak anders over. Dat is niet per se een probleem. Misschien valt er juist daardoor nog veel over elkaar te ontdekken.");
  });

  it("valt terug op een gemengde tekst wanneer geen patroon overheerst", () => {
    const story = planCompareStory(summary({ shared: 12, discuss: 7, soft: 5, conflict: 1, limit: 0, jointlyAssessed: 25 }));
    expect(story.kind).toBe("mixed");
    expect(story.lead).toBe("Jullie zitten best vaak op één lijn, maar verschillen ook regelmatig van mening. Genoeg om nog over te praten en samen te ontdekken.");
  });

  it("blijft voorzichtig wanneer er nog te weinig gezamenlijk is ingevuld", () => {
    const story = planCompareStory(summary({
      shared: 3,
      complementary: 0,
      discuss: 1,
      soft: 1,
      conflict: 0,
      limit: 0,
      jointlyAssessed: 5,
      unpairedVisible: 12,
      match: 3,
    }));
    expect(story.kind).toBe("low-coverage");
    expect(story.lead).toBe("Het beeld is nog niet helemaal compleet. Vul allebei wat meer in en vergelijk daarna opnieuw.");
    expect(story.coverage).toContain("12 andere");
  });

  it("houdt harde grenzen als inzicht zichtbaar zonder de algemene story over te nemen", () => {
    const story = planCompareStory(summary({ shared: 31, discuss: 3, soft: 2, conflict: 1, limit: 2, jointlyAssessed: 39 }));
    expect(story.kind).toBe("very-overlapping");
    expect(story.insights[0]).toEqual({
      kind: "boundaries",
      title: "Grenzen",
      body: "Bij één antwoord staat enthousiasme tegenover een harde grens. Daar staan jullie best even bij stil.",
    });
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
