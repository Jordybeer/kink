import { devices, expect, test } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX } from "./fixtures";

const pixel7 = devices["Pixel 7"];

test.use({
  ...pixel7,
  viewport: { width: 375, height: pixel7.viewport.height },
});

test("profile hero — mobile read view", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX]);
  await expect(page.getByTestId("profile-summary")).toBeVisible();
  await page.screenshot({ path: "screenshots/profile-hero-overview.png", fullPage: false });
});

test("profile hero — scroll below fold", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX]);
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.screenshot({ path: "screenshots/profile-hero-scroll.png", fullPage: false });
});

test("profile catalog manager", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX]);
  await page.getByRole("button", { name: /Onderwerpen beheren/ }).click();
  await expect(page.getByTestId("profile-catalog-manager-header")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Volledige catalogus doorzoeken" })).toBeVisible();
  await page.screenshot({ path: "screenshots/profile-edit-tab.png", fullPage: false });
});

test("profile manager supports keyboard entry and an explicit return to read view", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX]);

  const manage = page.getByRole("button", { name: /Onderwerpen beheren/ });
  await expect(manage).toBeVisible();
  await manage.focus();
  await expect(manage).toBeFocused();
  await page.keyboard.press("Enter");

  const done = page.getByRole("button", { name: "Gereed" });
  await expect(done).toBeVisible();
  await expect(page.getByTestId("profile-catalog-controls")).toBeVisible();
  await done.click();

  await expect(page.getByTestId("profile-catalog-controls")).toHaveCount(0);
  await expect(page.getByTestId("profile-summary")).toBeVisible();
  await expect(page.getByRole("button", { name: /Onderwerpen beheren/ })).toBeVisible();
});

test("profile catalog manager — scroll kink list", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX]);
  await page.getByRole("button", { name: /Onderwerpen beheren/ }).click();
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.screenshot({ path: "screenshots/profile-edit-kinkrow.png", fullPage: false });
});

test("profile full page scroll", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX]);
  await page.screenshot({ path: "screenshots/profile-fullpage.png", fullPage: true });
});

test("profile catalog manager full page", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX]);
  await page.getByRole("button", { name: /Onderwerpen beheren/ }).click();
  await page.screenshot({ path: "screenshots/profile-edit-fullpage.png", fullPage: true });
});