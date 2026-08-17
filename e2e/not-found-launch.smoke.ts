import { expect, test } from "@playwright/test";
import { STORE_PERSIST_VERSION } from "../lib/storePersistVersion";

test.beforeEach(async ({ page }) => {
  // Launch-matrix 404 coverage is an established-user UI contract. Fresh users
  // intentionally hit onboarding first; new-user.spec.ts guards that behavior.
  await page.addInitScript((version) => {
    localStorage.setItem(
      "kink-profiles",
      JSON.stringify({ state: { onboardingComplete: true }, version }),
    );
  }, STORE_PERSIST_VERSION);
});

test("404 stays usable on the launch device matrix", async ({ page }) => {
  await page.goto("/this-route-is-not-collared");

  const hero = page.getByTestId("not-found-hero");
  const homeLink = page.getByRole("link", { name: /terug naar home/i });
  const pageCopy = page.locator("#not-found-page");

  await expect(hero).toBeVisible();
  await expect(page.getByRole("heading", { name: /hier is niets te vinden/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Hoofdnavigatie" })).toBeVisible();
  await expect(page.locator(".bottom-nav")).toBeHidden();
  await expect(pageCopy).not.toContainText(/konijnenhol|rabbit hole|—|–/i);
  await expect(homeLink).toBeVisible();

  const artwork = hero.locator('img[src*="404-pagina-niet-hier.PNG"]');
  await expect.poll(async () => artwork.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await homeLink.scrollIntoViewIfNeeded();
  await expect(homeLink).toBeVisible();
});
