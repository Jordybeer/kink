import { describe, expect, it } from "vitest";
import { hexToRgb, PDF_PAPER_PALETTE, PDF_PARTY_ON_PAPER, PDF_STATUS_ON_PAPER } from "@/lib/pdfPalette";
import { STATUS_ORDER } from "@/lib/statusLabels";

// WCAG relative luminance → contrast ratio, so a colour can never sneak
// onto white paper without holding its 4.5:1 (corrections.md, 2026-06-20).
function contrastOnWhite(hex: string): number {
  const lin = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return 1.05 / (L + 0.05);
}

describe("pdfPalette", () => {
  it("decodes hex to RGB tuples", () => {
    expect(hexToRgb("#ffffff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#ab2a50")).toEqual([171, 42, 80]);
  });

  it("every paper colour holds AA contrast on white", () => {
    const onPaper = [
      PDF_PAPER_PALETTE.accent, PDF_PAPER_PALETTE.ink, PDF_PAPER_PALETTE.muted,
      ...Object.values(PDF_STATUS_ON_PAPER),
      ...Object.values(PDF_PARTY_ON_PAPER),
    ];
    for (const hex of onPaper) {
      expect(contrastOnWhite(hex), `${hex} on white`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("covers all five verdicts on paper", () => {
    for (const s of STATUS_ORDER) {
      expect(PDF_STATUS_ON_PAPER[s]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("the two party voices on paper are real hexes and never the same ink", () => {
    expect(PDF_PARTY_ON_PAPER.a).toMatch(/^#[0-9a-f]{6}$/);
    expect(PDF_PARTY_ON_PAPER.b).toMatch(/^#[0-9a-f]{6}$/);
    expect(PDF_PARTY_ON_PAPER.a).not.toBe(PDF_PARTY_ON_PAPER.b);
    expect(PDF_PARTY_ON_PAPER.a).toBe(PDF_PAPER_PALETTE.accent); // A wears the brand
  });
});
