import { expect, test, type Page } from "@playwright/test";

async function assertNotFoundFits(page: Page) {
  await expect(page.getByRole("heading", { name: /hier is niets te vinden/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Hoofdnavigatie" })).toBeVisible();
  await expect(page.locator(".bottom-nav")).toBeHidden();

  const pageCopy = page.locator("#not-found-page");
  await expect(pageCopy).not.toContainText(/konijnenhol|rabbit hole|—|–/i);

  const homeLink = page.getByRole("link", { name: /terug naar home/i });
  await expect(homeLink).toHaveAttribute("href", "/");

  const reassurance = page.getByTestId("not-found-reassurance");
  await expect(reassurance).toContainText(/lokale profielen en antwoorden zijn niet weg/i);
  await expect(reassurance).toContainText(/alleen deze pagina ontbreekt/i);
  await expect(reassurance.locator("br")).toHaveCount(1);

  const hero = page.getByTestId("not-found-hero");
  await expect(hero).toBeVisible();

  const artwork = hero.locator('img[src*="404-pagina-niet-hier.PNG"]');
  await expect(artwork).toHaveCount(1);
  await expect.poll(async () => artwork.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  const heroBox = await hero.boundingBox();
  expect(heroBox).not.toBeNull();
  if (heroBox && viewport) {
    expect(heroBox.x).toBeGreaterThanOrEqual(0);
    expect(heroBox.x + heroBox.width).toBeLessThanOrEqual(viewport.width + 1);
  }

  await homeLink.scrollIntoViewIfNeeded();
  const linkBox = await homeLink.boundingBox();
  expect(linkBox).not.toBeNull();
  if (linkBox && viewport) {
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(linkBox.y + linkBox.height).toBeLessThanOrEqual(viewport.height + scrollY + 1);
  }
}

test("unknown route lands on the focused KinkSync 404", async ({ page }) => {
  await page.goto("/this-route-is-not-collared");
  await assertNotFoundFits(page);
});

test("404 ambient motion collapses for reduced-motion users", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/this-route-is-not-collared");

  const artwork = page.getByTestId("not-found-hero").locator('img[src*="404-pagina-niet-hier.PNG"]');
  await expect(artwork).toBeVisible();
  await expect(artwork).toHaveCSS("animation-name", "none");
});

for (const viewport of [
  { name: "375px mobile baseline", width: 375, height: 812 },
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

test("landscape uses the wide two-column composition", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/this-route-is-not-collared");

  const heroBox = await page.getByTestId("not-found-hero").boundingBox();
  const headingBox = await page.getByRole("heading", { name: /hier is niets te vinden/i }).boundingBox();

  expect(heroBox).not.toBeNull();
  expect(headingBox).not.toBeNull();
  if (heroBox && headingBox) {
    expect(heroBox.x + heroBox.width).toBeLessThan(headingBox.x + 12);
    expect(Math.abs((heroBox.y + heroBox.height / 2) - (headingBox.y + headingBox.height / 2))).toBeLessThan(heroBox.height / 2);
  }
});
