import { expect, test, type Page } from "@playwright/test";
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

async function openSettings(page: Page) {
  const trigger = page.getByRole("button", { name: "Meer opties" });
  await trigger.click();
  await page.getByRole("menuitem", { name: "Instellingen" }).click();
  return trigger;
}

test("Home identity stays centered in its stable masthead slots across viewport and offline states", async ({ page }) => {
  const viewports = [
    { width: 320, height: 740, offline: true },
    { width: 430, height: 740, offline: true },
    { width: 844, height: 390, offline: false },
    { width: 768, height: 1024, offline: false },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await seedAndGo(page, "/", PROFILES);

    const nav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
    const identity = page.locator("[data-home-identity]");
    const wordmark = identity.locator("[data-home-nav-wordmark]");
    const actions = nav.getByTestId("home-topnav-actions");
    const more = nav.getByRole("button", { name: "Meer opties" });

    await expect(nav.getByRole("button", { name: "Instellingen openen" })).toHaveCount(0);
    await expectCenteredWithin(identity, wordmark, 1);

    let [navBox, identityBox, wordmarkBox, actionsBox, moreBox] = await Promise.all([
      nav.boundingBox(),
      identity.boundingBox(),
      wordmark.boundingBox(),
      actions.boundingBox(),
      more.boundingBox(),
    ]);
    expect(navBox).not.toBeNull();
    expect(identityBox).not.toBeNull();
    expect(wordmarkBox).not.toBeNull();
    expect(actionsBox).not.toBeNull();
    expect(moreBox).not.toBeNull();
    expect(identityBox!.y).toBeGreaterThanOrEqual(navBox!.y - 1);
    expect(identityBox!.y + identityBox!.height).toBeLessThanOrEqual(navBox!.y + navBox!.height + 1);
    expect(moreBox!.x + moreBox!.width).toBeLessThanOrEqual(navBox!.x + navBox!.width);

    if (!viewport.offline) continue;

    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(nav.getByRole("status", { name: "Offline" })).toBeVisible();
    await expectCenteredWithin(identity, wordmark, 1);

    [navBox, identityBox, wordmarkBox, actionsBox, moreBox] = await Promise.all([
      nav.boundingBox(),
      identity.boundingBox(),
      wordmark.boundingBox(),
      actions.boundingBox(),
      more.boundingBox(),
    ]);
    expect(navBox).not.toBeNull();
    expect(identityBox).not.toBeNull();
    expect(wordmarkBox).not.toBeNull();
    expect(actionsBox).not.toBeNull();
    expect(moreBox).not.toBeNull();
    expect(identityBox!.y).toBeGreaterThanOrEqual(navBox!.y - 1);
    expect(identityBox!.y + identityBox!.height).toBeLessThanOrEqual(navBox!.y + navBox!.height + 1);
    expect(moreBox!.x + moreBox!.width).toBeLessThanOrEqual(navBox!.x + navBox!.width);

    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
  }
});

test("Settings uses a stable utility surface on mobile and a contained panel from tablet upward", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/", PROFILES);

  const trigger = await openSettings(page);
  let dialog = page.getByRole("dialog", { name: "Instellingen" });
  await expect(dialog).toHaveAttribute("data-sheet-variant", "surface");
  await expect(dialog.locator("[data-sheet-handle]")).toHaveCount(0);

  await expect.poll(async () => (await dialog.boundingBox())?.y ?? Number.POSITIVE_INFINITY)
    .toBeGreaterThanOrEqual(11);
  await expect.poll(async () => (await dialog.boundingBox())?.y ?? Number.NEGATIVE_INFINITY)
    .toBeLessThanOrEqual(13);
  const mobileBox = await dialog.boundingBox();
  expect(mobileBox).not.toBeNull();
  expect(mobileBox!.height).toBeGreaterThan(844 * 0.9);
  expect(mobileBox!.y).toBeGreaterThanOrEqual(11);
  expect(mobileBox!.y).toBeLessThanOrEqual(13);

  await dialog.getByRole("button", { name: "Instellingen sluiten" }).click();
  await expect(trigger).toBeFocused();

  for (const viewport of [
    { width: 768, height: 900 },
    { width: 1024, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await openSettings(page);
    dialog = page.getByRole("dialog", { name: "Instellingen" });
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(577);
    expect(Math.abs(box!.x + box!.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(2);
    expect(box!.y).toBeGreaterThan(20);
    await dialog.getByRole("button", { name: "Instellingen sluiten" }).click();
  }
});

test("kink edit uses the focused task presentation without a false drag affordance", async ({ page }) => {
  const emptyAlex = { ...PROFILE_ALEX, entries: {} };
  await page.setViewportSize({ width: 1024, height: 900 });
  await seedAndGo(page, "/profile/pw-alex-001", [emptyAlex]);

  await page.getByRole("button", { name: /Onderwerpen beheren/ }).click();
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
