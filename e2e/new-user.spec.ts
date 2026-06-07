import { test, expect, type Page } from "@playwright/test";

// The notification step's button label depends on the browser's permission state
// ("Sla over" when it can ask, otherwise "Volgende →"/"Begrepen →"). Click whichever shows.
async function skipNotificationStep(page: Page) {
  const skip = page.getByRole("button", { name: /sla over/i });
  if (await skip.isVisible()) {
    await skip.click();
  } else {
    await page.getByRole("button", { name: /volgende|begrepen/i }).click();
  }
}

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

    // Step 2 — eigen cloud / data autonomy
    await expect(page.getByText(/eigen cloud/i)).toBeVisible();
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

    // Step 5 — meldingen
    await expect(page.getByText(/tikje op de schouder/i)).toBeVisible();
    await skipNotificationStep(page);
    await page.waitForTimeout(300);

    // Step 6 — thema kiezen
    await expect(page.getByText(/kies je sfeer/i)).toBeVisible();
    // Select a non-default theme to exercise setTheme
    await page.getByRole("button", { name: /deep red/i }).click();
    await page.waitForTimeout(100);
    // Verify it's selected (aria-pressed)
    await expect(page.getByRole("button", { name: /deep red/i })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /ga door/i }).click();
    await page.waitForTimeout(300);

    // Step 7 — app vergrendelen (optioneel, sla over)
    await expect(page.getByText(/vergrendel de app/i)).toBeVisible();
    await page.getByRole("button", { name: /sla over/i }).click();
    await page.waitForTimeout(300);

    // Step 8 — leeftijdscheck
    await expect(page.getByRole("heading", { name: /voor volwassenen/i })).toBeVisible();
    await page.getByRole("button", { name: /18\+/i }).click();
    await page.waitForTimeout(400);

    // Should be on home — onboarding gone
    await expect(page.getByText(/nieuw profiel/i)).toBeVisible();
    await expect(page.getByRole("dialog", { name: /introductie/i })).not.toBeVisible();
  });

  test("sla over knop omzeilt onboarding direct", async ({ page }) => {
    await page.getByRole("button", { name: /sla de introductie over/i }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText(/nieuw profiel/i)).toBeVisible();
  });

  test("lockout bij 'ik ben jonger'", async ({ page }) => {
    await page.getByRole("button", { name: /begin/i }).click();
    await page.waitForTimeout(300);
    // Privacy → eigen cloud → features → consent (4× Volgende lands on the notification step)
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: /volgende/i }).click();
      await page.waitForTimeout(300);
    }
    await expect(page.getByText(/tikje op de schouder/i)).toBeVisible();
    await skipNotificationStep(page);
    await page.waitForTimeout(300);
    await expect(page.getByText(/kies je sfeer/i)).toBeVisible();
    await page.getByRole("button", { name: /ga door/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/vergrendel de app/i)).toBeVisible();
    await page.getByRole("button", { name: /sla over/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("heading", { name: /voor volwassenen/i })).toBeVisible();
    await page.getByRole("button", { name: /jonger/i }).click();
    await page.waitForTimeout(200);
    await expect(page.getByText(/kom terug als je 18 bent/i)).toBeVisible();
  });

  test("nieuw profiel aanmaken direct na onboarding", async ({ page }) => {
    // Fast-path via skip
    await page.getByRole("button", { name: /sla de introductie over/i }).click();
    await page.waitForTimeout(400);

    await page.getByPlaceholder(/naam of alias/i).fill("Testmeester");
    await page.getByRole("button", { name: /sla jezelf vast/i }).click();
    await page.waitForLoadState("networkidle");

    // Should have navigated to the profile page
    await expect(page.getByText("Testmeester")).toBeVisible();
  });
});
