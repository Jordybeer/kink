import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(new URL("../components/ui/AmbientGlow.tsx", import.meta.url), "utf8");
const globalsCss = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const ambientCss = globalsCss.slice(
  globalsCss.indexOf(".ks-ambient-glow"),
  globalsCss.indexOf("/* Preserve the confident Home wordmark"),
);

describe("AmbientGlow architecture", () => {
  it("keeps both hues semantic and configurable", () => {
    expect(component).toContain('topColor = "var(--identity-a)"');
    expect(component).toContain('bottomColor = "var(--identity-b)"');
    expect(component).toContain('"--ambient-top-color": topColor');
    expect(component).toContain('"--ambient-bottom-color": bottomColor');
    expect(component).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
    expect(ambientCss).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });

  it("contains slow orb motion inside one viewport and disables it on request", () => {
    expect(component.match(/ks-ambient-orb/g)).toHaveLength(4);
    expect(ambientCss).toContain("position: fixed");
    expect(ambientCss).toContain("z-index: -1");
    expect(ambientCss).toContain("height: 100svh");
    expect(ambientCss).toContain("contain: strict");
    expect(ambientCss).toContain("ks-ambient-drift-top 34s");
    expect(ambientCss).toContain("ks-ambient-drift-bottom 41s");
    expect(ambientCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(ambientCss).toMatch(/\.ks-ambient-orb\s*\{[\s\S]*?animation: none;/);
  });
});
