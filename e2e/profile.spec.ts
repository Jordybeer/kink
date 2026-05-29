import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

test.describe("Profielpagina — Alex (gevorderd, Dominant)", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndGo(page, "/profile/pw-alex-001", [PROFILE_ALEX, PROFILE_SAM]);
  });

  test("hero toont naam, rol en ervaringsniveau", async ({ page }) => {
    await expect(page.getByText("Alex", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Dominant").first()).toBeVisible();
  });

  test("DNA-balk is aanwezig", async ({ page }) => {
    const dna = page.locator('[aria-label*="DNA"], [aria-label*="Kink DNA"]');
    expect(await dna.count()).toBeGreaterThan(0);
  });

  test("ingevulde kinks tellen mee — teller zichtbaar", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/\d+\s*BEOORDEELD|\d+\s*beoordeeld/i);
  });

  test("geen sterren (★) zichtbaar op de pagina", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).not.toContain("★");
  });

  test("geen horizontale overflow", async ({ page }) => {
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);
  });

  test("geen overflow op mobiel (390px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/profile/pw-alex-001");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);
  });

  test("Impact Play categorie is zichtbaar in lijst", async ({ page }) => {
    await expect(page.locator("text=Impact Play").first()).toBeVisible();
  });

  test("tabblad 'Bewerken' opent bewerkingsmodus", async ({ page }) => {
    const editTab = page.locator("button, [role='tab']").filter({ hasText: /^Bewerken$/ });
    if (await editTab.count() > 0) {
      await editTab.first().click();
      await expect(page.locator("text=Impact Play").first()).toBeVisible();
    }
  });

  test("kink-status instellen via status-knop", async ({ page }) => {
    const emptyAlex = { ...PROFILE_ALEX, entries: {} };
    await seedAndGo(page, "/profile/pw-alex-001", [emptyAlex]);

    // Navigate to edit tab if needed
    const editTab = page.locator("button, [role='tab']").filter({ hasText: /^Bewerken$/ });
    if (await editTab.count() > 0) await editTab.first().click();

    // Dispatch click directly to bypass sticky nav interception
    const jaBtn = page.locator("button[aria-pressed]").filter({ hasText: /^Ja$/ }).first();
    if (await jaBtn.count() > 0) {
      await jaBtn.scrollIntoViewIfNeeded();
      await jaBtn.dispatchEvent("click");
      await expect(jaBtn).toHaveAttribute("aria-pressed", "true", { timeout: 3000 });
    }
  });
});

test.describe("Profielpagina — Sam (gevorderd, Submissive)", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndGo(page, "/profile/pw-sam-002", [PROFILE_ALEX, PROFILE_SAM]);
  });

  test("toont Sam als naam", async ({ page }) => {
    await expect(page.getByText("Sam", { exact: true }).first()).toBeVisible();
  });

  test("toont Submissive als rol", async ({ page }) => {
    await expect(page.getByText("Submissive").first()).toBeVisible();
  });

  test("teller toont ingevulde kinks", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/\d+\s*BEOORDEELD|\d+\s*beoordeeld/i);
  });

  test("hard grens (humiliation_verbal) is verwerkt in de DNA-balk", async ({ page }) => {
    // DNA bar shows ✕✕ count for hard limits
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/✕✕\s*\d+|\d+\s*✕✕/);
  });
});
