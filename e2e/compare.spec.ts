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

  test("toont transparante overlap met natuurlijke uitleg", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/Alex/);
    expect(text).toMatch(/Sam/);
    expect(text).toContain("Wat valt op tussen jullie");
    expect(text).toMatch(/\d+%/);
    expect(text).toContain("duidelijke overlap");
    expect(text).toMatch(/voorkeuren die aan beide kanten zijn ingevuld/i);
    expect(text).not.toMatch(/sluiten er .* duidelijk aan/i);
    expect(text).not.toContain("Sterke compatibiliteit");
    expect(text).not.toContain("Goede basis");
    expect(text).not.toContain("compatibiliteitsscore");
  });

  test("toont vier stabiele hoofdvakken, ook wanneer grenzen nul zijn", async ({ page }) => {
    const summary = page.getByRole("region", { name: "Wat valt op tussen jullie" });
    await expect(summary).toContainText("samen");
    await expect(summary).toContainText("bespreken");
    await expect(summary).toContainText("zachte verschillen");
    await expect(summary).toContainText("grenzen");
  });

  test("toont de rol van beide gekozen profielen", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Kies profiel A: Alex" })).toContainText("Dominant");
    await expect(page.getByRole("button", { name: "Kies profiel B: Sam" })).toContainText("Submissive");
  });

  test("houdt profielrol en expliciete richting van elkaar gescheiden", async ({ page }) => {
    const summary = page.getByRole("region", { name: "Wat valt op tussen jullie" });
    await expect(summary).toContainText(/samen/i);
    await expect(summary).toContainText(/bespreken/i);
    await expect(summary).toContainText(/grenzen/i);

    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toContain("Spanking (hand)");
    expect(text).toMatch(/Alex (geeft|ontvangt) · Sam (ontvangt|geeft)/);
    expect(text).toMatch(/[Ff]logging/);
    expect(text).not.toContain("complementaire richting");
    expect(text).not.toMatch(/Spanking \(hand\).*↔.*Spanking \(hand\)/);
  });

  test("houdt bijzondere complementaire participatie concreet zonder give-receive aanname", async ({ page }) => {
    const alex: Profile = {
      ...PROFILE_ALEX,
      entries: {
        ...PROFILE_ALEX.entries,
        luiers_dragen: { status: "yes", comment: "" },
      },
    };
    const sam: Profile = {
      ...PROFILE_SAM,
      entries: {
        ...PROFILE_SAM.entries,
        diaper_partner_wearing: { status: "willing", comment: "" },
      },
    };
    await seedAndGo(page, URL, [alex, sam]);

    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toContain("Diaper wearing");
    expect(text).toContain("Alex: zelf dragen · Sam: partner draagt");
    expect(text).not.toMatch(/Diaper wearing[\s\S]{0,120}geven.*ontvangen/i);
  });

  test("neemt aanvullende matches mee in het samen-vak", async ({ page }) => {
    const summary = page.getByRole("region", { name: "Wat valt op tussen jullie" });
    const summaryText = await summary.innerText();
    const leadMatch = summaryText.match(/interesse bij (\d+) aan beide kanten positief\. Bij (\d+) andere/);
    expect(leadMatch).not.toBeNull();
    const expectedClearOverlap = Number(leadMatch![1]) + Number(leadMatch![2]);
    const togetherStat = summary.getByText("samen", { exact: true }).locator("..");
    await expect(togetherStat).toContainText(String(expectedClearOverlap));
  });

  test("filtert resultaten en categorieën via twee multiselect sheets", async ({ page }) => {
    const resultsTrigger = page.getByTestId("compare-results-filter");
    const categoriesTrigger = page.getByTestId("compare-categories-filter");
    await expect(resultsTrigger).toBeVisible();
    await expect(categoriesTrigger).toBeVisible();
    await expect(resultsTrigger).toHaveAccessibleName("Resultaten: alles");
    await expect(categoriesTrigger).toHaveAccessibleName("Categorieën: alles");

    await resultsTrigger.click();
    await expect(resultsTrigger).toHaveAttribute("aria-expanded", "true");
    const resultsDialog = page.getByRole("dialog", { name: "Resultaten filteren" });
    await expect(resultsDialog).toBeVisible();
    await expect(resultsDialog.getByRole("button", { name: "Alles" })).toHaveAttribute("aria-pressed", "true");

    const shared = resultsDialog.getByRole("button", { name: /Zelfde interesse/ });
    const boundaries = resultsDialog.getByRole("button", { name: /Grenzen/ });
    await expect(resultsDialog.getByRole("button", { name: /Vult elkaar aan/ })).toBeVisible();
    await shared.click();
    await boundaries.click();
    await expect(shared).toHaveAttribute("aria-pressed", "true");
    await expect(boundaries).toHaveAttribute("aria-pressed", "true");
    await resultsDialog.getByRole("button", { name: "Klaar" }).click();
    await expect(resultsTrigger).toContainText("· 2");
    await expect(resultsTrigger).toHaveAccessibleName("Resultaten: 2 geselecteerd");
    await expect(resultsTrigger).toHaveAttribute("aria-expanded", "false");

    await categoriesTrigger.click();
    const categoriesDialog = page.getByRole("dialog", { name: "Categorieën filteren" });
    await expect(categoriesDialog).toBeVisible();
    const categoryButtons = categoriesDialog.locator("button[aria-pressed]").filter({ hasNotText: "Alle categorieën" });
    await expect(categoryButtons.first()).toBeVisible();
    await categoryButtons.first().click();
    await expect(categoryButtons.first()).toHaveAttribute("aria-pressed", "true");
    await categoriesDialog.getByRole("button", { name: "Klaar" }).click();
    await expect(categoriesTrigger).toContainText("· 1");
    await expect(categoriesTrigger).toHaveAccessibleName("Categorieën: 1 geselecteerd");
  });

  test("houdt eenzijdige antwoorden apart van pair-resultaten", async ({ page }) => {
    const details = page.locator("details").filter({ hasText: "Nog niet door beiden beoordeeld" });
    await expect(details).toBeVisible();
    await expect(details.locator("summary")).toContainText(/Nog niet door beiden beoordeeld · [1-9]/);
    await details.locator("summary").click();
    await expect(details).toContainText("Deze voorkeuren tellen niet mee als vergelijking");
    await expect(details).toContainText(/Alex: (Heel graag|Ja|Misschien|Voor hen|Harde grens)|Sam: (Heel graag|Ja|Misschien|Voor hen|Harde grens)/);
  });

  test("benadrukt dat profieloverlap geen toestemming is", async ({ page }) => {
    await expect(page.getByText(/overlap is geen toestemming/i)).toBeVisible();
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
    await expect(page.getByTestId("compare-results-filter")).toBeVisible();
    await expect(page.getByTestId("compare-categories-filter")).toBeVisible();
  });

  test("belangrijke vergelijktekst blijft minstens 14px", async ({ page }) => {
    const selectors = [
      "[data-testid='compare-results-filter']",
      "[data-testid='compare-categories-filter']",
      "details summary",
    ];
    for (const selector of selectors) {
      const element = page.locator(selector).first();
      await expect(element).toBeVisible();
      const size = await element.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
      expect(size).toBeGreaterThanOrEqual(14);
    }
  });

  test("statusbadges voor beide profielen zijn zichtbaar", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/Heel graag|Ja|Misschien|Voor hen|Harde grens/);
  });

  test("lange profielselector houdt header vast en maakt de laatste rij selecteerbaar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await seedAndGo(page, URL, [PROFILE_ALEX, PROFILE_SAM, ...MANY_PROFILES]);

    const trigger = page.getByRole("button", { name: /Kies profiel B:/ });
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Kies profiel B" });
    const title = dialog.getByRole("heading", { name: "Kies profiel B" });
    const scrollBody = dialog.getByTestId("profile-selector-scroll");
    const lastProfile = dialog.getByRole("button", { name: /^Gedeeld 24,/ });

    await expect(dialog).toBeVisible();
    await expect(title).toBeVisible();

    await lastProfile.scrollIntoViewIfNeeded();
    await expect.poll(() => scrollBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(title).toBeVisible();
    await expect(lastProfile).toBeVisible();

    await lastProfile.click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toHaveAccessibleName("Kies profiel B: Gedeeld 24");
  });

  test("start contractopstelling met het expliciet gekozen paar", async ({ page }) => {
    const createContract = page.getByRole("button", { name: "Contract opstellen" });
    await expect(createContract).toBeEnabled();
    await createContract.click();
    await expect(page).toHaveURL(/\/contract\?a=pw-alex-001&b=pw-sam-002$/);
  });

  test("lege staat blijft begrijpelijk zonder URL-params", async ({ page }) => {
    await seedAndGo(page, "/compare", [PROFILE_ALEX, PROFILE_SAM]);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/profiel|kies|selecteer|vergelijk/i);
  });
});
