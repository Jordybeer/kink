import { test, expect } from "@playwright/test";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

async function openFirstSpankingEditor(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /Onderwerpen beheren/ }).click();
  const search = page.getByPlaceholder("Zoek in de volledige catalogus…");
  await search.fill("spanking");
  const result = page.locator('button[aria-label*=", bewerken"]').first();
  await expect(result).toBeVisible();
  await result.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("Edit Kinks cohesion", () => {
  test.beforeEach(async ({ page }) => {
    const emptyAlex = { ...PROFILE_ALEX, entries: {} };
    await seedAndGo(page, "/profile/pw-alex-001", [emptyAlex]);
  });

  test("scheidt antwoord, grenzen, ervaring en zichtbaarheid", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const dialog = await openFirstSpankingEditor(page);

    await expect(dialog.getByText("Jouw antwoord", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Grenzen & afspraken", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Ervaring & interesse", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Zichtbaarheid", { exact: true })).toBeVisible();

    const boundaries = dialog.locator("section").filter({ hasText: "Grenzen & afspraken" });
    await expect(boundaries.getByRole("button", { name: /Eerst vragen/ })).toBeVisible();
    await expect(boundaries.getByRole("button", { name: /Alleen in privésfeer/ })).toBeVisible();
    await expect(boundaries.getByRole("button", { name: /Alleen voor afgesproken scène/ })).toBeVisible();

    const experience = dialog.locator("section").filter({ hasText: "Ervaring & interesse" });
    await expect(experience.getByRole("button", { name: /Eerste keer/ })).toBeVisible();
    await expect(experience.getByRole("button", { name: /Nieuwsgierig/ })).toBeVisible();
  });

  test("een gekozen status wist zichzelf niet meer en mobiel sluiten blijft bereikbaar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const dialog = await openFirstSpankingEditor(page);
    const statusGroup = dialog.getByRole("group", { name: "Status kiezen" });
    const yes = statusGroup.getByRole("button", { name: /Heel graag/ });

    await yes.click();
    await expect(yes).toHaveAttribute("aria-pressed", "true");
    await yes.click();
    await expect(yes).toHaveAttribute("aria-pressed", "true");

    const clear = dialog.getByRole("button", { name: "Antwoord wissen" });
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(yes).toHaveAttribute("aria-pressed", "false");
    await expect(clear).toHaveCount(0);

    const close = dialog.getByRole("button", { name: "Kink bewerken sluiten" });
    await expect(close).toBeVisible();
    const scrollBody = dialog.getByTestId("sheet-scroll-body");
    await scrollBody.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await expect.poll(() => scrollBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(close).toBeVisible();

    await close.click();
    await expect(dialog).toBeHidden();
  });
});
