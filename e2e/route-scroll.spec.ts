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

test("Home-navigatie blijft volledig zichtbaar bij scrollen en herladen", async ({ page, browserName, isMobile }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  const shared = { ...PROFILE_SAM, origin: "shared" as const, isImported: true };
  await seedAndGo(page, "/", [PROFILE_ALEX, shared], { onboardingComplete: true });
  const heading = page.getByRole("heading", { name: "Mijn profielen", exact: true });
  await expect(heading).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 80));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(40);

  const masthead = page.locator("[data-home-masthead]");
  const wordmark = page.locator("[data-home-nav-wordmark]");
  const subtitle = page.locator("[data-home-subtitle]");
  const more = page.getByRole("button", { name: "Meer opties" });
  await expect.poll(async () => (await masthead.boundingBox())?.y).toBe(0);
  expect((await wordmark.boundingBox())!.y).toBeGreaterThanOrEqual(36);
  // Send physical input to the already-visible sticky control. Locator.click's
  // preliminary scrollIntoView would move the document before the user input.
  await expect(more).toBeInViewport();
  const buttonBox = await more.boundingBox();
  expect(buttonBox).not.toBeNull();
  const x = buttonBox!.x + buttonBox!.width / 2;
  const y = buttonBox!.y + buttonBox!.height / 2;
  if (isMobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem").nth(1)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(more).toBeFocused();
  // Opening/closing navigation must not discard the reader's position.
  const scrollBeforeReload = await page.evaluate(() => window.scrollY);
  expect(scrollBeforeReload).toBeGreaterThan(40);

  await page.reload();
  await expect(heading).toBeVisible();
  expect(await page.evaluate(() => history.scrollRestoration)).toBe("auto");
  if (browserName === "webkit") {
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollBeforeReload);
  }
  await expect.poll(async () => (await masthead.boundingBox())?.y).toBe(0);
  const [wordmarkBox, subtitleBox, mastheadBox] = await Promise.all([
    wordmark.boundingBox(), subtitle.boundingBox(), masthead.boundingBox(),
  ]);
  expect(wordmarkBox).not.toBeNull();
  expect(subtitleBox).not.toBeNull();
  expect(mastheadBox).not.toBeNull();
  expect(wordmarkBox!.y).toBeGreaterThanOrEqual(36);
  expect(subtitleBox!.y + subtitleBox!.height).toBeLessThanOrEqual(mastheadBox!.y + mastheadBox!.height);

  // The header's geometry, not a forced scroll reset, keeps the identity visible.
  await page.evaluate(() => window.scrollTo(0, 80));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(40);
});
