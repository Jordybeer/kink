import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, seedProfiles } from "./fixtures";

async function overflowsVertically(locator: import("@playwright/test").Locator) {
  return locator.evaluate((element) => element.scrollHeight > element.clientHeight + 1);
}

async function overflowsHorizontally(locator: import("@playwright/test").Locator) {
  return locator.evaluate((element) => element.scrollWidth > element.clientWidth + 1);
}

test("settings blijft compact en installatie verhuist rustig naar de Home-TopNav", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedProfiles(page, [PROFILE_ALEX], { pinnedProfileId: PROFILE_ALEX.id });

  await page.evaluate(() => {
    (window as Window & { __installPrompt?: Event }).__installPrompt = new Event("beforeinstallprompt");
    window.dispatchEvent(new Event("kinksync:installpromptchange"));
  });

  const homeNav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
  const contextAction = page.getByRole("button", { name: "Meer over KinkSync" });
  const installAction = page.getByRole("button", { name: "KinkSync installeren" });
  const settingsAction = page.getByRole("button", { name: "Instellingen openen" });
  await expect(contextAction).toBeVisible();
  await expect(installAction).toBeVisible();
  await expect(settingsAction).toBeVisible();
  expect(await overflowsHorizontally(homeNav)).toBe(false);

  for (const action of [contextAction, installAction, settingsAction]) {
    const box = await action.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  await settingsAction.click();
  const settings = page.getByRole("dialog", { name: "Instellingen" });
  const scrollBody = settings.getByTestId("sheet-scroll-body");
  await expect(settings).toBeVisible();
  expect(await overflowsVertically(scrollBody)).toBe(false);
  await expect(settings.getByText("KinkSync installeren", { exact: true })).toHaveCount(0);
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

  expect(new Set([backupIconColor, restoreIconColor, lockIconColor, aboutIconColor]).size).toBe(4);

  await page.keyboard.press("Escape");
  await expect(settings).not.toBeVisible();
  await installAction.click();
  const installGuide = page.getByRole("dialog", { name: "KinkSync installeren" });
  await expect(installGuide).toBeVisible();
  await page.getByRole("button", { name: "Sluit installatiemelding" }).click();
  await expect(installGuide).not.toBeVisible();

  await page.setViewportSize({ width: 375, height: 667 });
  await expect(contextAction).toBeVisible();
  expect(await overflowsHorizontally(homeNav)).toBe(false);

  await page.setViewportSize({ width: 320, height: 568 });
  await expect(contextAction).toBeVisible();
  await expect(installAction).toBeVisible();
  await expect(settingsAction).toBeVisible();
  expect(await overflowsHorizontally(homeNav)).toBe(false);

  await page.setViewportSize({ width: 390, height: 430 });
  await settingsAction.click();
  await expect.poll(() => overflowsVertically(scrollBody)).toBe(true);
  await scrollBody.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(settings.getByRole("button", { name: /Alle data verwijderen/ })).toBeVisible();
});
