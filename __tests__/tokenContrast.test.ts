import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const roleCss = readFileSync(new URL("../app/design-role-tokens.css", import.meta.url), "utf8");

function selectorHexTokens(selector: RegExp): Record<string, string> {
  const block = roleCss.match(selector)?.[1] ?? "";
  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    tokens[`--${match[1]}`] = match[2].toLowerCase();
  }
  return tokens;
}

const PALETTES = {
  dark: selectorHexTokens(/:root,\s*:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/m),
  light: selectorHexTokens(/:root\[data-theme="light"\]\s*\{([\s\S]*?)\}/m),
} as const;

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

describe.each(Object.entries(PALETTES))("tokenContrast — %s palette", (mode, tokens) => {
  function assertPair(foreground: string, background: string, minimum: number) {
    const foregroundHex = tokens[foreground];
    const backgroundHex = tokens[background];
    expect(foregroundHex, `${mode} ${foreground} missing`).toBeDefined();
    expect(backgroundHex, `${mode} ${background} missing`).toBeDefined();
    const ratio = contrast(foregroundHex, backgroundHex);
    expect(
      ratio,
      `${mode} ${foreground} ${foregroundHex} on ${background} ${backgroundHex}`,
    ).toBeGreaterThanOrEqual(minimum);
  }

  it("parses the complete semantic wardrobe", () => {
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
      "--accent-fill",
      "--on-accent-fill",
      "--danger-fill",
      "--on-danger-fill",
      "--pwa-nav-surface",
      "--pwa-nav-surface-deep",
      "--pwa-nav-active",
      "--pwa-nav-icon",
      "--pwa-nav-icon-active",
    ]) {
      expect(tokens[token], `${mode} ${token} not found`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("primary text reads loudly on every surface (≥ 7:1)", () => {
    for (const background of SURFACES) assertPair("--text", background, 7);
  });

  it("muted text remains AA on common surfaces", () => {
    for (const background of ["--bg", "--surface", "--surface2"]) {
      assertPair("--text2", background, 4.5);
    }
  });

  it("brand, profile B and destructive text hold AA on the highest surface", () => {
    assertPair("--accent", "--surface3", 4.5);
    assertPair("--accent-text", "--surface3", 4.5);
    assertPair("--accent2-text", "--surface3", 4.5);
    assertPair("--hard-no-text", "--surface3", 4.5);
  });

  it("every verdict colour remains readable on base surfaces", () => {
    for (const status of STATUS_TOKENS) {
      for (const background of ["--bg", "--surface"]) assertPair(status, background, 4.5);
    }
  });

  it("identity and filled action ink hold AA", () => {
    assertPair("--on-accent", "--accent", 4.5);
    assertPair("--on-accent", "--accent2", 4.5);
    assertPair("--on-accent-fill", "--accent-fill", 4.5);
    assertPair("--on-danger-fill", "--danger-fill", 4.5);
  });

  it("PWA dock icons and mini labels keep AA contrast in both states", () => {
    assertPair("--pwa-nav-icon", "--pwa-nav-surface", 4.5);
    assertPair("--pwa-nav-icon-active", "--pwa-nav-active", 4.5);
  });
});
