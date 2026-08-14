import { expect, test, type Page } from "@playwright/test";

async function assertNotFoundFits(page: Page) {
  await expect(page.getByRole("heading", { name: /heeft zich laten meeslepen/i })).toBeVisible();

  const homeLink = page.getByRole("link", { name: /terug naar home/i });
  await expect(homeLink).toHaveAttribute("href", "/");
  await expect(page.getByText(/lokale profielen en antwoorden zijn niet weg/i)).toBeVisible();

  const hero = page.getByTestId("not-found-hero");
  await expect(hero).toBeVisible();

  const artwork = hero.locator('img[src*="404-pagina-niet-hier.PNG"]');
  await expect(artwork).toHaveCount(1);
  await expect.poll(async () => artwork.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const heroBox = await hero.boundingBox();
  expect(heroBox).not.toBeNull();
  if (heroBox) {
    expect(heroBox.x).toBeGreaterThanOrEqual(0);
    expect(heroBox.x + heroBox.width).toBeLessThanOrEqual((await page.viewportSize())!.width + 1);
  }

  await homeLink.scrollIntoViewIfNeeded();
  const linkBox = await homeLink.boundingBox();
  expect(linkBox).not.toBeNull();

  const bottomNav = page.locator(".bottom-nav");
  if (await bottomNav.isVisible()) {
    const navBox = await bottomNav.boundingBox();
    expect(navBox).not.toBeNull();
    if (linkBox && navBox) {
      expect(linkBox.y + linkBox.height).toBeLessThanOrEqual(navBox.y + 1);
    }
  }
}

test("unknown route lands on the KinkSync 404", async ({ page }) => {
  await page.goto("/this-route-is-not-collared");
  await assertNotFoundFits(page);
});

for (const viewport of [
  { name: "iPhone portrait", width: 393, height: 852 },
  { name: "short Safari viewport", width: 390, height: 600 },
  { name: "tablet portrait", width: 820, height: 1180 },
  { name: "tablet landscape", width: 1024, height: 768 },
  { name: "desktop landscape", width: 1440, height: 900 },
]) {
  test(`404 artwork stays contained on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/this-route-is-not-collared");
    await assertNotFoundFits(page);
  });
}
