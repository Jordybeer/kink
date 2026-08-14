import { expect, test, type Page } from "@playwright/test";

async function assertNotFoundFits(page: Page) {
  await expect(page.getByRole("heading", { name: /heeft zich laten meeslepen/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /terug naar home/i })).toHaveAttribute("href", "/");
  await expect(page.getByText(/lokale profielen en antwoorden zijn niet weg/i)).toBeVisible();

  const hero = page.getByTestId("not-found-hero");
  await expect(hero).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const box = await hero.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual((await page.viewportSize())!.width + 1);
  }
}

test("unknown route lands on the KinkSync 404", async ({ page }) => {
  await page.goto("/this-route-is-not-collared");
  await assertNotFoundFits(page);
});

for (const viewport of [
  { name: "iPhone portrait", width: 393, height: 852 },
  { name: "short Safari viewport", width: 390, height: 600 },
  { name: "tablet landscape", width: 1024, height: 768 },
  { name: "desktop landscape", width: 1440, height: 900 },
]) {
  test(`404 artwork stays contained on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/this-route-is-not-collared");
    await assertNotFoundFits(page);
  });
}
