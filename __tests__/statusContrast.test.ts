import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { STATUS_ORDER } from "@/lib/statusLabels";

/**
 * De harde grens was het slechtst leesbare label van de zes: 4,04:1 waar AA er
 * 4,5 vraagt. Uitgerekend de status die het zwaarst weegt.
 *
 * Deze test leest de tokens uit globals.css zelf in plaats van ze hier te
 * herhalen. Een tweede kopie zou precies de drift opleveren die dit probleem
 * veroorzaakte: de danger-variant kreeg ooit een eigen mengpercentage en niemand
 * rekende na wat dat met het contrast deed.
 */

const CSS = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function token(name: string): string {
  const match = CSS.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`token --${name} niet gevonden in globals.css`);
  return match[1];
}

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

/** color-mix(in srgb, <colour> <pct>%, var(--surface2)) zoals StatusOptionRows het doet. */
function mix(colour: string, pct: number): [number, number, number] {
  const c = rgb(colour);
  const bg = rgb(token("surface2"));
  return [0, 1, 2].map((i) => pct * c[i] + (1 - pct) * bg[i]) as [number, number, number];
}

// Spiegelt StatusOptionRows: danger mengt op 17%, de rest op 19%, en het label
// van de harde grens leest uit --hard-no-text.
const ROWS = STATUS_ORDER.map((status) => {
  const danger = status === "hard_no";
  return {
    status,
    label: danger ? token("hard-no-text") : token(status),
    fill: danger ? token("hard-no") : token(status),
    pct: danger ? 0.17 : 0.19,
  };
});

describe("statuslabels halen AA op hun eigen achtergrond", () => {
  for (const row of ROWS) {
    it(`${row.status} haalt minstens 4,5:1`, () => {
      const ratio = contrast(rgb(row.label), mix(row.fill, row.pct));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("de harde grens is niet langer het slechtst leesbare label", () => {
    const ratios = ROWS.map((row) => ({
      status: row.status,
      ratio: contrast(rgb(row.label), mix(row.fill, row.pct)),
    }));
    const worst = ratios.reduce((a, b) => (a.ratio <= b.ratio ? a : b));
    expect(worst.status).not.toBe("hard_no");
  });
});
