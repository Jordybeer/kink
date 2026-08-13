import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectInsideVisualViewport(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect.poll(async () => locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
    return Math.max(0, -rect.top, rect.bottom - visibleHeight);
  })).toBeLessThanOrEqual(1);
}

async function expectNoHorizontalOverflow(page: Page) {
  const layout = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(Math.max(layout.bodyWidth, layout.documentWidth)).toBeLessThanOrEqual(layout.viewportWidth + 1);
}

async function capture(page: Page, project: string, slug: string) {
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.screenshot({
    path: `test-results/device-screenshots/${project}/onboarding-${slug}.png`,
    fullPage: false,
  });
}

test("onboarding stays usable inside the browser viewport", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForLoadState("networkidle");

  const dialog = page.getByRole("dialog", { name: /welkom bij kinksync/i });
  await expectInsideVisualViewport(dialog);

  await page.getByRole("button", { name: /^begin$/i }).click();
  await page.getByRole("button", { name: /18\+/i }).click();
  await page.getByRole("button", { name: /kom maar door/i }).click();

  await expect(page.getByRole("heading", { name: /leg jullie kaarten op tafel/i })).toBeVisible();
  await expectInsideVisualViewport(page.getByRole("button", { name: /^verder/i }));
  await expectNoHorizontalOverflow(page);
  await capture(page, testInfo.project.name, "together");
  await page.getByRole("button", { name: /^verder/i }).click();

  await expect(page.getByRole("heading", { name: /niet voor iedere pottenkijker/i })).toBeVisible();
  await expectInsideVisualViewport(page.getByRole("button", { name: "PIN instellen" }));
  await expectInsideVisualViewport(page.getByRole("button", { name: "Niet nu" }));
  await expectNoHorizontalOverflow(page);
  await capture(page, testInfo.project.name, "privacy");
  await page.getByRole("button", { name: "Niet nu" }).click();

  await expect(page.getByRole("heading", { name: /genoeg voorspel/i })).toBeVisible();
  const finish = page.getByRole("button", { name: /naar kinksync/i });
  await expectInsideVisualViewport(finish);
  await expectNoHorizontalOverflow(page);
  await capture(page, testInfo.project.name, "finale");

  await finish.focus();
  await finish.press("Enter");
  await expect(page.getByRole("button", { name: "Begin met jouw profiel" })).toBeVisible();
  await expect(dialog).toBeHidden();
});
