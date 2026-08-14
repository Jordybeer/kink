import { test, expect } from "@playwright/test";

const MOBILE_VIEWPORTS = [
  { width: 393, height: 852, label: "iPhone 15-class" },
  { width: 375, height: 667, label: "compact iPhone" },
  { width: 390, height: 600, label: "Safari chrome pressure" },
] as const;

async function expectNoHorizontalOverflow(page: Parameters<typeof test>[0] extends never ? never : any) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));

  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("unknown route lands on the KinkSync 404", async ({ page }) => {
  await page.goto("/this-route-is-not-collared");

  await expect(page.getByRole("heading", { name: /heeft zich laten meeslepen/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /terug naar home/i })).toHaveAttribute("href", "/");
  await expect(page.getByText(/lokale profielen en antwoorden zijn niet weg/i)).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

for (const viewport of MOBILE_VIEWPORTS) {
  test(`404 stays usable at ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/this-route-is-not-collared");

    const hero = page.getByTestId("not-found-hero");
    const homeLink = page.getByRole("link", { name: /terug naar home/i });

    await expect(hero).toBeVisible();
    await expect(homeLink).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const heroBox = await hero.boundingBox();
    expect(heroBox).not.toBeNull();
    expect(heroBox!.x).toBeGreaterThanOrEqual(0);
    expect(heroBox!.x + heroBox!.width).toBeLessThanOrEqual(viewport.width + 1);

    await homeLink.scrollIntoViewIfNeeded();
    const linkBox = await homeLink.boundingBox();
    expect(linkBox).not.toBeNull();
    expect(linkBox!.x).toBeGreaterThanOrEqual(0);
    expect(linkBox!.x + linkBox!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(linkBox!.y + linkBox!.height).toBeLessThanOrEqual(viewport.height + 1);
  });
}
