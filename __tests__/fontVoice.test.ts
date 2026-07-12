import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// One serif voice, one spelling. The display font used to be summoned three
// different ways with three different fallback strings; this guard keeps
// every inline invocation on the single canonical incantation. (The chart
// components' camelCase `fontDisplay` palette keys read the CSS var at
// runtime and are exempt, like every other canvas palette.)

const CANONICAL = 'fontFamily: "var(--font-display, Georgia, serif)"';
const ROOT = join(__dirname, "..");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe("fontVoice — the serif speaks with one tongue", () => {
  it("every inline font-display use is the canonical spelling", () => {
    const offenders: string[] = [];
    for (const file of [...walk(join(ROOT, "app")), ...walk(join(ROOT, "components"))]) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/fontFamily:\s*("|')[^"']*font-display[^"']*("|')/g)) {
        if (m[0] !== CANONICAL) offenders.push(`${file}: ${m[0]}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
