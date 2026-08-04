import { devices, expect, test } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX } from "./fixtures";

const pixel7 = devices["Pixel 7"];

test.use({
  ...pixel7,
  viewport: { width: 375, height: pixel7.viewport.height },
});

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

test("profile tabs support roving keyboard focus", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX]);

  const overview = page.getByRole("tab", { name: "Overzicht" });
  const edit = page.getByRole("tab", { name: "Bewerken" });

  await overview.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(edit).toBeFocused();
  await expect(edit).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("ArrowRight");
  await expect(overview).toBeFocused();
  await expect(overview).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("End");
  await expect(edit).toBeFocused();
  await expect(edit).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("Home");
  await expect(overview).toBeFocused();
  await expect(overview).toHaveAttribute("aria-selected", "true");
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
