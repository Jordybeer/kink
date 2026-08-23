import type { KinkStatus } from "@/types";

// The house print palette. jsPDF can't read CSS custom properties, so paper
// colours are hardcoded here — and ONLY here — derived from the app tokens
// in design-role-tokens.css. Three generators (contract, scene ledger, profile
// export) all drink from this well; no PDF invents its own purple again.
//
// Screen hues are tuned for the dark theme and fail AA on white paper
// (e.g. --maybe #38bdf8 is 2.1:1). Each print shade keeps its parent's hue
// but is darkened until it holds ≥5:1 on white.

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// On white paper (contract, scene ledger).
export const PDF_PAPER_PALETTE = {
  paper:  "#ffffff",
  accent: "#ab2a50", // --accent #D4527C, darkened for paper (6.6:1)
  ink:    "#241c2a", // nearest the highest warm-deep screen surface
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

// The two voices on paper — Profile A wears raspberry, Profile B muted
// lavender. Both are darkened until they hold AA on white.
export const PDF_PARTY_ON_PAPER = {
  a: "#ab2a50", // = PDF_PAPER_PALETTE.accent
  b: "#66507b", // --accent2 #8F7BA8, darkened for paper
} as const;

// Page chrome on the dark profile export — snapshots of the warm-deep screen
// tokens (--accent / --bg / --text2 / --text).
export const PDF_DARK_PAGE = {
  accent: "#d4527c", // --accent
  bg:     "#09070d", // --bg
  muted:  "#a198a4", // --text2
  light:  "#f1eaf0", // --text
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