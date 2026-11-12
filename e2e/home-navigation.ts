import { expect, type Locator, type Page } from "@playwright/test";

// Use physical input on visible sticky controls. Locator.click() first calls
// scrollIntoView, which would hide a focus-induced document scroll regression.
export async function pressVisibleControl(page: Page, control: Locator, isMobile: boolean) {
  await expect(control).toBeInViewport();
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error("Expected a visible navigation control");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (isMobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

export async function expectHomeHeightBudget(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const masthead = document.querySelector("[data-home-masthead]");
    if (!masthead) return Number.POSITIVE_INFINITY;
    return Math.abs(masthead.getBoundingClientRect().height
      - Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop));
  })).toBeLessThanOrEqual(1);
}

export async function expectContentHeightBudget(page: Page) {
  await expect(page.locator("[data-home-masthead]")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const header = document.querySelector('[data-top-nav-variant="content"]')?.parentElement;
    if (!header) return Number.POSITIVE_INFINITY;
    return Math.abs(header.getBoundingClientRect().height
      - Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop));
  })).toBeLessThanOrEqual(1);
  expect(await page.locator("html").evaluate((element) =>
    element.style.getPropertyValue("--home-masthead-h"),
  )).toBe("");
}

async function expectHomeMastheadGeometry(masthead: Locator) {
  await expect.poll(async () => (await masthead.boundingBox())?.y).toBe(0);
  const geometry = await masthead.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const nav = element.querySelector("nav")!.getBoundingClientRect();
    const utility = element.querySelector('[data-testid="home-topnav-settings"]')!.getBoundingClientRect();
    const subtitle = element.querySelector("[data-home-subtitle]")!.getBoundingClientRect();
    return {
      utilityTopInset: utility.top - nav.top,
      subtitleBottom: subtitle.bottom,
      mastheadBottom: bounds.bottom,
      background: getComputedStyle(element).backgroundColor,
      pageBackground: getComputedStyle(document.documentElement).backgroundColor,
      shieldsCoveredContent: element.contains(document.elementFromPoint(bounds.left + bounds.width / 2, bounds.bottom - 1)),
    };
  });
  expect(geometry.utilityTopInset).toBeGreaterThanOrEqual(31);
  expect(geometry.utilityTopInset).toBeLessThanOrEqual(33);
  expect(geometry.subtitleBottom).toBeLessThanOrEqual(geometry.mastheadBottom);
  expect(geometry.background).toBe(geometry.pageBackground);
  expect(geometry.shieldsCoveredContent).toBe(true);
}

export async function checkScrolledHomeReload(page: Page, isMobile: boolean) {
  const heading = page.getByRole("heading", { name: "Mijn profielen", exact: true });
  await expect(heading).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; });
  await expectHomeHeightBudget(page);
  await page.evaluate(() => window.scrollTo(0, 80));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(80);

  const masthead = page.locator("[data-home-masthead]");
  const settingsTrigger = masthead.getByRole("button", { name: "Instellingen", exact: true });
  await expectHomeMastheadGeometry(masthead);
  await pressVisibleControl(page, settingsTrigger, isMobile);
  const settings = page.getByRole("dialog", { name: "Instellingen" });
  await expect(settings).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(80);
  await page.keyboard.press("Escape");
  await expect(settings).toBeHidden();
  await expect(settingsTrigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(80);

  // Reload offsets vary across engines. KinkSync leaves restoration browser-owned;
  // sticky geometry is checked at y=80 above and on the new document below.
  await page.reload();
  await expect(heading).toBeVisible();
  expect(await page.evaluate(() => history.scrollRestoration)).toBe("auto");
  await page.evaluate(async () => { await document.fonts.ready; });
  await expectHomeHeightBudget(page);
  await expectHomeMastheadGeometry(masthead);
}

export async function checkScrolledContentMenu(page: Page, isMobile: boolean) {
  await expectContentHeightBudget(page);
  const more = page.getByLabel("Hoofdnavigatie").getByRole("button", { name: "Meer acties", exact: true });
  await page.evaluate(() => window.scrollTo(0, 80));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(80);
  await pressVisibleControl(page, more, isMobile);
  const menu = page.getByRole("menu");
  const share = menu.getByRole("menuitem", { name: "Profiel delen", exact: true });
  await expect(menu).toBeVisible();
  await expect(share).toBeFocused();
  // This real profile menu has one item; all navigation keys wrap to it.
  for (const key of ["ArrowDown", "ArrowUp", "End", "Home"]) {
    await page.keyboard.press(key);
    await expect(share).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(80);
  }
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(more).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(80);
}
