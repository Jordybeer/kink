import { test } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX } from "./fixtures";

const PROFILE_WITH_AVATAR: typeof PROFILE_ALEX = {
  ...PROFILE_ALEX,
  avatarDataUrl: undefined,
  fetLifeUsername: "Alex_Dom",
  bdsmtestUrl: "https://bdsmtest.org/r/example",
};

test.use({ ...require("@playwright/test").devices["Pixel 7"] });

test("profile hero — mobile overview tab", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX]);
  await page.screenshot({ path: "screenshots/profile-hero-overview.png", fullPage: false });
});

test("profile hero — scroll below fold", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX]);
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.screenshot({ path: "screenshots/profile-hero-scroll.png", fullPage: false });
});

test("profile edit tab", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX]);
  await page.getByRole("button", { name: "Bewerken", exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "screenshots/profile-edit-tab.png", fullPage: false });
});

test("profile edit tab — scroll kink list", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX]);
  await page.getByRole("button", { name: "Bewerken", exact: true }).click();
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.screenshot({ path: "screenshots/profile-edit-kinkrow.png", fullPage: false });
});

test("profile full page scroll", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX]);
  await page.screenshot({ path: "screenshots/profile-fullpage.png", fullPage: true });
});

test("profile edit tab full page", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX]);
  await page.getByRole("button", { name: "Bewerken", exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "screenshots/profile-edit-fullpage.png", fullPage: true });
});
