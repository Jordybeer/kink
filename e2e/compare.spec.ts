import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";
import type { Profile } from "@/types";

const URL = "/compare?a=pw-alex-001&b=pw-sam-002";

const MANY_PROFILES: Profile[] = Array.from({ length: 24 }, (_, index): Profile => {
  const shared = index >= 12;
  const number = String(index + 1).padStart(2, "0");
  return {
    ...(shared ? PROFILE_SAM : PROFILE_ALEX),
    id: `bulk-${number}`,
    name: shared ? `Gedeeld ${number}` : `Eigen ${number}`,
    isImported: shared,
    origin: shared ? "shared" : "own",
    personGroupId: undefined,
    switchShareProof: undefined,
  };
});

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

  test("lange profielselector houdt titel vast en maakt de laatste rij selecteerbaar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await seedAndGo(page, URL, [PROFILE_ALEX, PROFILE_SAM, ...MANY_PROFILES]);

    const trigger = page.getByRole("button", { name: /Kies profiel B:/ });
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Kies profiel B" });
    const title = dialog.getByRole("heading", { name: "Kies profiel B" });
    const scrollBody = dialog.getByTestId("profile-selector-scroll");
    const lastProfile = dialog.getByRole("button", { name: /^Gedeeld 24,/ });

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Mijn profielen", { exact: true })).toHaveCount(1);
    await expect(dialog.getByText("Gedeeld met mij", { exact: true })).toHaveCount(1);
    await expect.poll(async () => dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
      return Math.max(0, -rect.top, rect.bottom - visibleHeight);
    })).toBeLessThanOrEqual(1);
    const titleBox = await title.boundingBox();
    expect(titleBox).not.toBeNull();
    const titleTop = titleBox!.y;
    await lastProfile.scrollIntoViewIfNeeded();
    await expect.poll(() => scrollBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    const lastBox = await lastProfile.boundingBox();
    const visibleHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
    expect(lastBox).not.toBeNull();
    expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual(visibleHeight + 1);
    expect((await title.boundingBox())!.y).toBeCloseTo(titleTop, 0);

    await lastProfile.click();
    await expect(page).toHaveURL(/b=bulk-24/);

    await page.getByRole("button", { name: /Kies profiel B:/ }).click();
    const search = page.getByPlaceholder("Zoek op naam of rol…");
    await expect(search).toHaveValue("");
    await search.fill("Eigen 01");
    await expect(dialog.getByRole("button", { name: /^Eigen 01,/ })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /^Gedeeld 24,/ })).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("lege staat: toont melding of selector bij geen URL-params", async ({ page }) => {
    await seedAndGo(page, "/compare", [PROFILE_ALEX, PROFILE_SAM]);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/profiel|kies|selecteer|vergelijk/i);
  });
});
