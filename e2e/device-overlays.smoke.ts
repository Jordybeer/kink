import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedProfiles } from "./fixtures";
import type { Profile } from "@/types";

const SHARED_SAM: Profile = {
  ...PROFILE_SAM,
  isImported: true,
  origin: "shared",
};

const OWN_PROFILES: Profile[] = Array.from({ length: 8 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    ...PROFILE_ALEX,
    id: "owned-" + number,
    name: "Eigen " + number,
    isImported: false,
    origin: "own",
    personGroupId: undefined,
    switchShareProof: undefined,
  };
});

const SHARED_PROFILES: Profile[] = Array.from({ length: 8 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    ...PROFILE_SAM,
    id: "shared-" + number,
    name: "Gedeeld " + number,
    isImported: true,
    origin: "shared",
    personGroupId: undefined,
    switchShareProof: undefined,
  };
});

const MANY_PROFILES = [PROFILE_ALEX, ...OWN_PROFILES, SHARED_SAM, ...SHARED_PROFILES];

async function expectVisualViewportContract(page: Page) {
  await expect.poll(async () => page.evaluate(() => {
    const rendered = Number.parseFloat(
      document.documentElement.style.getPropertyValue("--visual-viewport-height"),
    );
    const visible = Math.round(window.visualViewport?.height ?? window.innerHeight);
    return Number.isFinite(rendered) ? Math.abs(rendered - visible) : Number.POSITIVE_INFINITY;
  })).toBeLessThanOrEqual(1);
}

async function expectWithinVisualViewport(locator: Locator) {
  await expect.poll(async () => locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
    return Math.max(0, -rect.top, rect.bottom - visibleHeight);
  })).toBeLessThanOrEqual(1);
}

async function saveScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.screenshot({
    path: "test-results/device-screenshots/" + testInfo.project.name + "/" + name + ".png",
    fullPage: false,
  });
}

test("lange overlays blijven bruikbaar bij browserhoogte en dynamische toolbar", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedProfiles(page, MANY_PROFILES, { pinnedProfileId: PROFILE_ALEX.id });

  const mineHeading = page.getByRole("heading", { name: "Mijn profielen" });
  const sharedHeading = page.getByRole("heading", { name: "Gedeeld met mij" });
  await expect(mineHeading).toBeVisible();
  await expect(sharedHeading).toBeVisible();
  await expect(page.getByRole("link", { name: "Gedeeld 08 Submissive openen" })).toBeVisible();
  await sharedHeading.scrollIntoViewIfNeeded();
  await saveScreenshot(page, testInfo, "home-profile-groups");

  const settingsTrigger = page.getByRole("button", { name: "Meer opties" });
  await settingsTrigger.click();
  await page.getByRole("menuitem", { name: "Instellingen" }).click();
  const settings = page.getByRole("dialog", { name: "Instellingen" });
  const settingsTitle = settings.getByRole("heading", { name: "Instellingen" });
  const settingsScroll = settings.getByTestId("sheet-scroll-body");
  const deleteAll = settings.getByRole("button", { name: /Alle data verwijderen/ });
  await expect(settings).toBeVisible();

  const originalViewport = page.viewportSize();
  if (originalViewport && testInfo.project.name.startsWith("iphone")) {
    await page.setViewportSize({
      width: originalViewport.width,
      height: Math.max(520, Math.min(600, originalViewport.height - 96)),
    });
    await expectVisualViewportContract(page);
  }

  const backgroundScrollY = await page.evaluate(() => window.scrollY);
  const settingsTitleBox = await settingsTitle.boundingBox();
  expect(settingsTitleBox).not.toBeNull();
  const settingsTitleTop = settingsTitleBox!.y;
  const settingsOverflows = await settingsScroll.evaluate(
    (element) => element.scrollHeight > element.clientHeight + 1,
  );

  await settingsScroll.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  if (settingsOverflows) {
    await expect.poll(() => settingsScroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  } else {
    await expect.poll(() => settingsScroll.evaluate((element) => element.scrollTop)).toBe(0);
  }
  await expectWithinVisualViewport(deleteAll);
  expect((await settingsTitle.boundingBox())!.y).toBeCloseTo(settingsTitleTop, 0);
  expect(await page.evaluate(() => window.scrollY)).toBe(backgroundScrollY);
  await saveScreenshot(page, testInfo, "settings-scrolled");

  await settings.getByRole("button", { name: "Instellingen sluiten" }).click();
  await expect(settings).toBeHidden();
  await expect(settingsTrigger).toBeFocused();

  if (originalViewport && testInfo.project.name.startsWith("iphone")) {
    await page.setViewportSize(originalViewport);
    await expectVisualViewportContract(page);
  }

  const quickActionsTrigger = page.getByRole("button", { name: "Meer acties voor Alex" });
  await quickActionsTrigger.click();
  const quickActions = page.getByRole("dialog", { name: "Acties voor Alex" });
  await expect(quickActions).toHaveAttribute("data-sheet-variant", "sheet");
  await saveScreenshot(page, testInfo, "profile-quick-actions");
  await quickActions.getByRole("button", { name: "Profiel verwijderen" }).click();

  const deleteProfileDialog = page.getByRole("dialog", { name: "Profiel verwijderen" });
  await expect(deleteProfileDialog).toBeVisible();
  await saveScreenshot(page, testInfo, "profile-delete-confirmation");
  await deleteProfileDialog.getByRole("button", { name: "Annuleer" }).click();
  await expect(deleteProfileDialog).toBeHidden();

  await page.goto("/profile/" + PROFILE_ALEX.id);
  await page.waitForLoadState("networkidle");
  const editTrigger = page.getByRole("button", { name: "Profiel bewerken" });
  await editTrigger.click();
  const editDialog = page.getByRole("dialog", { name: "Profiel bewerken" });
  const editBody = editDialog.getByTestId("profile-edit-scroll-body");
  const editFooter = editDialog.getByTestId("profile-edit-footer");
  await expect(editDialog).toBeVisible();
  const editOverflows = await editBody.evaluate(
    (element) => element.scrollHeight > element.clientHeight + 1,
  );
  await editBody.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  if (editOverflows) {
    await expect.poll(() => editBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  } else {
    await expect.poll(() => editBody.evaluate((element) => element.scrollTop)).toBe(0);
  }
  await expectWithinVisualViewport(editFooter);
  await saveScreenshot(page, testInfo, "profile-edit-scrolled");
  await editDialog.getByRole("button", { name: "Annuleer" }).click();
  await expect(editTrigger).toBeFocused();

  const kinkEditTab = page.getByRole("tab", { name: "Bewerken" });
  await kinkEditTab.click();
  const kinkSearch = page.getByPlaceholder("Zoek in de volledige catalogus…");
  await kinkSearch.fill("spanking");
  const kinkResult = page.locator('button[aria-label*=", bewerken"]').filter({ hasText: /spanking/i }).first();
  await expect(kinkResult).toBeVisible();
  await kinkResult.click();
  const kinkDialog = page.locator('[role="dialog"][data-sheet-variant="task"]');
  await expect(kinkDialog).toBeVisible();
  await expect(kinkDialog.locator("[data-sheet-handle]")).toHaveCount(0);
  await expectWithinVisualViewport(kinkDialog);
  await saveScreenshot(page, testInfo, "kink-edit-task");
  await kinkDialog.getByRole("button", { name: "Klaar" }).click();
  await expect(kinkResult).toBeFocused();

  const shareTrigger = page.getByRole("button", { name: "Profiel delen" });
  await shareTrigger.click();
  const shareDialog = page.getByRole("dialog", { name: "Profiel delen" });
  const qr = shareDialog.getByTestId("profile-share-qr");
  await expect(qr).toBeVisible({ timeout: 15000 });
  await expectWithinVisualViewport(qr);
  await saveScreenshot(page, testInfo, "profile-share-qr");
  const closeShare = shareDialog.getByRole("button", { name: "Sluit" });
  await closeShare.scrollIntoViewIfNeeded();
  await expectWithinVisualViewport(closeShare);
  await saveScreenshot(page, testInfo, "profile-share-bottom");
  await closeShare.click();
  await expect(shareTrigger).toBeFocused();

  await page.goto("/compare?a=" + PROFILE_ALEX.id + "&b=" + PROFILE_SAM.id);
  await page.waitForLoadState("networkidle");
  const compareTrigger = page.getByRole("button", { name: /Kies profiel B:/ });
  await compareTrigger.click();
  const selector = page.getByRole("dialog", { name: "Kies profiel B" });
  const selectorScroll = selector.getByTestId("profile-selector-scroll");
  const lastShared = selector.getByRole("button", { name: /^Gedeeld 08,/ });
  await expect(selector.getByText("Mijn profielen", { exact: true })).toHaveCount(1);
  await expect(selector.getByText("Gedeeld met mij", { exact: true })).toHaveCount(1);
  await lastShared.scrollIntoViewIfNeeded();
  await expect.poll(() => selectorScroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expectWithinVisualViewport(lastShared);
  await expect(selector.getByPlaceholder("Zoek op naam of rol…")).toBeVisible();
  await saveScreenshot(page, testInfo, "compare-profile-selector");
  await selector.getByRole("button", { name: "Kies profiel B sluiten" }).click();
  await expect(selector).toBeHidden();
  await expect(compareTrigger).toBeFocused();

  await page.goto("/profile/" + PROFILE_ALEX.id + "/questions");
  await page.waitForLoadState("networkidle");
  const helpTrigger = page
    .getByLabel("Hoofdnavigatie")
    .getByRole("button", { name: "Uitleg antwoordkeuzes" });
  await expect(helpTrigger).toBeVisible();
  await helpTrigger.click();
  const explainer = page.getByRole("dialog", { name: "Uitleg keuzes" });
  await expect(explainer).toBeVisible();
  await expectWithinVisualViewport(explainer);
  await saveScreenshot(page, testInfo, "status-explainer");
  await explainer
    .getByTestId("sheet-scroll-body")
    .getByRole("button", { name: "Sluit", exact: true })
    .click();

  const sessionValues = await page.evaluate(() => Object.fromEntries(
    Array.from({ length: sessionStorage.length }, (_, index) => {
      const key = sessionStorage.key(index) ?? "";
      return [key, sessionStorage.getItem(key)];
    }),
  ));
  expect(sessionValues["kinksync-home-profile-disclosures"]).toBeUndefined();
  expect(JSON.stringify(sessionValues)).not.toMatch(/pw-alex|pw-sam|owned-|shared-|Eigen|Gedeeld/);
});
