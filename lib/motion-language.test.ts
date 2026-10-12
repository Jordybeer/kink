import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Scenes-derived site motion language", () => {
  it("uses one tactile choice response across scenes, questionnaire, comparison and Home", () => {
    for (const path of [
      "app/scene/page.tsx",
      "components/StatusOptionRows.tsx",
      "components/TriageDeck.tsx",
      "components/CompareKinkRow.tsx",
      "components/compare/ProfileChip.tsx",
      "components/compare/ProfileSelectorSheet.tsx",
      "components/ProfileList.tsx",
    ]) {
      expect(source(path), path).toContain("ks-motion-choice");
    }
  });

  it("brings the scenes' state-progress timing to the questionnaire", () => {
    expect(source("components/profile/QuestionsScreen.tsx")).toContain("ks-motion-progress");
    const css = source("app/globals.css");
    expect(css).toMatch(/\.ks-motion-progress\s*\{[^}]*transition:[^}]*width[^}]*300ms/);
  });

  it("defines constrained, accessible transitions without ambient loops or persistent will-change", () => {
    const css = source("app/globals.css");
    const section = css.split("/* Scenes-derived shared interaction motion */")[1];
    expect(section).toBeTruthy();
    const motion = section!.split("/* End shared interaction motion */")[0];
    expect(motion).toMatch(/\.ks-motion-choice\s*\{/);
    expect(motion).toMatch(/\.ks-motion-choice:active:not\(:disabled\)/);
    expect(motion).toContain("prefers-reduced-motion: reduce");
    expect(motion).toMatch(/\.ks-motion-choice:active:not\(:disabled\)[^}]*\{[^}]*transform:\s*none/);
    expect(motion).toMatch(/\.ks-motion-progress\s*\{[^}]*transition:[^}]*width[^}]*300ms/);
    expect(motion).not.toMatch(/will-change|infinite|animation-iteration-count/);
  });

  it("keeps safety and privacy decisions independent of motion completion", () => {
    const safe = source("lib/motion.ts");
    expect(safe).toContain("Motion is presentation-only");
    expect(safe).toContain("reduced ? INSTANT");
  });
});
