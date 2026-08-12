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

  const mineDisclosure = page.getByRole("button", { name: "Mijn profielen 9" });
  const sharedDisclosure = page.getByRole("button", { name: "Gedeeld met mij 9" });
  await expect(mineDisclosure).toHaveAttribute("aria-expanded", "true");
  await expect(sharedDisclosure).toHaveAttribute("aria-expanded", "false");
  await sharedDisclosure.click();
  await expect(page.getByRole("link", { name: "Gedeeld 08 Submissive openen" })).toBeVisible();
  await sharedDisclosure.scrollIntoViewIfNeeded();
  await saveScreenshot(page, testInfo, "home-profile-groups");

  const settingsTrigger = page.getByRole("button", { name: "Instellingen openen" });
  await settingsTrigger.click();
  const settings = page.getByRole("dialog", { name: "Instellingen" });
  const settingsTitle = settings.getByRole("heading", { name: "Instellingen" });
  const settingsScroll = settings.getByTestId("sheet-scroll-body");
  const deleteAll = settings.getByRole("button", { name: /Alle data verwijderen/ });
  await expect(settings).toBeVisible();

  const originalViewport = page.viewportSize();
  if (originalViewport && testInfo.project.name.startsWith("iphone")) {
    await page.setViewportSize({
      width: originalViewport.width,
      height: Math.max(520, originalViewport.height - 96),
    });
    await expectVisualViewportContract(page);
  }

  const backgroundScrollY = await page.evaluate(() => window.scrollY);
  const settingsTitleBox = await settingsTitle.boundingBox();
  expect(settingsTitleBox).not.toBeNull();
  const settingsTitleTop = settingsTitleBox!.y;
  await deleteAll.scrollIntoViewIfNeeded();
  await expect.poll(() => settingsScroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
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

  await page.goto("/profile/" + PROFILE_ALEX.id);
  await page.waitForLoadState("networkidle");
  const editTrigger = page.getByRole("button", { name: "Profiel bewerken" });
  await editTrigger.click();
  const editDialog = page.getByRole("dialog", { name: "Profiel bewerken" });
  const editBody = editDialog.getByTestId("profile-edit-scroll-body");
  const editFooter = editDialog.getByTestId("profile-edit-footer");
  await expect(editDialog).toBeVisible();
  await editBody.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect.poll(() => editBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expectWithinVisualViewport(editFooter);
  await saveScreenshot(page, testInfo, "profile-edit-scrolled");
  await editDialog.getByRole("button", { name: "Annuleer" }).click();
  await expect(editTrigger).toBeFocused();

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
  await page.evaluate(() => window.dispatchEvent(new Event("ks:open-status-explainer")));
  const explainer = page.getByRole("dialog", { name: "Uitleg keuzes" });
  await expect(explainer).toBeVisible();
  await expectWithinVisualViewport(explainer);
  await saveScreenshot(page, testInfo, "status-explainer");
  await explainer.getByRole("button", { name: "Sluit" }).click();

  const sessionValues = await page.evaluate(() => Object.fromEntries(
    Array.from({ length: sessionStorage.length }, (_, index) => {
      const key = sessionStorage.key(index) ?? "";
      return [key, sessionStorage.getItem(key)];
    }),
  ));
  const disclosureState = sessionValues["kinksync-home-profile-disclosures"];
  expect(disclosureState).toBe('{"shared":true}');
  expect(JSON.stringify(sessionValues)).not.toMatch(/pw-alex|pw-sam|owned-|shared-|Eigen|Gedeeld/);
});
