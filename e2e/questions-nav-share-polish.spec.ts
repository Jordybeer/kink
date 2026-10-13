import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

const PROFILES = [PROFILE_ALEX, PROFILE_SAM];

test("Home keeps one brand statement and moves product explanation into the shared context menu", async ({ page }) => {
  await seedAndGo(page, "/", PROFILES);

  await expect(page.getByText("Verken grenzen. Samen.", { exact: true })).toBeVisible();
  await expect(page.getByText("Twee profielen. Eén gesprek.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Alle stemmen aan tafel. Eén gesprek.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ontdek hoe KinkSync werkt" })).toHaveCount(0);

  await page.getByRole("button", { name: "Meer opties" }).click();
  await expect(page.getByRole("menuitem", { name: "Over KinkSync" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Security & privacy" })).toBeVisible();
});

test("profile keeps notes attached to their subject and reveals them only in deliberate status detail", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, PROFILES);

  await expect(page.getByText("Klassiek en heerlijk", { exact: true })).toBeHidden();
  await expect(page.getByText("Shibari ook", { exact: true })).toBeHidden();
  await expect(page.getByText("Lichte sessies", { exact: true })).toBeHidden();

  await page.getByTestId("profile-read-status-yes").click();
  await expect(page.getByText("Klassiek en heerlijk", { exact: true })).toBeVisible();
  await expect(page.getByText("Shibari ook", { exact: true })).toBeVisible();

  await page.getByRole("region", { name: "Interesses & grenzen" }).getByRole("link", { name: /^Ja,/ }).click();
  await expect(page.getByText("Lichte sessies", { exact: true })).toBeVisible();

  await expect(page.getByRole("button", { name: "Verberg notities" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Toon notities" })).toHaveCount(0);
});

test("sharing keeps local-only warning and links to the trust explanation", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, PROFILES);
  await page.getByLabel("Hoofdnavigatie").getByRole("button", { name: "Meer acties" }).click();
  await page.getByRole("menuitem", { name: "Profiel delen" }).click();

  const dialog = page.getByRole("dialog", { name: "Profiel delen" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Verborgen antwoorden.*persoonlijke notitie.*blijven op dit toestel/i)).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Hoe delen en beveiliging werken" })).toHaveAttribute("href", "/about#limits-title");
});
