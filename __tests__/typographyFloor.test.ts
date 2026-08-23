import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function cssRuleFor(selectorNeedle: string): string {
  const selectorIndex = globalsCss.indexOf(selectorNeedle);
  expect(selectorIndex, `${selectorNeedle} missing from typography guard`).toBeGreaterThanOrEqual(0);
  const open = globalsCss.indexOf("{", selectorIndex);
  const close = globalsCss.indexOf("}", open);
  expect(open).toBeGreaterThan(selectorIndex);
  expect(close).toBeGreaterThan(open);
  return globalsCss.slice(open + 1, close);
}

describe("semantic typography floor", () => {
  it("keeps interactive text at the 14px readable floor", () => {
    const rule = cssRuleFor(':is(button, a, label)[class~="text-xs"]');
    expect(rule).toContain("font-size: 0.875rem");
    expect(rule).toContain("line-height: 1.25rem");
  });

  it("lifts legacy explanatory copy and meaningful state text", () => {
    const rule = cssRuleFor('p[class~="text-xs"]');
    expect(rule).toContain("font-size: 0.875rem");
    expect(globalsCss).toContain('[role="alert"][class~="text-xs"]');
    expect(globalsCss).toContain('[data-testid="question-essence"]');
    expect(globalsCss).toContain('[data-testid="question-agreements-label"]');
    expect(globalsCss).toContain('[data-testid="about-promises"] p');
    expect(globalsCss).toContain('span[class~="text-xs"][class~="font-medium"][class~="rounded-full"]');
  });

  it("preserves the deliberate 12px PWA navigation-label floor", () => {
    const rule = cssRuleFor('.bottom-nav [class~="text-xs"]');
    expect(rule).toContain("font-size: 0.75rem");
    expect(rule).toContain("line-height: 1rem");
  });
});
