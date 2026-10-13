import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

async function expectRouteAtTop(page: import("@playwright/test").Page) {
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeLessThanOrEqual(1);
}

test("routewissels landen bovenaan ondanks de sticky navigatie", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/", [PROFILE_ALEX], { onboardingComplete: true });
  await expectRouteAtTop(page);

  await page.getByRole("button", { name: "Meer opties" }).click();
  await page.getByRole("menuitem", { name: "Over KinkSync" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expectRouteAtTop(page);

  await page.getByText("Technische verdieping", { exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

  await page.getByRole("link", { name: "Security & privacy" }).click();
  await expect(page).toHaveURL(/\/security$/);
  await expectRouteAtTop(page);
});