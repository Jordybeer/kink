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

test("profile notes toggle says what it will do", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, PROFILES);

  const hide = page.getByRole("button", { name: "Verberg notities" });
  await expect(hide).toBeVisible();
  await hide.click();
  const show = page.getByRole("button", { name: "Toon notities" });
  await expect(show).toBeVisible();
  await show.click();
  await expect(page.getByRole("button", { name: "Verberg notities" })).toBeVisible();
});

test("sharing keeps local-only warning and links to the trust explanation", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, PROFILES);
  await page.getByRole("button", { name: "Profiel delen" }).click();

  const dialog = page.getByRole("dialog", { name: "Profiel delen" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Verborgen antwoorden.*persoonlijke notitie.*blijven op dit toestel/i)).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Hoe delen en beveiliging werken" })).toHaveAttribute("href", "/about#limits-title");
});