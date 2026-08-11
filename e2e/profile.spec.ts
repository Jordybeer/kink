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

  test("vragenlijst kan vanuit het profiel hervat worden", async ({ page }) => {
    const resume = page.getByRole("link", { name: /Verder invullen|Verder ontdekken|Start met vragen/i }).first();
    await expect(resume).toBeVisible();
    await resume.click();
    await expect(page).toHaveURL(/\/profile\/pw-alex-001\/questions$/);
    await expect(page.getByTestId("questions-screen")).toBeVisible();
  });

  test("eerste vraag houdt afspraken en Later boven de mobiele fold", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const emptyAlex = { ...PROFILE_ALEX, entries: {} };
    await seedAndGo(page, "/profile/pw-alex-001/questions", [emptyAlex, PROFILE_SAM]);

    await expect(page.getByTestId("questions-top-progress")).toBeVisible();
    await expect(page.getByRole("button", { name: "Uitleg over antwoordkeuzes" })).toBeVisible();

    const controls = [
      page.getByRole("button", { name: "Eerst vragen" }),
      page.getByRole("button", { name: "Eerste keer" }),
      page.getByRole("button", { name: /Later/ }),
    ];

    for (const width of [390, 375]) {
      await page.setViewportSize({ width, height: 844 });
      const viewportHeight = await page.evaluate(() => window.innerHeight);

      for (const control of controls) {
        await expect(control).toBeVisible();
        const box = await control.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewportHeight);
      }
    }
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

  test("Impact Play categorie is zichtbaar in de bewerkmodus", async ({ page }) => {
    await page.getByRole("tab", { name: "Bewerken" }).click();
    await expect(page.getByText("Impact Play", { exact: true }).first()).toBeVisible();
  });

  test("tabblad 'Bewerken' opent bewerkingsmodus", async ({ page }) => {
    const editTab = page.getByRole("tab", { name: "Bewerken" });
    await editTab.click();
    await expect(page.locator("button[aria-pressed]").first()).toBeVisible();
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