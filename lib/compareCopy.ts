import { kinkCategoryLabel } from "@/lib/kinkCategories";
import type { CompareCategoryScore, CompareSummary } from "@/lib/compare";

export interface CompareStory {
  overlapPercent: number | null;
  overlapCount: number;
  lead: string;
  insights: string[];
  coverage: string;
}

function choose<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

function preferenceCount(count: number): string {
  return `${count} ${count === 1 ? "voorkeur" : "voorkeuren"}`;
}

function overlapLead(percent: number, seed: number): string {
  if (percent >= 80) {
    return choose([
      "Jullie zitten bij heel veel voorkeuren op dezelfde lijn.",
      "Er zit opvallend veel overlap in jullie antwoorden.",
      "Jullie antwoorden komen op heel veel voorkeuren overeen.",
    ], seed);
  }
  if (percent >= 50) {
    return choose([
      "Jullie zitten opvallend vaak op dezelfde lijn.",
      "Jullie antwoorden komen vaak overeen.",
      "Op veel voorkeuren zitten jullie op dezelfde lijn.",
    ], seed);
  }
  if (percent >= 25) {
    return choose([
      "Er is duidelijke overlap, maar ook nog best wat om samen te bekijken.",
      "Op een deel van jullie voorkeuren zitten jullie op dezelfde lijn, bij andere minder.",
      "Er is overlap in jullie antwoorden, met daarnaast een aantal duidelijke verschillen.",
    ], seed);
  }
  return choose([
    "Er is wat overlap, maar jullie antwoorden verschillen bij veel voorkeuren die jullie allebei hebben beoordeeld.",
    "Op een aantal voorkeuren zitten jullie op dezelfde lijn, maar er zijn ook veel verschillen.",
    "Een deel van jullie antwoorden sluit aan, maar bij veel voorkeuren denken jullie er anders over.",
  ], seed);
}

function categoryInsight(categoryScores: CompareCategoryScore[]): string | null {
  const scored = categoryScores
    .map((category) => ({
      category: category.category,
      difference: category.discuss + category.soft + category.conflict + category.limit,
    }))
    .filter((category) => category.difference > 0)
    .sort((a, b) => b.difference - a.difference || a.category.localeCompare(b.category));

  const totalDifferences = scored.reduce((sum, category) => sum + category.difference, 0);
  const first = scored[0];
  if (!first || totalDifferences < 4 || first.difference < 2) return null;

  const second = scored[1];
  if (
    second
    && second.difference >= 2
    && (first.difference + second.difference) / totalDifferences >= 0.65
  ) {
    return `De meeste verschillen zitten rond ${kinkCategoryLabel(first.category)} en ${kinkCategoryLabel(second.category)}. Daarbuiten zitten jullie vaker op dezelfde lijn.`;
  }

  if (first.difference / totalDifferences >= 0.45) {
    return `De meeste verschillen zitten rond ${kinkCategoryLabel(first.category)}. Daarbuiten zitten jullie vaker op dezelfde lijn.`;
  }

  return null;
}

export function getClearOverlapPercent(summary: Pick<CompareSummary, "shared" | "complementary" | "jointlyAssessed">): number | null {
  if (summary.jointlyAssessed === 0) return null;
  return Math.round(((summary.shared + summary.complementary) / summary.jointlyAssessed) * 100);
}

export function planCompareStory(
  summary: CompareSummary,
  categoryScores: CompareCategoryScore[] = [],
): CompareStory {
  const overlapCount = summary.shared + summary.complementary;
  const overlapPercent = getClearOverlapPercent(summary);

  if (overlapPercent === null) {
    return {
      overlapPercent: null,
      overlapCount: 0,
      lead: "Jullie hebben nog geen voorkeuren allebei beoordeeld. Zodra dat wel zo is, verschijnt hier wat er tussen jullie antwoorden opvalt.",
      insights: [],
      coverage: summary.unpairedVisible > 0
        ? `Bij ${preferenceCount(summary.unpairedVisible)} ontbreekt nog een zichtbaar antwoord van één van jullie.`
        : "Er zijn nog geen zichtbare antwoorden om naast elkaar te leggen.",
    };
  }

  const seed = summary.jointlyAssessed
    + summary.shared * 3
    + summary.complementary * 5
    + summary.discuss * 7
    + summary.soft * 11
    + summary.conflict * 13
    + summary.limit * 17;

  const lead = `${overlapLead(overlapPercent, seed)} Van de ${preferenceCount(summary.jointlyAssessed)} die jullie allebei hebben beoordeeld, sluiten er ${overlapCount} duidelijk aan: jullie zijn allebei positief, of geven en ontvangen passen bij elkaar.`;

  const insights: string[] = [];

  if (summary.conflict > 0) {
    const conflictCopy = summary.conflict === 1
      ? "Bij één voorkeur staat een positief antwoord tegenover een harde grens. Daar zouden jullie best eerst even over praten."
      : `Bij ${summary.conflict} voorkeuren staat een positief antwoord tegenover een harde grens. Daar zouden jullie best eerst even over praten.`;
    const otherLimits = summary.limit === 0
      ? ""
      : summary.limit === 1
        ? " Daarnaast heeft bij één andere voorkeur minstens één van jullie een harde grens."
        : ` Daarnaast heeft bij ${summary.limit} andere voorkeuren minstens één van jullie een harde grens.`;
    insights.push(`${conflictCopy}${otherLimits}`);
  } else if (summary.limit > 0) {
    insights.push(summary.limit === 1
      ? "Bij één voorkeur heeft minstens één van jullie een harde grens. Die blijft apart staan van de overlap hierboven."
      : `Bij ${summary.limit} voorkeuren heeft minstens één van jullie een harde grens. Die blijven apart staan van de overlap hierboven.`);
  }

  if (summary.complementary > 0 && insights.length < 2) {
    insights.push(summary.complementary === 1
      ? "Bij één voorkeur passen geven en ontvangen mooi bij elkaar. De ene wil geven wat de andere graag ontvangt."
      : `Bij ${summary.complementary} voorkeuren passen geven en ontvangen mooi bij elkaar. De ene wil geven wat de andere graag ontvangt.`);
  }

  const clustered = categoryInsight(categoryScores);
  if (clustered && insights.length < 2) insights.push(clustered);

  if (summary.discuss > 0 && insights.length < 2) {
    insights.push(choose([
      `Bij ${preferenceCount(summary.discuss)} denken jullie er anders over of twijfelt één van jullie nog.`,
      `Bij ${preferenceCount(summary.discuss)} zit er verschil in jullie antwoorden of twijfelt één van jullie nog.`,
      `Bij ${preferenceCount(summary.discuss)} is er nog iets om over te praten, omdat jullie antwoorden verschillen of één van jullie nog twijfelt.`,
    ], seed + 19));
  }

  if (summary.soft > 0 && insights.length < 2) {
    insights.push(choose([
      `Bij ${preferenceCount(summary.soft)} staat één van jullie er positiever tegenover dan de ander.`,
      `Bij ${preferenceCount(summary.soft)} is één van jullie duidelijk positiever dan de ander.`,
      `Bij ${preferenceCount(summary.soft)} zit er verschil in hoe enthousiast jullie erover zijn.`,
    ], seed + 23));
  }

  const coverage = summary.unpairedVisible > 0
    ? `${preferenceCount(summary.jointlyAssessed)} door jullie allebei beoordeeld. Bij ${summary.unpairedVisible} andere ontbreekt nog een zichtbaar antwoord van één van jullie.`
    : `${preferenceCount(summary.jointlyAssessed)} door jullie allebei beoordeeld.`;

  return {
    overlapPercent,
    overlapCount,
    lead,
    insights: insights.slice(0, 2),
    coverage,
  };
}
