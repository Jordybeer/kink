import { test, expect } from "@playwright/test";
import { seedProfiles, seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

test.describe("Home page — leeg", () => {
  test("laadt zonder overflow en toont onboarding of lege staat", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);
  });
});

test.describe("Home page — profielen aanwezig", () => {
  test.beforeEach(async ({ page }) => {
    await seedProfiles(page, [PROFILE_ALEX, PROFILE_SAM]);
  });

  test("toont beide profielen in de lijst", async ({ page }) => {
    await expect(page.getByText("Alex", { exact: true })).toBeVisible();
    await expect(page.getByText("Sam", { exact: true })).toBeVisible();
  });

  test("navigeert naar profielpagina via link op profiel", async ({ page }) => {
    await page.locator(`a[href="/profile/pw-alex-001"]`).first().click();
    await expect(page).toHaveURL(/\/profile\/pw-alex-001/);
  });

  test("toont link naar vergelijken pagina", async ({ page }) => {
    const compareLink = page.locator("a[href*='compare']").first();
    await expect(compareLink).toBeVisible();
  });

  test("geen horizontale overflow op mobiel (390px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);
  });
});

test.describe("Profiel aanmaken via UI", () => {
  test("opent het formulier en maakt een nieuw profiel aan", async ({ page }) => {
    await seedAndGo(page, "/", [], { onboardingComplete: true, profileTourComplete: true });

    // When no profiles exist the form is always visible; when profiles exist a toggle button is shown
    const toggleBtn = page.locator("button").filter({ hasText: /Nieuw profiel/i });
    if (await toggleBtn.count() > 0) {
      await toggleBtn.first().scrollIntoViewIfNeeded();
      await toggleBtn.first().click({ force: true });
    }

    const nameInput = page.locator("input[placeholder*='naam' i], input[type='text']").first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill("TestPersoon");

    // Submit button text is "Sla jezelf vast"
    const saveBtn = page.locator("button[type='submit']").first();
    await saveBtn.scrollIntoViewIfNeeded();
    await saveBtn.click({ force: true });

    await expect(page.getByText("TestPersoon", { exact: true })).toBeVisible({ timeout: 8000 });
  });
});
