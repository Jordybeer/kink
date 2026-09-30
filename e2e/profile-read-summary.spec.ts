import { expect, test } from "@playwright/test";
import { KINKS } from "../lib/kinks";
import type { Profile } from "../types";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

test("mature profile previews stay factual, private and readable in both themes", async ({ page }, testInfo) => {
  const impact = KINKS.filter((kink) => kink.category === "impact");
  const longNote = "Geenuitzonderingen".repeat(10);
  const profile: Profile = {
    ...PROFILE_ALEX,
    entries: Object.fromEntries(KINKS.map((kink) => [kink.id, { status: "willing", comment: "" }])),
  };
  impact.forEach((kink, index) => {
    profile.entries[kink.id] = {
      status: index < 5 ? "yes" : index < 7 ? "hard_no" : "willing",
      comment: index === 5 ? longNote : index === 6 ? "Deze grens staat vast." : "",
    };
  });
  profile.entries[impact[0].id] = {
    status: "yes", comment: "Dit blijft privé", tags: ["privégeheim"], curious: true, privateResponse: true,
  };
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAndGo(page, `/profile/${profile.id}`, [profile]);

  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const summary = page.getByTestId("profile-read-category-impact-summary");
    const toggle = page.getByTestId("profile-read-category-impact");
    const content = page.locator("#profile-read-category-impact-content");
    await expect(summary.getByText("Heel graag:", { exact: true })).toBeVisible();
    const firstPreview = summary.getByText(impact[1].name, { exact: true });
    const secondPreview = summary.getByText(impact[2].name, { exact: true });
    const remainder = summary.getByText("+2 meer", { exact: true });
    await expect(firstPreview).toBeVisible();
    await expect(secondPreview).toBeVisible();
    await expect(remainder).toBeVisible();
    // Names and the remainder are distinct reading lines, not a comma-packed sentence.
    const firstBox = (await firstPreview.boundingBox())!;
    const secondBox = (await secondPreview.boundingBox())!;
    expect(secondBox.y).toBeGreaterThanOrEqual(firstBox.y + firstBox.height);
    expect((await remainder.boundingBox())!.y).toBeGreaterThanOrEqual(secondBox.y + secondBox.height);
    expect(await firstPreview.evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
    await expect(toggle).toHaveAccessibleDescription(/en 2 meer met status Heel graag/);
    for (const kink of impact.slice(5, 7)) await expect(summary).toContainText(kink.name);
    await expect(summary.getByText("Deze grens staat vast.", { exact: true })).toBeVisible();
    await expect(summary).toContainText("1 privéantwoord");
    await expect(summary).not.toContainText(impact[0].name);
    await expect(summary).not.toContainText("Dit blijft privé");
    await expect(summary).not.toContainText("privégeheim");
    expect(await toggle.getAttribute("aria-controls")).toBe(await content.getAttribute("id"));
    await expect(content).toBeHidden();
    expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);

    // A phone width below the standard mobile fixture catches long unbroken notes.
    const widths = testInfo.project.name === "mobile" ? [320, 390] : [1280];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      await expect.poll(() => summary.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    }
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/profile-summary-${theme}.png`, fullPage: true });

    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(content.getByText(longNote, { exact: true })).toBeVisible();
    await expect(content).not.toContainText("Dit blijft privé");
    await expect.poll(() => content.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(content).toBeHidden();
    await expect(toggle).toBeFocused();
  }
});
