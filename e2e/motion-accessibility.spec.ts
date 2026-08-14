import { expect, test, type Locator, type Page } from "@playwright/test";
import { buildStore, PROFILE_ALEX, PROFILE_SAM, seedProfiles } from "./fixtures";

const STORE_KEY = "kink-profiles";

async function holdPress(page: Page, target: Locator) {
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
}

async function expectNoScaleTransform(target: Locator) {
  await expect.poll(async () => target.evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    return transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)";
  })).toBe(true);
}

test("reduced motion disables direct onboarding press transforms at the app root", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const begin = page.getByRole("button", { name: "Begin", exact: true });
  await expect(begin).toBeVisible();

  await holdPress(page, begin);
  await expectNoScaleTransform(begin);
  await page.mouse.up();
});

test("reduced motion also protects direct AppLock tap motion", async ({ page }) => {
  const base = buildStore([PROFILE_ALEX, PROFILE_SAM]);
  const lockedStore = JSON.stringify({
    ...base,
    state: {
      ...base.state,
      appLockEnabled: true,
      appLockPin: "locked-for-motion-e2e",
    },
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: STORE_KEY, value: lockedStore },
  );
  await page.goto(`/profile/${PROFILE_ALEX.id}`);

  const one = page.getByRole("button", { name: "1", exact: true });
  await expect(one).toBeVisible();

  await holdPress(page, one);
  await expectNoScaleTransform(one);
  await page.mouse.up();
});

test("reduced motion keeps shared TopNav press feedback still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedProfiles(page, [PROFILE_ALEX, PROFILE_SAM], { pinnedProfileId: PROFILE_ALEX.id });
  await page.goto(`/profile/${PROFILE_ALEX.id}`);

  const back = page.getByLabel("Hoofdnavigatie").getByRole("link", { name: "Terug" });
  await expect(back).toBeVisible();

  await holdPress(page, back);
  await expectNoScaleTransform(back);
  await page.mouse.up();
});
