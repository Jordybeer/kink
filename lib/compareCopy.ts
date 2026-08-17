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

function overlapOpening(percent: number, seed: number): string {
  if (percent >= 80) {
    return choose([
      "Er is opvallend veel overlap.",
      "De overeenkomsten vallen meteen op.",
      "Veel van de ingevulde voorkeuren liggen op één lijn.",
    ], seed);
  }
  if (percent >= 50) {
    return choose([
      "Er is behoorlijk wat overlap.",
      "Best veel antwoorden komen overeen.",
      "Bij veel voorkeuren ligt de interesse dicht bij elkaar.",
    ], seed);
  }
  if (percent >= 25) {
    return choose([
      "Er is duidelijke overlap, maar ook genoeg verschil om verder te verkennen.",
      "Een deel ligt mooi op één lijn, bij andere voorkeuren zit meer verschil.",
      "Er is herkenbare overlap, met daarnaast genoeg nuance om over te praten.",
    ], seed);
  }
  return choose([
    "Er is wat overlap, maar de verschillen vallen voorlopig meer op.",
    "Op een paar voorkeuren zit er aansluiting, maar op veel andere nog niet.",
    "De overlap is voorlopig beperkt. Er blijft genoeg om samen te bespreken.",
  ], seed);
}

function overlapDetail(summary: CompareSummary): string {
  const total = preferenceCount(summary.jointlyAssessed);
  if (summary.complementary > 0 && summary.shared > 0) {
    return `Van de ${total} die aan beide kanten zijn ingevuld, is de interesse bij ${summary.shared} aan beide kanten positief. Bij ${summary.complementary} andere vullen twee kanten van dezelfde voorkeur elkaar aan.`;
  }
  if (summary.complementary > 0) {
    return `Van de ${total} die aan beide kanten zijn ingevuld, vullen bij ${summary.complementary} voorkeuren twee kanten elkaar aan.`;
  }
  return `Van de ${total} die aan beide kanten zijn ingevuld, is de interesse bij ${summary.shared} aan beide kanten positief.`;
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
    return `De meeste verschillen zitten rond ${kinkCategoryLabel(first.category)} en ${kinkCategoryLabel(second.category)}.`;
  }

  if (first.difference / totalDifferences >= 0.45) {
    return `De meeste verschillen zitten rond ${kinkCategoryLabel(first.category)}.`;
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
      lead: "Er zijn nog geen voorkeuren die aan beide kanten zijn ingevuld. Zodra dat gebeurt, kan de vergelijking iets zinnigs laten zien.",
      insights: [],
      coverage: summary.unpairedVisible > 0
        ? `Voor ${preferenceCount(summary.unpairedVisible)} ontbreekt nog één zichtbaar antwoord.`
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

  const lead = `${overlapOpening(overlapPercent, seed)} ${overlapDetail(summary)}`;
  const insights: string[] = [];

  if (summary.conflict > 0) {
    const conflictCopy = summary.conflict === 1
      ? "Bij één voorkeur staat enthousiasme tegenover een harde grens. Daar kun je best eerst even samen over praten."
      : `Bij ${summary.conflict} voorkeuren staat enthousiasme tegenover een harde grens. Daar kun je best eerst even samen over praten.`;
    const otherLimits = summary.limit === 0
      ? ""
      : summary.limit === 1
        ? " Daarnaast staat er bij één andere voorkeur een harde grens."
        : ` Daarnaast staan er bij ${summary.limit} andere voorkeuren harde grenzen.`;
    insights.push(`${conflictCopy}${otherLimits}`);
  } else if (summary.limit > 0) {
    insights.push(summary.limit === 1
      ? "Er staat één harde grens tussen de gezamenlijk ingevulde voorkeuren. Die staat bewust los van het overlappercentage."
      : `Er staan ${summary.limit} harde grenzen tussen de gezamenlijk ingevulde voorkeuren. Die staan bewust los van het overlappercentage.`);
  }

  const clustered = categoryInsight(categoryScores);
  if (clustered && insights.length < 2) insights.push(clustered);

  if (summary.discuss > 0 && insights.length < 2) {
    insights.push(choose([
      `Bij ${preferenceCount(summary.discuss)} is het nog niet helemaal duidelijk. Daar valt dus nog wat uit te praten of te ontdekken.`,
      `Bij ${preferenceCount(summary.discuss)} is het nog niet helemaal duidelijk. Dat zijn logische onderwerpen om samen verder te verkennen.`,
      `${preferenceCount(summary.discuss)} zijn nog niet zo duidelijk. De antwoorden kunnen verschillen, twijfelen of vooral voor de ander bedoeld zijn.`,
    ], seed + 19));
  }

  if (summary.soft > 0 && insights.length < 2) {
    insights.push(choose([
      `Bij ${preferenceCount(summary.soft)} is de ene duidelijk enthousiaster dan de andere.`,
      `Bij ${preferenceCount(summary.soft)} verschilt vooral hoeveel zin de één en de ander erin hebben.`,
      `Bij ${preferenceCount(summary.soft)} ligt de interesse niet even sterk aan beide kanten.`,
    ], seed + 23));
  }

  const coverage = summary.unpairedVisible > 0
    ? `${preferenceCount(summary.jointlyAssessed)} zijn aan beide kanten ingevuld. Voor ${summary.unpairedVisible} andere ontbreekt nog één zichtbaar antwoord.`
    : `${preferenceCount(summary.jointlyAssessed)} zijn aan beide kanten ingevuld.`;

  return {
    overlapPercent,
    overlapCount,
    lead,
    insights: insights.slice(0, 2),
    coverage,
  };
}
