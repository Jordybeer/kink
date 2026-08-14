import { expect, test, type Locator, type Page } from "@playwright/test";
import { buildStore, PROFILE_ALEX, PROFILE_SAM, seedProfiles } from "./fixtures";

const STORE_KEY = "kink-profiles";
const SIZE_TOLERANCE_PX = 0.5;

async function boxSize(target: Locator) {
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error("Expected interactive target to have a bounding box");
  return { width: box.width, height: box.height };
}

async function holdPress(page: Page, target: Locator) {
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
}

async function expectPressKeepsSize(page: Page, target: Locator) {
  const before = await boxSize(target);
  await holdPress(page, target);

  await expect.poll(async () => {
    const held = await boxSize(target);
    return Math.max(
      Math.abs(held.width - before.width),
      Math.abs(held.height - before.height),
    );
  }).toBeLessThanOrEqual(SIZE_TOLERANCE_PX);

  await page.mouse.up();
}

test("reduced motion disables onboarding tactile press scaling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const begin = page.getByRole("button", { name: "Begin", exact: true });
  await expect(begin).toBeVisible();
  await expectPressKeepsSize(page, begin);
});

test("reduced motion disables AppLock tactile press scaling", async ({ page }) => {
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
  await expectPressKeepsSize(page, one);
});

test("reduced motion keeps shared TopNav press feedback still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedProfiles(page, [PROFILE_ALEX, PROFILE_SAM], { pinnedProfileId: PROFILE_ALEX.id });
  await page.goto(`/profile/${PROFILE_ALEX.id}`);

  const back = page.getByLabel("Hoofdnavigatie").getByRole("link", { name: "Terug" });
  await expect(back).toBeVisible();
  await expectPressKeepsSize(page, back);
});
