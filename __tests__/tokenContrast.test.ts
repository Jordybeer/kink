import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const roleCss = readFileSync(new URL("../app/design-role-tokens.css", import.meta.url), "utf8");

function rootHexTokens(source: string): Record<string, string> {
  const rootBlock = source.match(/^:root\s*\{([\s\S]*?)\}/m)?.[1] ?? "";
  const tokens: Record<string, string> = {};
  for (const match of rootBlock.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    tokens[`--${match[1]}`] = match[2].toLowerCase();
  }
  return tokens;
}

const TOKENS = {
  ...rootHexTokens(globalsCss),
  ...rootHexTokens(roleCss),
};

function rgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(hex: string): number {
  const [red, green, blue] = rgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

const SURFACES = ["--bg", "--surface", "--surface2", "--surface3"] as const;
const STATUS_TOKENS = [
  "--yes", "--willing", "--curious", "--maybe", "--no", "--hard-no", "--conflict",
] as const;

function assertPair(foreground: string, background: string, minimum: number) {
  const foregroundHex = TOKENS[foreground];
  const backgroundHex = TOKENS[background];
  expect(foregroundHex, `${foreground} missing from fixed palette`).toBeDefined();
  expect(backgroundHex, `${background} missing from fixed palette`).toBeDefined();
  const ratio = contrast(foregroundHex, backgroundHex);
  expect(
    ratio,
    `${foreground} ${foregroundHex} on ${background} ${backgroundHex}`,
  ).toBeGreaterThanOrEqual(minimum);
}

describe("tokenContrast — the fixed dark room holds its ratios", () => {
  it("parses the base wardrobe and semantic text roles", () => {
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
      "--pwa-nav-surface",
      "--pwa-nav-surface-deep",
      "--pwa-nav-active",
      "--pwa-nav-icon",
      "--pwa-nav-icon-active",
    ]) {
      expect(TOKENS[token], `${token} not found in the fixed palette`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("primary text reads loudly on every surface (≥ 7:1)", () => {
    for (const background of SURFACES) assertPair("--text", background, 7);
  });

  it("muted text still whispers legibly on common surfaces (≥ 4.5:1)", () => {
    for (const background of ["--bg", "--surface", "--surface2"]) {
      assertPair("--text2", background, 4.5);
    }
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

  it("PWA dock icons keep non-text contrast in both states", () => {
    assertPair("--pwa-nav-icon", "--pwa-nav-surface", 3);
    assertPair("--pwa-nav-icon-active", "--pwa-nav-active", 3);
  });

  // Gevulde knoppen dragen een diepere vulling zodat er wit op kan. Zou iemand
  // --accent-fill later oplichten richting --accent, dan zakt wit door AA en
  // valt deze test om — precies de fout die corrections.md al een keer ving.
  it("witte knoptekst houdt stand op de diepere knopvulling", () => {
    assertPair("--on-accent-fill", "--accent-fill", 4.5);
  });
});
