import type { KinkStatus } from "@/types";

// The house print palette. jsPDF can't read CSS custom properties, so paper
// colours are hardcoded here — and ONLY here — derived from the app tokens
// in globals.css. Three generators (contract, scene ledger, profile export)
// all drink from this well; no PDF invents its own purple again.
//
// Screen hues are tuned for the dark theme and fail AA on white paper
// (e.g. --maybe #38bdf8 is 2.1:1). Each print shade keeps its parent's hue
// but is darkened until it holds ≥5:1 on white — verified 2026-07-09.

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// On white paper (contract, scene ledger).
export const PDF_PAPER_PALETTE = {
  paper:  "#ffffff",
  accent: "#a61e85", // --accent #D946AF, darkened for paper (6.7:1)
  ink:    "#241a32", // one body ink — plum-black, nearest the brand's dark surface
  muted:  "#4b5563", // one muted gray (7.6:1)
} as const;

// Status hues on paper — same families as the screen tokens, print-safe.
// "conflict" mirrors --conflict (compare's "te bespreken" amber).
export const PDF_STATUS_ON_PAPER: Record<NonNullable<KinkStatus> | "conflict", string> = {
  yes:      "#c2410c", // --yes #f97316
  willing:  "#047857", // --willing #10b981
  maybe:    "#0369a1", // --maybe #38bdf8
  no:       "#4338ca", // --no #818cf8
  hard_no:  "#b91c1c", // --hard-no #ef4444
  conflict: "#b45309", // --conflict #f59e0b
};

// The two voices on paper — Profile A wears the brand accent, Profile B
// the rose of --accent2 (#D4527C), each darkened until it holds AA on
// white. Used for the comment bullets in the contract table.
export const PDF_PARTY_ON_PAPER = {
  a: "#a61e85", // = PDF_PAPER_PALETTE.accent
  b: "#ab2a50", // --accent2, darkened for paper
} as const;

// Page chrome on the dark profile export — snapshots of the midnight
// screen tokens (--accent / --text2 / --text). The export wears the
// brand's pink now; the last purple-400 died with the June accent shift.
export const PDF_DARK_PAGE = {
  accent: "#d946af", // --accent
  bg:     "#14121c", // deep page ground (neutral dark plum, unchanged)
  muted:  "#9d9ab8", // --text2
  light:  "#ede8f5", // --text
} as const;

// Status hues on a dark page (profile export) — the raw screen tokens,
// which were tuned for exactly this surface.
export const PDF_STATUS_ON_DARK: Record<NonNullable<KinkStatus>, string> = {
  yes:     "#f97316",
  willing: "#10b981",
  maybe:   "#38bdf8",
  no:      "#818cf8",
  hard_no: "#ef4444",
};
