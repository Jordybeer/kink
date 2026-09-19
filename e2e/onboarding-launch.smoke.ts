import { expect, test, type Locator, type Page } from "@playwright/test";

async function freshStart(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
}

async function expectWithinVisualViewport(locator: Locator) {
  await expect.poll(async () => locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const height = viewport?.height ?? window.innerHeight;
    const bottom = top + height;
    return Math.max(0, top - rect.top, rect.bottom - bottom);
  })).toBeLessThanOrEqual(1);
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
}

test("onboarding blijft bruikbaar van telefoon tot desktop", async ({ page }, testInfo) => {
  await freshStart(page);

  const dialog = page.getByRole("dialog", { name: "Welkom bij KinkSync" });
  await expect(dialog).toBeVisible();
  await expectWithinVisualViewport(dialog);
  await expectNoHorizontalOverflow(page);
  await expect(page.getByRole("button", { name: "Begin", exact: true })).toBeVisible();

  const firstContentColumn = dialog.locator(".max-w-sm").first();
  const firstColumnBox = await firstContentColumn.boundingBox();
  expect(firstColumnBox).not.toBeNull();
  if (testInfo.project.name === "desktop-chrome") {
    expect(firstColumnBox!.width).toBeGreaterThanOrEqual(430);
    expect(firstColumnBox!.width).toBeLessThanOrEqual(470);
  }

  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await expect(page.getByRole("heading", { name: "18+?" })).toBeVisible();
  await expectWithinVisualViewport(page.getByRole("button", { name: "Ik ben 18+", exact: true }));

  await page.getByRole("button", { name: "Ik ben 18+", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Hoe klinkt dit voor jou/i })).toBeVisible();
  await expectWithinVisualViewport(page.getByRole("button", { name: /Kom maar door/i }));
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: /Kom maar door/i }).click();
  await expect(page.getByRole("heading", { name: /Leg jullie kaarten op tafel/i })).toBeVisible();
  await expectWithinVisualViewport(page.getByRole("button", { name: "Verder", exact: true }));

  await page.getByRole("button", { name: "Verder", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Niet voor iedere pottenkijker/i })).toBeVisible();
  await expectWithinVisualViewport(page.getByRole("button", { name: "Niet nu", exact: true }));

  await page.getByRole("button", { name: "Niet nu", exact: true }).click();
  const dial = page.getByTestId("onboarding-turn-dial");
  await expect(dial).toBeVisible();
  await expectWithinVisualViewport(dial);
  await dial.press("Enter");

  await expect(page.getByRole("button", { name: /^Maak mijn profiel\b/ })).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole("button", { name: /^Scan gedeeld profiel\b/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Backup herstellen\b/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
