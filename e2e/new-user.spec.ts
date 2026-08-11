import { test, expect } from "@playwright/test";

test.describe("Nieuwe gebruiker — volledig onboarding pad", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("onboarding zichtbaar na fresh start", async ({ page }) => {
    await expect(page.getByText(/KinkSync/i).first()).toBeVisible();
  });

  test("doorloopt alle stappen en landt op home", async ({ page }) => {
    await page.getByRole("button", { name: /verder/i }).click();
    await page.waitForTimeout(350);
    await page.getByRole("button", { name: /verder/i }).click();
    await page.waitForTimeout(350);
    await page.getByRole("button", { name: /verder/i }).click();
    await page.waitForTimeout(350);
    await page.getByRole("button", { name: /18\+/i }).click();
    await page.waitForTimeout(350);
    await page.getByRole("button", { name: /ga door/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole("button", { name: "Begin met jouw profiel" })).toBeVisible();
  });

  test("pin instellen gooit de wizard niet terug naar slide één", async ({ page }) => {
    await page.getByRole("button", { name: /verder/i }).click();
    await page.waitForTimeout(350);
    await page.getByRole("button", { name: /verder/i }).click();
    await page.waitForTimeout(350);
    await page.getByRole("button", { name: /verder/i }).click();
    await page.waitForTimeout(350);

    const pinInput = page.locator('input[inputmode="numeric"]').first();
    if (await pinInput.count()) {
      await pinInput.fill("1234");
      const confirmPin = page.getByRole("button", { name: /pin|verder|bevestig/i }).last();
      if (await confirmPin.count()) await confirmPin.click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByRole("heading", { name: /voor volwassenen/i })).toBeVisible();
  });

  test("sla over springt naar de leeftijdscheck — nooit eromheen", async ({ page }) => {
    await page.getByRole("button", { name: /sla de introductie over/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("heading", { name: /voor volwassenen/i })).toBeVisible();
  });

  test("lockout bij 'ik ben jonger'", async ({ page }) => {
    await page.getByRole("button", { name: /sla de introductie over/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("heading", { name: /voor volwassenen/i })).toBeVisible();
    await page.getByRole("button", { name: /jonger/i }).click();
    await page.waitForTimeout(200);
    await expect(page.getByText(/kom terug als je 18 bent/i)).toBeVisible();
  });

  test("nieuw profiel aanmaken direct na onboarding", async ({ page }) => {
    // Fast-path via skip → age gate → consent → home, then the compact two-step profile sheet.
    await page.getByRole("button", { name: /sla de introductie over/i }).click();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /18\+/i }).click();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /ga door/i }).click();
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: "Begin met jouw profiel" }).click();
    await page.getByLabel("Naam of alias").fill("Testmeester");
    await page.getByRole("button", { name: /^Dominant/ }).click();
    await page.getByRole("button", { name: "Verder" }).click();
    await page.getByRole("button", { name: "Start vragen" }).click();
    await page.waitForLoadState("networkidle");

    // New profiles continue directly into the dedicated questionnaire surface.
    await expect(page).toHaveURL(/\/profile\/[^/]+\/questions$/);
    await expect(page.getByTestId("questions-screen")).toBeVisible();
    await expect(page.getByRole("group", { name: "Status kiezen" })).toBeVisible();
  });
});