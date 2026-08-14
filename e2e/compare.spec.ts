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
    expect(text).toMatch(/voorkeuren die jullie allebei hebben beoordeeld/i);
    expect(text).not.toContain("Sterke compatibiliteit");
    expect(text).not.toContain("Goede basis");
    expect(text).not.toContain("compatibiliteitsscore");
  });

  test("toont de rol van beide gekozen profielen", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Kies profiel A: Alex" })).toContainText("Dominant");
    await expect(page.getByRole("button", { name: "Kies profiel B: Sam" })).toContainText("Submissive");
  });

  test("toont v2-dimensies en expliciete directionality", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toContain("Samen");
    expect(text).toContain("Rollen");
    expect(text).toContain("Bespreken");
    expect(text).toContain("Grenzen");
    expect(text).toContain("Spanking (hand) — geven ↔ ontvangen");
    expect(text).toMatch(/[Ff]logging/);
  });

  test("maakt alle v2-resultaatfilters bereikbaar", async ({ page }) => {
    const labels = ["Alles", "Samen", "Rollen", "Bespreken", "Zachte verschillen", "Conflicten", "Grenzen"];
    for (const label of labels) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    }

    const all = page.getByRole("button", { name: "Alles", exact: true });
    const complementary = page.getByRole("button", { name: "Rollen", exact: true });
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await complementary.click();
    await expect(complementary).toHaveAttribute("aria-pressed", "true");
    await expect(all).toHaveAttribute("aria-pressed", "false");
  });

  test("houdt eenzijdige antwoorden apart van pair-resultaten", async ({ page }) => {
    const details = page.locator("details").filter({ hasText: "Nog niet door beiden beoordeeld" });
    await expect(details).toBeVisible();
    await expect(details.locator("summary")).toContainText(/Nog niet door beiden beoordeeld · [1-9]/);
    await details.locator("summary").click();
    await expect(details).toContainText("Deze punten tellen nergens mee als pair-resultaat");
    await expect(details).toContainText(/Alex: (Heel graag|Ja|Misschien|Voor hen|Harde grens)|Sam: (Heel graag|Ja|Misschien|Voor hen|Harde grens)/);
  });

  test("benadrukt dat profieloverlap geen toestemming is", async ({ page }) => {
    await expect(page.getByText(/betekent natuurlijk niet automatisch toestemming/i)).toBeVisible();
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
