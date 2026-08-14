import { expect, test } from "@playwright/test";

test("404 stays usable on the launch device matrix", async ({ page }) => {
  await page.goto("/this-route-is-not-collared");

  const hero = page.getByTestId("not-found-hero");
  const homeLink = page.getByRole("link", { name: /terug naar home/i });

  await expect(hero).toBeVisible();
  await expect(page.getByRole("heading", { name: /heeft zich laten meeslepen/i })).toBeVisible();
  await expect(homeLink).toBeVisible();

  const artwork = hero.locator('img[src*="404-pagina-niet-hier.PNG"]');
  await expect.poll(async () => artwork.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await homeLink.scrollIntoViewIfNeeded();
  const linkBox = await homeLink.boundingBox();
  const bottomNav = page.locator(".bottom-nav");

  if (linkBox && await bottomNav.isVisible()) {
    const navBox = await bottomNav.boundingBox();
    if (navBox) expect(linkBox.y + linkBox.height).toBeLessThanOrEqual(navBox.y + 1);
  }
});
