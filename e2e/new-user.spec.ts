import { test, expect } from "@playwright/test";

test.describe("Nieuwe gebruiker — volledig onboarding pad", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("onboarding zichtbaar na fresh start", async ({ page }) => {
    await expect(page.getByText("KinkSync")).toBeVisible();
    await expect(page.getByRole("button", { name: /begin/i })).toBeVisible();
  });

  test("doorloopt alle stappen en landt op home", async ({ page }) => {
    // Step 0 — welkom
    await page.getByRole("button", { name: /begin/i }).click();
    await page.waitForTimeout(300);

    // Step 1 — privacy
    await expect(page.getByText(/verlaat dit apparaat nooit/i)).toBeVisible();
    await page.getByRole("button", { name: /volgende/i }).click();
    await page.waitForTimeout(300);

    // Step 2 — backup
    await expect(page.getByText(/back-up/i)).toBeVisible();
    await page.getByRole("button", { name: /volgende/i }).click();
    await page.waitForTimeout(300);

    // Step 3 — features
    await expect(page.getByText(/wat kun je doen/i)).toBeVisible();
    await page.getByRole("button", { name: /volgende/i }).click();
    await page.waitForTimeout(300);

    // Step 4 — consent
    await expect(page.getByText(/consent, altijd/i)).toBeVisible();
    await page.getByRole("button", { name: /volgende/i }).click();
    await page.waitForTimeout(300);

    // Step 5 — thema kiezen
    await expect(page.getByText(/kies je sfeer/i)).toBeVisible();
    // Select a non-default theme to exercise setTheme
    await page.getByRole("button", { name: /deep red/i }).click();
    await page.waitForTimeout(100);
    // Verify it's selected (aria-pressed)
    await expect(page.getByRole("button", { name: /deep red/i })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /ga door/i }).click();
    await page.waitForTimeout(300);

    // Step 6 — app lock (optioneel, hier overslaan)
    await expect(page.getByRole("heading", { name: /vergrendel de app/i })).toBeVisible();
    await page.getByRole("button", { name: "Sla over" }).click();
    await page.waitForTimeout(300);

    // Step 7 — leeftijdscheck
    await expect(page.getByRole("heading", { name: /voor volwassenen/i })).toBeVisible();
    await page.getByRole("button", { name: /18\+/i }).click();
    await page.waitForTimeout(400);

    // Should be on home — onboarding gone
    await expect(page.getByText(/nieuw profiel/i)).toBeVisible();
    await expect(page.getByRole("dialog", { name: /introductie/i })).not.toBeVisible();
  });

  test("sla over springt naar de leeftijdscheck — nooit eromheen", async ({ page }) => {
    await page.getByRole("button", { name: /sla de introductie over/i }).click();
    await page.waitForTimeout(400);
    // The gate is not skippable (L-01): skip lands on the age check, not home
    await expect(page.getByRole("heading", { name: /voor volwassenen/i })).toBeVisible();
    await page.getByRole("button", { name: /18\+/i }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText(/nieuw profiel/i)).toBeVisible();
  });

  test("lockout bij 'ik ben jonger'", async ({ page }) => {
    await page.getByRole("button", { name: /begin/i }).click();
    await page.waitForTimeout(300);
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: /volgende/i }).click();
      await page.waitForTimeout(300);
    }
    await expect(page.getByText(/kies je sfeer/i)).toBeVisible();
    await page.getByRole("button", { name: /ga door/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("heading", { name: /vergrendel de app/i })).toBeVisible();
    await page.getByRole("button", { name: "Sla over" }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("heading", { name: /voor volwassenen/i })).toBeVisible();
    await page.getByRole("button", { name: /jonger/i }).click();
    await page.waitForTimeout(200);
    await expect(page.getByText(/kom terug als je 18 bent/i)).toBeVisible();
  });

  test("nieuw profiel aanmaken direct na onboarding", async ({ page }) => {
    // Fast-path via skip → age gate → home
    await page.getByRole("button", { name: /sla de introductie over/i }).click();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /18\+/i }).click();
    await page.waitForTimeout(400);

    await page.getByPlaceholder(/naam of alias/i).fill("Testmeester");
    await page.getByRole("button", { name: /sla jezelf vast/i }).click();
    await page.waitForLoadState("networkidle");

    // Should have navigated to the profile page
    await expect(page.getByText("Testmeester")).toBeVisible();
  });
});
