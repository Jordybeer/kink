import type { KinkStatus } from "@/types";

// The one house vocabulary for the five verdicts. Every surface — deck,
// ledger rows, compare, session, contract, PDF — speaks from this file.
// It exists because eight hand-copied maps let hard_no drift between
// "Grens" and "Harde grens"; a limit deserves one unambiguous name.

export const STATUS_ORDER: readonly NonNullable<KinkStatus>[] = [
  "yes", "willing", "maybe", "no", "hard_no",
] as const;

export const STATUS_LABEL: Record<NonNullable<KinkStatus>, string> = {
  yes:     "Heel graag",
  willing: "Ja",
  maybe:   "Misschien",
  no:      "Voor hen",
  hard_no: "Harde grens",
};

// Short whispers next to each verdict — echo the "Wat betekenen deze
// keuzes?" explainer so the vocabulary stays one voice.
export const STATUS_HINT: Record<NonNullable<KinkStatus>, string> = {
  yes:     "zoek ik actief op",
  willing: "geen probleem mee",
  maybe:   "hangt af van context",
  no:      "geef ik mijn partner",
  hard_no: "niet bespreekbaar",
};

// Rank a pair of verdicts by eagerness so contract tables can list rows
// in the house hierarchy: Heel graag > Ja > Misschien > Voor hen > Harde
// grens, with an unrated side sorting last. The keenest verdict leads,
// the partner's verdict breaks ties — so "Heel graag + Voor hen" prints
// above "Ja + Ja". Lower rank = higher on the page.
export function statusPairRank(a: KinkStatus | null, b: KinkStatus | null): number {
  const worst = STATUS_ORDER.length;
  const rank = (s: KinkStatus | null) => (s ? STATUS_ORDER.indexOf(s) : worst);
  const [lo, hi] = [rank(a), rank(b)].sort((x, y) => x - y);
  return lo * (worst + 1) + hi;
}

export const STATUS_VAR: Record<NonNullable<KinkStatus>, string> = {
  yes:     "var(--yes)",
  willing: "var(--willing)",
  maybe:   "var(--maybe)",
  no:      "var(--no)",
  hard_no: "var(--hard-no)",
};
