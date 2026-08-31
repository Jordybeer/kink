import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { STATUS_ORDER } from "@/lib/statusLabels";

const CSS = readFileSync(new URL("../app/design-role-tokens.css", import.meta.url), "utf8");

function palette(selector: RegExp): Record<string, string> {
  const block = CSS.match(selector)?.[1] ?? "";
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)]
      .map((match) => [match[1], match[2]]),
  );
}

const PALETTES = {
  dark: palette(/:root,\s*:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/m),
  light: palette(/:root\[data-theme="light"\]\s*\{([\s\S]*?)\}/m),
} as const;

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg: [number, number, number], bg: [number, number, number]): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

describe.each(Object.entries(PALETTES))("status labels — %s palette", (mode, tokens) => {
  function token(name: string): string {
    const value = tokens[name];
    if (!value) throw new Error(`${mode} token --${name} niet gevonden`);
    return value;
  }

  function mix(colour: string, pct: number): [number, number, number] {
    const foreground = rgb(colour);
    const background = rgb(token("surface2"));
    return [0, 1, 2].map((index) => (
      pct * foreground[index] + (1 - pct) * background[index]
    )) as [number, number, number];
  }

  const rows = STATUS_ORDER.map((status) => {
    const danger = status === "hard_no";
    return {
      status,
      label: danger ? token("hard-no-text") : token(status),
      fill: danger ? token("hard-no") : token(status),
      pct: danger ? 0.17 : 0.19,
    };
  });

  for (const row of rows) {
    it(`${row.status} haalt minstens 4,5:1`, () => {
      const ratio = contrast(rgb(row.label), mix(row.fill, row.pct));
      expect(ratio, `${mode} ${row.status}`).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("de harde grens is niet het slechtst leesbare label", () => {
    const ratios = rows.map((row) => ({
      status: row.status,
      ratio: contrast(rgb(row.label), mix(row.fill, row.pct)),
    }));
    const worst = ratios.reduce((a, b) => (a.ratio <= b.ratio ? a : b));
    expect(worst.status).not.toBe("hard_no");
  });
});
