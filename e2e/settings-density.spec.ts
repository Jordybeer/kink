import { expect, test, type Page } from "@playwright/test";
import { PROFILE_ALEX, seedProfiles } from "./fixtures";

async function overflowsVertically(locator: import("@playwright/test").Locator) {
  return locator.evaluate((element) => element.scrollHeight > element.clientHeight + 1);
}

async function overflowsHorizontally(locator: import("@playwright/test").Locator) {
  return locator.evaluate((element) => element.scrollWidth > element.clientWidth + 1);
}

async function openSettings(page: Page) {
  const more = page.getByRole("button", { name: "Instellingen", exact: true });
  await more.click();
  return more;
}

test("settings blijft compact met optionele installatie in de instellingen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedProfiles(page, [PROFILE_ALEX], { pinnedProfileId: PROFILE_ALEX.id });

  const homeNav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
  const contextAction = page.getByRole("button", { name: "Instellingen", exact: true });
  const installAction = page.getByRole("button", { name: "KinkSync installeren" });
  await expect(contextAction).toBeVisible();
  await expect(page.getByRole("button", { name: "Instellingen openen" })).toHaveCount(0);
  await expect(installAction).toHaveCount(0);
  expect(await overflowsHorizontally(homeNav)).toBe(false);

  const contextBox = await contextAction.boundingBox();
  expect(contextBox).not.toBeNull();
  expect(contextBox!.width).toBeGreaterThanOrEqual(44);
  expect(contextBox!.height).toBeGreaterThanOrEqual(44);

  await openSettings(page);
  const settings = page.getByRole("dialog", { name: "Instellingen" });
  const scrollBody = settings.getByTestId("sheet-scroll-body");
  await expect(settings).toBeVisible();
  expect(await overflowsVertically(scrollBody)).toBe(false);
  await expect(settings.getByText("KinkSync installeren", { exact: true })).toBeVisible();
  await expect(settings.getByText("Installatievragen", { exact: true })).toHaveCount(0);

  const backupIconColor = await settings
    .getByRole("button", { name: /Back-up maken/ })
    .locator("svg")
    .first()
    .evaluate((element) => getComputedStyle(element).color);
  const restoreIconColor = await settings
    .getByText("Back-up herstellen", { exact: true })
    .locator("xpath=ancestor::label")
    .locator("svg")
    .first()
    .evaluate((element) => getComputedStyle(element).color);
  const lockIconColor = await settings
    .getByRole("button", { name: /Appvergrendeling/ })
    .locator("svg")
    .first()
    .evaluate((element) => getComputedStyle(element).color);
  const aboutIconColor = await settings
    .getByRole("link", { name: /Over KinkSync/ })
    .locator("svg")
    .first()
    .evaluate((element) => getComputedStyle(element).color);

  expect(new Set([backupIconColor, restoreIconColor, lockIconColor, aboutIconColor]).size).toBe(1);

  await page.keyboard.press("Escape");
  await expect(settings).not.toBeVisible();

  await page.setViewportSize({ width: 375, height: 667 });
  await expect(contextAction).toBeVisible();
  await expect(installAction).toHaveCount(0);
  expect(await overflowsHorizontally(homeNav)).toBe(false);

  await page.setViewportSize({ width: 320, height: 568 });
  await expect(contextAction).toBeVisible();
  await expect(page.getByRole("button", { name: "Instellingen openen" })).toHaveCount(0);
  await expect(installAction).toHaveCount(0);
  expect(await overflowsHorizontally(homeNav)).toBe(false);

  await page.setViewportSize({ width: 390, height: 430 });
  await openSettings(page);
  await expect.poll(() => overflowsVertically(scrollBody)).toBe(true);
  await scrollBody.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(settings.getByRole("button", { name: /Alle data verwijderen/ })).toBeVisible();
});
async function expectSettingsGeometry(page: Page, settings: import("@playwright/test").Locator) {
  const scroll = settings.getByTestId("sheet-scroll-body");
  // A viewport resize resolves before its resize/visualViewport events necessarily
  // reach the bridge. Measure only after the sheet uses the requested viewport.
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  await expect(page.getByTestId("sheet-visual-viewport")).toHaveCSS("height", `${viewport!.height}px`);
  expect(await overflowsHorizontally(settings)).toBe(false);
  expect(await overflowsHorizontally(scroll)).toBe(false);
  expect(await overflowsHorizontally(settings.getByRole("heading", { name: "Instellingen", exact: true }))).toBe(false);
  const visibleBounds = (await settings.boundingBox())!;
  expect(visibleBounds.x).toBeGreaterThanOrEqual(-1);
  expect(visibleBounds.x + visibleBounds.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(visibleBounds.y).toBeGreaterThanOrEqual(-1);
  expect(visibleBounds.y + visibleBounds.height).toBeLessThanOrEqual(viewport!.height + 1);
  for (const text of await settings.locator("h2, h3, p, button span, a span, label span").all()) {
    if (!await text.isVisible()) continue;
    const box = (await text.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(visibleBounds.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(visibleBounds.x + visibleBounds.width + 1);
  }
  for (const target of await settings.locator('button, a, input[type="radio"], label:has(input[type="file"])').all()) {
    if (!await target.isVisible()) continue;
    const box = (await target.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const close = settings.getByRole("button", { name: "Instellingen sluiten" });
  await expect(close).toBeInViewport({ ratio: 1 });
  const before = (await close.boundingBox())!;
  expect(before.x).toBeGreaterThanOrEqual(-1);
  expect(before.x + before.width).toBeLessThanOrEqual(viewport!.width + 1);
  await scroll.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(settings.getByRole("button", { name: /Alle data verwijderen/ })).toBeInViewport({ ratio: 1 });
  await expect(close).toBeInViewport({ ratio: 1 });
  const after = (await close.boundingBox())!;
  expect(after.y).toBeCloseTo(before.y, 1);
  await scroll.evaluate((element) => { element.scrollTop = 0; });
}

test("Settings hierarchy, native theme geometry and enlarged text stay usable", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await seedProfiles(page, [PROFILE_ALEX]);
  await openSettings(page);
  const settings = page.getByRole("dialog", { name: "Instellingen" });
  await expect(settings.getByRole("heading", { level: 3 })).toHaveText(["Kleurmodus", "Gegevens", "Beveiliging", "KinkSync"]);
  const dark = settings.getByRole("radio", { name: "Donker", exact: true });
  await dark.check();
  const options = settings.getByTestId("settings-theme-options");
  const labelsBefore = await options.locator("label > span > span:last-child").evaluateAll((elements) => elements.map((element) => ({ x: element.getBoundingClientRect().x, y: element.getBoundingClientRect().y })));
  await settings.getByRole("radio", { name: "Licht", exact: true }).check();
  const labelsAfter = await options.locator("label > span > span:last-child").evaluateAll((elements) => elements.map((element) => ({ x: element.getBoundingClientRect().x, y: element.getBoundingClientRect().y })));
  expect(labelsAfter).toEqual(labelsBefore);
  expect(new Set(labelsAfter.map(({ y }) => y)).size).toBe(1);
  await expectSettingsGeometry(page, settings);
  const path = `screenshots/theme-rehearsal/settings-motion/${testInfo.project.name}`;
  await page.screenshot({ path: `${path}/settings-mobile-light.png` });
  await dark.check();
  await expectSettingsGeometry(page, settings);
  await page.screenshot({ path: `${path}/settings-mobile-dark.png` });
  await settings.getByRole("button", { name: /KinkSync installeren/ }).click();
  await expect(settings.getByText(/Installeren is geen back-up/)).toBeVisible();
  await expectSettingsGeometry(page, settings);
  await settings.getByTestId("sheet-scroll-body").evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({ path: `${path}/settings-install-open.png` });
  await settings.getByRole("button", { name: /KinkSync installeren/ }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expectSettingsGeometry(page, settings);
  expect((await settings.boundingBox())!.width).toBeLessThanOrEqual(576);
  await page.screenshot({ path: `${path}/settings-desktop.png` });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  expect(await page.locator("html").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBe(32);
  await expectSettingsGeometry(page, settings);
  // Text enlargement must leave useful reading width, including the fixed title
  // and an entire destructive action inside the single scroll body's budget.
  const title = settings.getByRole("heading", { name: "Instellingen", exact: true });
  expect(await title.evaluate((element) => element.getBoundingClientRect().height <= Number.parseFloat(getComputedStyle(element).lineHeight) + 1)).toBe(true);
  const destructive = settings.getByRole("button", { name: /Alle data verwijderen/ });
  expect((await destructive.boundingBox())!.height).toBeLessThanOrEqual(await settings.getByTestId("sheet-scroll-body").evaluate((element) => element.clientHeight));
  expect(new Set(await options.locator("label").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().y))).size).toBe(3);
  for (const label of await options.locator("label > span").all()) expect(await overflowsHorizontally(label)).toBe(false);
  await page.screenshot({ path: `${path}/settings-320-text-200.png` });
});

test("installation help opens and closes from the keyboard and Settings returns focus", async ({ page }) => {
  await seedProfiles(page, [PROFILE_ALEX]);
  // Supply an invitation so closed keyboard exclusion covers a real action.
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, { prompt: async () => {}, userChoice: Promise.resolve({ outcome: "dismissed" }) });
    window.dispatchEvent(event);
  });
  const more = await openSettings(page);
  const settings = page.getByRole("dialog", { name: "Instellingen" });
  const trigger = settings.getByRole("button", { name: /KinkSync installeren/ });
  const body = settings.locator(`[id=${JSON.stringify(await trigger.getAttribute("aria-controls"))}]`);
  await expect(body).toHaveAttribute("aria-hidden", "true");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(settings.getByRole("button", { name: "Installeer KinkSync", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Space");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(await body.evaluate((element) => (element as HTMLElement).inert)).toBe(true);
  await page.keyboard.press("Tab");
  await expect(settings.getByRole("button", { name: /Alle data verwijderen/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(settings).not.toBeVisible();
  await expect(more).toBeFocused();
});
