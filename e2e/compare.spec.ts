import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

const URL = "/compare?a=pw-alex-001&b=pw-sam-002";

test.describe("Vergelijkingspagina", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndGo(page, URL, [PROFILE_ALEX, PROFILE_SAM]);
  });

  test("toont namen van beide profielen", async ({ page }) => {
    // Names appear in selects, headers and badges — check page text rather than visibility
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/Alex/);
    expect(text).toMatch(/Sam/);
  });

  test("geen horizontale overflow", async ({ page }) => {
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);
  });

  test("geen overflow op mobiel (390px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(URL);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);
  });

  test("match-indicatie is zichtbaar voor complementaire spanking give/receive", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toContain("Spanking (hand) — geven ↔ ontvangen");
  });

  test("harde grens badge is zichtbaar (humiliation_verbal = no/hard_no)", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    // STATUS_LABEL for hard_no is "✕✕ Harde grens"
    expect(text).toMatch(/✕✕|Harde grens/);
  });

  test("conflict sectie toont flogging (willing vs maybe)", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/[Ff]logging/);
  });

  test("statusbadges voor beide profielen zijn zichtbaar", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/Heel graag|Interesse|Voor hen|Liever niet/);
  });

  test("geen sterren (★) op de pagina", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).not.toContain("★");
  });

  test("lege staat: toont melding of selector bij geen URL-params", async ({ page }) => {
    await seedAndGo(page, "/compare", [PROFILE_ALEX, PROFILE_SAM]);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/profiel|kies|selecteer|vergelijk/i);
  });
});
