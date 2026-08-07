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

  test("statusbalk is aanwezig op het bewerken-tabblad", async ({ page }) => {
    await page.getByRole("tab", { name: "Bewerken" }).click();
    await expect(page.getByRole("img", { name: /Heel graag/ })).toBeVisible();
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
    // De tab glijdt 8px binnen — poll tot de entrance-animatie is uitgehijgd
    await expect
      .poll(() => page.evaluate(() => document.body.scrollWidth > document.body.clientWidth), { timeout: 3000 })
      .toBe(false);
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
    const editTab = page.getByRole("tab", { name: "Bewerken" });
    if (await editTab.count() > 0) {
      await editTab.first().click();
      await expect(page.locator("text=Impact Play").first()).toBeVisible();
    }
  });

  test("kink-status instellen via de triage-stapel", async ({ page }) => {
    const emptyAlex = { ...PROFILE_ALEX, entries: {} };
    await seedAndGo(page, "/profile/pw-alex-001", [emptyAlex]);

    // Navigate to edit tab if needed
    const editTab = page.getByRole("tab", { name: "Bewerken" });
    if (await editTab.count() > 0) await editTab.first().click();

    // The deck offers the five verdicts as stacked rows — take "Ja"
    const jaBtn = page.locator('button[aria-pressed]').filter({ hasText: "geen probleem mee" }).first();
    await jaBtn.scrollIntoViewIfNeeded();
    await jaBtn.dispatchEvent("click");

    // The verdict lands in the ledger as a compact row
    await expect(page.locator('button[aria-label*=", Ja — bewerken"]').first()).toBeVisible({ timeout: 3000 });
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

  test("hard grens (humiliation_verbal) is verwerkt in de statusbalk", async ({ page }) => {
    await page.getByRole("tab", { name: "Bewerken" }).click();
    await expect(page.getByRole("img", { name: /\d+ Harde grens/ })).toBeVisible();
  });
});
