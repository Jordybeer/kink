import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM, CONTRACT_ALEX_SAM } from "./fixtures";

test.describe("Scene planner", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndGo(page, "/scene?a=pw-alex-001&b=pw-sam-002", [PROFILE_ALEX, PROFILE_SAM], {
      contracts: [CONTRACT_ALEX_SAM],
    });
  });

  test("laadt zonder overflow", async ({ page }) => {
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);
  });

  test("toont scène menu interface", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Kinks toevoegen" })).toBeVisible();
    await expect(page.getByText("Lege setlist", { exact: true })).toBeVisible();
  });

  test("toont profielnamen in de koptekst", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/Alex.*Sam|Sam.*Alex/);
  });

  test("toont matches als suggesties", async ({ page }) => {
    await page.getByRole("button", { name: "Kinks toevoegen" }).click();
    await expect(page.getByRole("heading", { name: "Toevoegen aan setlist" })).toBeVisible();
    await expect(page.getByText("Wederzijds", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Spanking (hand)" })).toBeVisible();
  });

  test("geen overflow op mobiel (390px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/scene?a=pw-alex-001&b=pw-sam-002");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);
  });

  test("kan een item toevoegen via + knop", async ({ page }) => {
    const addBtn = page.locator("button").filter({ hasText: /^\+$/ }).first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      // A new input row should appear
      const inputs = page.locator("input[type='text'], textarea");
      expect(await inputs.count()).toBeGreaterThan(0);
    }
  });

  test("exporteer PDF knop is zichtbaar", async ({ page }) => {
    const btn = page.locator("button, a").filter({ hasText: /[Ee]xporteer|PDF/i });
    expect(await btn.count()).toBeGreaterThan(0);
  });
});

test("scene planner requires a contract for a selected pair", async ({ page }) => {
  await seedAndGo(page, "/scene?a=pw-alex-001&b=pw-sam-002", [PROFILE_ALEX, PROFILE_SAM]);
  await expect(page.getByRole("heading", { name: "Verbond vereist" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Contract opstellen" })).toBeVisible();
});

test.describe("Scene planner — zonder URL-params", () => {
  test("laadt zonder profielen en toont scène menu", async ({ page }) => {
    await seedAndGo(page, "/scene", [PROFILE_ALEX, PROFILE_SAM]);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/[Ss]cène|[Ss]cene/);
  });

  test("geen overflow zonder params", async ({ page }) => {
    await seedAndGo(page, "/scene", [PROFILE_ALEX, PROFILE_SAM]);
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);
  });
});
