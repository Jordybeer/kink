import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

const PROFILES = [PROFILE_ALEX, PROFILE_SAM];

async function expectCenteredWithin(
  outer: import("@playwright/test").Locator,
  inner: import("@playwright/test").Locator,
  tolerance = 2,
) {
  const [outerBox, innerBox] = await Promise.all([outer.boundingBox(), inner.boundingBox()]);
  expect(outerBox).not.toBeNull();
  expect(innerBox).not.toBeNull();
  expect(Math.abs(
    innerBox!.x + innerBox!.width / 2
      - (outerBox!.x + outerBox!.width / 2),
  )).toBeLessThanOrEqual(tolerance);
}

test("Home wordmark stays centered when offline status changes the right cluster", async ({ page }) => {
  for (const width of [320, 430]) {
    await page.setViewportSize({ width, height: 740 });
    await seedAndGo(page, "/", PROFILES);

    const nav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
    const wordmark = nav.locator("[data-home-nav-wordmark]");
    const settings = nav.getByRole("button", { name: "Instellingen openen" });
    const more = nav.getByRole("button", { name: "Meer opties" });

    await expectCenteredWithin(nav, wordmark, 1);

    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(nav.getByRole("status", { name: "Offline" })).toBeVisible();
    await expectCenteredWithin(nav, wordmark, 1);

    const [settingsBox, wordmarkBox, moreBox] = await Promise.all([
      settings.boundingBox(),
      wordmark.boundingBox(),
      more.boundingBox(),
    ]);
    expect(settingsBox).not.toBeNull();
    expect(wordmarkBox).not.toBeNull();
    expect(moreBox).not.toBeNull();
    expect(settingsBox!.x + settingsBox!.width).toBeLessThan(wordmarkBox!.x);
    expect(wordmarkBox!.x + wordmarkBox!.width).toBeLessThan(moreBox!.x);

    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
  }
});

test("Settings uses a stable utility surface on mobile and a contained panel on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/", PROFILES);

  const trigger = page.getByRole("button", { name: "Instellingen openen" });
  await trigger.click();
  let dialog = page.getByRole("dialog", { name: "Instellingen" });
  await expect(dialog).toHaveAttribute("data-sheet-variant", "surface");
  await expect(dialog.locator("[data-sheet-handle]")).toHaveCount(0);

  const mobileBox = await dialog.boundingBox();
  expect(mobileBox).not.toBeNull();
  expect(mobileBox!.height).toBeGreaterThan(844 * 0.9);
  expect(mobileBox!.y).toBeLessThanOrEqual(10);

  await dialog.getByRole("button", { name: "Instellingen sluiten" }).click();
  await expect(trigger).toBeFocused();

  await page.setViewportSize({ width: 1024, height: 900 });
  await trigger.click();
  dialog = page.getByRole("dialog", { name: "Instellingen" });
  const desktopBox = await dialog.boundingBox();
  expect(desktopBox).not.toBeNull();
  expect(desktopBox!.width).toBeLessThanOrEqual(577);
  expect(Math.abs(desktopBox!.x + desktopBox!.width / 2 - 512)).toBeLessThanOrEqual(2);
  expect(desktopBox!.y).toBeGreaterThan(20);
});

test("kink edit uses the focused task presentation without a false drag affordance", async ({ page }) => {
  const emptyAlex = { ...PROFILE_ALEX, entries: {} };
  await page.setViewportSize({ width: 1024, height: 900 });
  await seedAndGo(page, "/profile/pw-alex-001", [emptyAlex]);

  const editTab = page.getByRole("tab", { name: "Bewerken" });
  if (await editTab.count() > 0) await editTab.first().click();
  await page.getByPlaceholder("Zoek in de volledige catalogus…").fill("spanking");

  const result = page.locator('button[aria-label*=", nog niet beoordeeld"][aria-label*=", bewerken"]').first();
  await expect(result).toBeVisible();
  await result.click();

  const dialog = page.locator('[role="dialog"][data-sheet-variant="task"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-sheet-handle]")).toHaveCount(0);
  await expect(dialog.getByRole("group", { name: "Status kiezen" })).toBeVisible();

  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(513);
  expect(Math.abs(box!.x + box!.width / 2 - 512)).toBeLessThanOrEqual(2);

  await dialog.getByRole("button", { name: "Klaar" }).click();
  await expect(dialog).toBeHidden();
  await expect(result).toBeFocused();
});

test("short profile actions remain a true quick sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/", PROFILES);

  const trigger = page.getByRole("button", { name: "Meer acties voor Alex" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Acties voor Alex" });

  await expect(dialog).toHaveAttribute("data-sheet-variant", "sheet");
  await expect(dialog.locator("[data-sheet-handle]")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Annuleren" }).click();
  await expect(trigger).toBeFocused();
});
