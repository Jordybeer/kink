import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const roleCss = readFileSync(new URL("../app/design-role-tokens.css", import.meta.url), "utf8");
const pageShell = readFileSync(new URL("../components/PageShell.tsx", import.meta.url), "utf8");
const topNav = readFileSync(new URL("../components/TopNav.tsx", import.meta.url), "utf8");
const sheet = readFileSync(new URL("../components/Sheet.tsx", import.meta.url), "utf8");
const editorialHeading = readFileSync(new URL("../components/ui/EditorialHeading.tsx", import.meta.url), "utf8");
const profileScreen = readFileSync(new URL("../components/profile/ProfileScreen.tsx", import.meta.url), "utf8");
const questionsScreen = readFileSync(new URL("../components/profile/QuestionsScreen.tsx", import.meta.url), "utf8");

describe("shared layout roles", () => {
  it("keeps page and sheet insets in one semantic geometry layer", () => {
    for (const token of [
      "--page-gutter: 1.25rem",
      "--sheet-gutter: 1.25rem",
      "--reading-measure: 42rem",
      "--sheet-edge-clearance: 0.75rem",
    ]) {
      expect(roleCss).toContain(token);
    }
    expect(roleCss).toContain("--page-gutter: 1.5rem");
    expect(roleCss).toContain("--sheet-gutter: 1.5rem");
  });

  it("makes PageShell and both TopNav variants consume the same page gutter", () => {
    expect(pageShell).toContain("px-[var(--page-gutter)]");
    expect(topNav.match(/px-\[var\(--page-gutter\)\]/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("keeps profile and questionnaire route gutters on the shared page role", () => {
    expect(profileScreen.match(/var\(--page-gutter\)/g)?.length ?? 0).toBeGreaterThanOrEqual(7);
    expect(profileScreen.match(/var\(--page-gutter-wide\)/g)?.length ?? 0).toBeGreaterThanOrEqual(7);
    expect(questionsScreen).toContain("px-[var(--page-gutter)]");
    expect(questionsScreen).toContain("sm:px-[var(--page-gutter-wide)]");
  });

  it("keeps sheet geometry centralized instead of reintroducing per-sheet mobile gutters", () => {
    expect(sheet.match(/var\(--sheet-gutter\)/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(sheet).toContain("var(--sheet-edge-clearance)");
  });

  it("uses one editorial reading measure with balanced headings and pretty body copy", () => {
    expect(editorialHeading).toContain("max-w-[var(--reading-measure)]");
    expect(editorialHeading).toContain("text-balance");
    expect(editorialHeading).toContain("text-pretty");
  });
});
