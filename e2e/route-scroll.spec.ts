import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

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

test("Home herladen na scrollen toont de volledige masthead", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  const shared = { ...PROFILE_SAM, origin: "shared" as const, isImported: true };
  await seedAndGo(page, "/", [PROFILE_ALEX, shared], { onboardingComplete: true });
  const heading = page.getByRole("heading", { name: "Mijn profielen", exact: true });
  await expect(heading).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 80));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(40);

  await page.reload();
  await expect(heading).toBeVisible();
  await expectRouteAtTop(page);
  const wordmark = page.locator("[data-home-nav-wordmark]");
  const subtitle = page.locator("[data-home-subtitle]");
  const [wordmarkBox, subtitleBox, headingBox] = await Promise.all([
    wordmark.boundingBox(), subtitle.boundingBox(), heading.boundingBox(),
  ]);
  expect(wordmarkBox).not.toBeNull();
  expect(subtitleBox).not.toBeNull();
  expect(headingBox).not.toBeNull();
  expect(wordmarkBox!.y).toBeGreaterThanOrEqual(36);
  expect(subtitleBox!.y + subtitleBox!.height).toBeLessThan(headingBox!.y);

  // Ordinary scrolling must remain possible after the one-off reload reset.
  await page.evaluate(() => window.scrollTo(0, 80));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(40);
});
