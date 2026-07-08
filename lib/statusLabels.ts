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

export const STATUS_VAR: Record<NonNullable<KinkStatus>, string> = {
  yes:     "var(--yes)",
  willing: "var(--willing)",
  maybe:   "var(--maybe)",
  no:      "var(--no)",
  hard_no: "var(--hard-no)",
};
