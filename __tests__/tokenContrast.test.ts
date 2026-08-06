import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hexToRgb } from "@/lib/pdfPalette";

const css = [
  readFileSync(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFileSync(new URL("../app/design-role-tokens.css", import.meta.url), "utf8"),
].join("\n");

const TOKENS: Record<string, string> = {};
for (const block of css.matchAll(/:root\s*\{([\s\S]*?)\}/g)) {
  for (const match of block[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    TOKENS[`--${match[1]}`] = match[2].toLowerCase();
  }
}

function luminance(hex: string): number {
  const lin = hexToRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(foreground: string, background: string): number {
  const [a, b] = [luminance(foreground), luminance(background)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const SURFACES = ["--bg", "--surface", "--surface2", "--surface3"] as const;
const STATUS_TOKENS = [
  "--yes", "--willing", "--curious", "--maybe", "--no", "--hard-no", "--conflict",
] as const;

function assertPair(foreground: string, background: string, minimum: number) {
  const key = `${foreground} on ${background}`;
  expect(TOKENS[foreground], `${foreground} missing from fixed palette`).toBeDefined();
  expect(TOKENS[background], `${background} missing from fixed palette`).toBeDefined();
  expect(contrast(TOKENS[foreground], TOKENS[background]), key).toBeGreaterThanOrEqual(minimum);
}

describe("tokenContrast — the fixed dark room holds its ratios", () => {
  it("parses the fixed house palette and semantic text roles", () => {
    for (const token of [
      ...SURFACES,
      ...STATUS_TOKENS,
      "--text",
      "--text2",
      "--accent",
      "--accent2",
      "--accent-text",
      "--accent2-text",
      "--hard-no-text",
      "--on-accent",
    ]) {
      expect(TOKENS[token], `${token} not found in the fixed palette`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("primary text reads loudly on every surface (≥ 7:1)", () => {
    for (const background of SURFACES) assertPair("--text", background, 7);
  });

  it("muted text still whispers legibly on common surfaces (≥ 4.5:1)", () => {
    for (const background of ["--bg", "--surface", "--surface2"]) assertPair("--text2", background, 4.5);
  });

  it("brand, profile B and destructive text hold AA on the highest surface", () => {
    assertPair("--accent-text", "--surface3", 4.5);
    assertPair("--accent2-text", "--surface3", 4.5);
    assertPair("--hard-no-text", "--surface3", 4.5);
  });

  it("every raw verdict colour remains readable on the base surfaces", () => {
    for (const status of STATUS_TOKENS) {
      for (const background of ["--bg", "--surface"]) assertPair(status, background, 4.5);
    }
  });

  it("on-accent ink holds on both identity accents", () => {
    assertPair("--on-accent", "--accent", 4.5);
    assertPair("--on-accent", "--accent2", 4.5);
  });
});
