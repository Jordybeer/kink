import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hexToRgb } from "@/lib/pdfPalette";

// The runtime sibling of pdfPalette.test.ts: the app's own dark-room tokens
// held to the same WCAG leash. pdfPalette guards ink on paper; this guards
// every high-volume text/background pairing in globals.css. A token can't
// quietly dim below AA without a red suite calling it out.

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

// First :root block only — theme variants re-declare tokens downstream and
// are hand-tuned separately (.theme-ledger already carries its own AA notes).
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? "";
const TOKENS: Record<string, string> = {};
for (const m of rootBlock.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
  TOKENS[`--${m[1]}`] = m[2].toLowerCase();
}

function luminance(hex: string): number {
  const lin = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Pairs that failed AA at audit time but were consciously kept — every entry
// needs a reason, and the pair is still asserted against its recorded ratio
// so it can't silently get WORSE. Currently empty: the whole room passes.
const GRANDFATHERED: Record<string, { minRatio: number; reason: string }> = {};

const SURFACES = ["--bg", "--surface", "--surface2", "--surface3"] as const;
const STATUS_TOKENS = [
  "--yes", "--willing", "--curious", "--maybe", "--no", "--hard-no", "--conflict",
] as const;

function assertPair(fg: string, bg: string, min: number) {
  const key = `${fg} on ${bg}`;
  const grandfathered = GRANDFATHERED[key];
  const floor = grandfathered ? grandfathered.minRatio : min;
  expect(TOKENS[fg], `${fg} missing from :root`).toBeDefined();
  expect(TOKENS[bg], `${bg} missing from :root`).toBeDefined();
  expect(contrast(TOKENS[fg], TOKENS[bg]), key).toBeGreaterThanOrEqual(floor);
}

describe("tokenContrast — the dark room holds its ratios", () => {
  it("parsed the :root wardrobe", () => {
    for (const t of [...SURFACES, ...STATUS_TOKENS, "--text", "--text2", "--accent", "--accent2", "--on-accent"]) {
      expect(TOKENS[t], `${t} not found in globals.css :root`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("primary text reads loud on every surface (≥ 7:1)", () => {
    for (const bg of SURFACES) assertPair("--text", bg, 7);
  });

  it("muted text still whispers legibly (≥ 4.5:1)", () => {
    for (const bg of ["--bg", "--surface", "--surface2"]) assertPair("--text2", bg, 4.5);
  });

  it("every verdict colour speaks AA as text on the dark surfaces", () => {
    for (const status of STATUS_TOKENS) {
      for (const bg of ["--bg", "--surface"]) assertPair(status, bg, 4.5);
    }
  });

  it("on-accent ink holds on both accents (≥ 4.5:1)", () => {
    assertPair("--on-accent", "--accent", 4.5);
    assertPair("--on-accent", "--accent2", 4.5);
  });

  it("grandfathered exceptions never rot further", () => {
    for (const [key, { minRatio }] of Object.entries(GRANDFATHERED)) {
      const [fg, bg] = key.split(" on ");
      expect(contrast(TOKENS[fg], TOKENS[bg]), key).toBeGreaterThanOrEqual(minRatio);
    }
  });
});
