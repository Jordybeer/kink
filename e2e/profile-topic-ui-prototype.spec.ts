import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

test("profile topic prototype stays flat and scan-friendly in light and dark themes", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAndGo(page, "/profile/pw-alex-001", [PROFILE_ALEX]);

  await page.getByRole("button", { name: /Onderwerpen beheren/ }).click();
  const manager = page.locator("#profile-catalog-manager");
  const categoryFilter = manager.getByRole("button", { name: /Categorie.*Alle categorieën/ });
  await expect(categoryFilter).toBeVisible();

  const impactHeader = manager.locator('button[aria-controls="category-impact-content"]');
  await impactHeader.click();
  const impactContent = manager.locator("#category-impact-content");
  await expect(impactContent).toBeVisible();
  await expect(impactContent.locator('button[aria-label$=", bewerken"]').first()).toBeVisible();

  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.screenshot({
      path: `screenshots/theme-rehearsal/${testInfo.project.name}/profile-topic-prototype-${theme}.png`,
      fullPage: false,
    });
  }

  await expect.poll(() => manager.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);

  const firstRow = impactContent.locator('button[aria-label$=", bewerken"]').first();
  await firstRow.click();
  const dialog = page.locator('[role="dialog"][data-sheet-variant="task"]');
  const body = dialog.getByTestId("sheet-scroll-body");
  const footer = dialog.getByTestId("sheet-footer");
  await expect(dialog).toBeVisible();
  await expect(footer.getByRole("button", { name: "Klaar" })).toBeVisible();
  await expect.poll(() => body.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
});
