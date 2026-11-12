import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";
import { checkScrolledContentMenu, checkScrolledHomeReload } from "./home-navigation";

async function expectRouteAtTop(page: import("@playwright/test").Page) {
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeLessThanOrEqual(1);
}

test("routewissels landen bovenaan ondanks de sticky navigatie", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/", [PROFILE_ALEX], { onboardingComplete: true });
  await expectRouteAtTop(page);

  await page.getByRole("link", { name: "Over KinkSync", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expectRouteAtTop(page);

  await page.getByText("Technische verdieping", { exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

  await page.getByRole("link", { name: "Security & privacy" }).click();
  await expect(page).toHaveURL(/\/security$/);
  await expectRouteAtTop(page);
});

for (const theme of ["light", "dark"] as const) {
  test(`Home Settings and native reload preserve scrolled navigation in ${theme}`, async ({ page, isMobile }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 667 });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
    const shared = { ...PROFILE_SAM, origin: "shared" as const, isImported: true };
    await seedAndGo(page, "/", [PROFILE_ALEX, shared], { onboardingComplete: true });
    await checkScrolledHomeReload(page, isMobile);
    // Prepare the visual only after the native restoration checks have passed.
    await page.evaluate(() => window.scrollTo(0, 80));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(80);
    await expect.poll(async () => (await page.locator("[data-home-masthead]").boundingBox())?.y).toBe(0);
    await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/home-reload-${theme}-390.png`, fullPage: false });
  });
}

test("scrolled content overflow supports keyboard dismissal without moving the document", async ({ page, isMobile }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX]);
  await checkScrolledContentMenu(page, isMobile);
});
