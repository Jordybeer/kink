import type { CompareReason } from "@/lib/compareV2";

export function renderCompareReason(reason: CompareReason): string {
  switch (reason.type) {
    case "shared":
      return `${reason.count} ${reason.count === 1 ? "punt heeft" : "punten hebben"} aan beide kanten een positief zichtbaar antwoord.`;
    case "complementary":
      return `${reason.count} ${reason.count === 1 ? "punt gebruikt" : "punten gebruiken"} expliciet complementaire participatierichtingen.`;
    case "discussion":
      return `${reason.count} ${reason.count === 1 ? "punt verschilt" : "punten verschillen"} of bevat onzekerheid in de zichtbare statussen.`;
    case "soft_boundaries":
      return `${reason.count} ${reason.count === 1 ? "punt heeft" : "punten hebben"} een zachte grens door asymmetrie in de zichtbare statussen.`;
    case "hard_conflicts":
      return `${reason.count} ${reason.count === 1 ? "punt combineert" : "punten combineren"} een positief antwoord met een harde grens.`;
    case "hard_limits":
      return `${reason.count} ${reason.count === 1 ? "punt bevat" : "punten bevatten"} een harde grens zonder positief antwoord aan de andere kant.`;
  }
}

export function planCompareSentences(
  reasons: CompareReason[],
  jointlyAssessed: number,
): string[] {
  if (jointlyAssessed === 0) {
    return ["Nog geen zichtbare expliciete antwoorden aan beide kanten om te vergelijken."];
  }
  return [
    ...reasons.slice(0, 3).map(renderCompareReason),
    `Gebaseerd op ${jointlyAssessed} gezamenlijk vergelijkbare zichtbare ${jointlyAssessed === 1 ? "antwoordpaar" : "antwoordparen"}.`,
  ];
}
