import { kinkCategoryLabel } from "@/lib/kinkCategories";
import type { CompareCategoryScore, CompareSummary } from "@/lib/compare";

export type CompareStoryKind = "very-overlapping" | "overlapping" | "mixed" | "discuss-heavy" | "different" | "low-coverage";
export type CompareInsightKind = "boundaries" | "discuss" | "differences" | "category";

export interface CompareInsight {
  kind: CompareInsightKind;
  title: string;
  body: string;
}

export interface CompareStory {
  kind: CompareStoryKind;
  overlapPercent: number | null;
  overlapCount: number;
  lead: string;
  insights: CompareInsight[];
  coverage: string;
}

function preferenceCount(count: number): string {
  return `${count} ${count === 1 ? "voorkeur" : "voorkeuren"}`;
}

function categoryInsight(categoryScores: CompareCategoryScore[]): CompareInsight | null {
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
    return {
      kind: "category",
      title: "Hier zit het meeste verschil",
      body: `Vooral bij ${kinkCategoryLabel(first.category)} en ${kinkCategoryLabel(second.category)} lopen jullie antwoorden vaker uiteen.`,
    };
  }

  if (first.difference / totalDifferences >= 0.45) {
    return {
      kind: "category",
      title: "Hier zit het meeste verschil",
      body: `Vooral bij ${kinkCategoryLabel(first.category)} lopen jullie antwoorden vaker uiteen.`,
    };
  }

  return null;
}

export function getClearOverlapPercent(summary: Pick<CompareSummary, "shared" | "complementary" | "jointlyAssessed">): number | null {
  if (summary.jointlyAssessed === 0) return null;
  return Math.round(((summary.shared + summary.complementary) / summary.jointlyAssessed) * 100);
}

function storyKind(summary: CompareSummary, overlapPercent: number | null): CompareStoryKind {
  if (overlapPercent === null || summary.jointlyAssessed < 6) return "low-coverage";
  if (overlapPercent >= 80) return "very-overlapping";
  if (overlapPercent >= 60) return "overlapping";

  const hard = summary.conflict + summary.limit;
  const nonOverlap = summary.discuss + summary.soft + hard;
  const discussShare = summary.jointlyAssessed > 0 ? summary.discuss / summary.jointlyAssessed : 0;

  if (summary.discuss > 0 && discussShare >= 0.35 && summary.discuss >= summary.soft + hard) return "discuss-heavy";
  if (summary.soft > 0 && nonOverlap > summary.shared + summary.complementary && summary.soft >= summary.discuss) return "different";
  if (overlapPercent < 35 && summary.soft > 0) return "different";
  return "mixed";
}

function leadFor(kind: CompareStoryKind): string {
  switch (kind) {
    case "very-overlapping":
      return "Jullie zitten wel héél vaak op dezelfde golflengte 😏 Misschien zijn de paar verschillen juist het leukst om samen verder te ontdekken.";
    case "overlapping":
      return "Jullie zitten verrassend vaak op dezelfde golflengte 👀 Waar jullie antwoorden verschillen, valt misschien nog iets nieuws te ontdekken.";
    case "discuss-heavy":
      return "Niet alles is meteen duidelijk tussen jullie. Sommige antwoorden liggen dicht bij elkaar, andere vragen misschien om een goed gesprek.";
    case "different":
      return "Jullie denken er best vaak anders over. Dat is niet per se een probleem. Misschien valt er juist daardoor nog veel over elkaar te ontdekken.";
    case "mixed":
      return "Jullie zitten best vaak op één lijn, maar verschillen ook regelmatig van mening. Genoeg om nog over te praten en samen te ontdekken.";
    case "low-coverage":
      return "Het beeld is nog niet helemaal compleet. Vul allebei wat meer in en vergelijk daarna opnieuw.";
  }
}

function additionalLimitCopy(limit: number): string {
  if (limit === 0) return "";
  if (limit === 1) return " Daarnaast staat bij één ander antwoord een harde grens.";
  return ` Daarnaast staan bij ${limit} andere antwoorden harde grenzen.`;
}

function boundaryInsight(summary: CompareSummary): CompareInsight | null {
  const hard = summary.conflict + summary.limit;
  if (hard === 0) return null;

  if (summary.conflict > 0) {
    const conflictCopy = summary.conflict === 1
      ? "Bij één antwoord staat enthousiasme tegenover een harde grens."
      : `Bij ${summary.conflict} antwoorden staat enthousiasme tegenover een harde grens.`;
    return {
      kind: "boundaries",
      title: "Grenzen",
      body: `${conflictCopy}${additionalLimitCopy(summary.limit)} Daar staan jullie best even bij stil.`,
    };
  }

  return {
    kind: "boundaries",
    title: "Grenzen",
    body: hard === 1
      ? "Er is ook een harde grens waar jullie best even bij stilstaan."
      : `Er zijn ook ${hard} harde grenzen waar jullie best even bij stilstaan.`,
  };
}

function discussionInsight(summary: CompareSummary): CompareInsight | null {
  if (summary.discuss === 0) return null;
  return {
    kind: "discuss",
    title: "Bespreekbaar",
    body: summary.discuss === 1
      ? "Eén antwoord vraagt misschien gewoon wat meer uitleg van elkaar."
      : "Sommige antwoorden vragen misschien gewoon wat meer uitleg van elkaar.",
  };
}

function differenceInsight(summary: CompareSummary): CompareInsight | null {
  if (summary.soft === 0) return null;
  return {
    kind: "differences",
    title: "Verschillen",
    body: summary.soft === 1
      ? "Bij één antwoord is de één duidelijk enthousiaster dan de ander."
      : "Bij een aantal antwoorden is de één duidelijk enthousiaster dan de ander.",
  };
}

export function planCompareStory(
  summary: CompareSummary,
  categoryScores: CompareCategoryScore[] = [],
): CompareStory {
  const overlapCount = summary.shared + summary.complementary;
  const overlapPercent = getClearOverlapPercent(summary);
  const kind = storyKind(summary, overlapPercent);

  const insights: CompareInsight[] = [];
  const boundary = boundaryInsight(summary);
  if (boundary) insights.push(boundary);

  const clustered = categoryInsight(categoryScores);
  if (clustered && insights.length < 2) insights.push(clustered);

  if (insights.length < 2) {
    const discuss = discussionInsight(summary);
    const differences = differenceInsight(summary);
    if (kind === "discuss-heavy" && discuss) insights.push(discuss);
    else if (kind === "different" && differences) insights.push(differences);
    else if (discuss) insights.push(discuss);
    else if (differences) insights.push(differences);
  }

  const coverage = summary.unpairedVisible > 0
    ? `${preferenceCount(summary.jointlyAssessed)} zijn aan beide kanten ingevuld. Voor ${summary.unpairedVisible} andere ontbreekt nog één zichtbaar antwoord.`
    : `${preferenceCount(summary.jointlyAssessed)} zijn aan beide kanten ingevuld.`;

  return {
    kind,
    overlapPercent,
    overlapCount,
    lead: leadFor(kind),
    insights: insights.slice(0, 2),
    coverage,
  };
}
