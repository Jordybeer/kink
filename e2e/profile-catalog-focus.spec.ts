import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

test("catalogusbeheer vervangt de profielhero en herstelt context en focus na Gereed", async ({ page }) => {
  await seedAndGo(page, "/profile/pw-alex-001", [PROFILE_ALEX, PROFILE_SAM], { profileTourComplete: true });

  const summary = page.getByTestId("profile-summary");
  const nav = page.getByLabel("Hoofdnavigatie");
  const manage = page.getByRole("region", { name: "Profieloverzicht" })
    .getByRole("button", { name: "Catalogus doorzoeken", exact: true });
  await expect(summary).toBeVisible();
  await expect(summary.getByText("Onderwerpen beheren", { exact: true })).toHaveCount(0);
  await expect(manage).toBeVisible();
  await expect(manage).toHaveText("Catalogus doorzoeken");
  await expect(nav.getByRole("button", { name: "Profiel bewerken" })).toBeVisible();
  await expect(nav.getByRole("button", { name: "Meer acties" })).toBeVisible();

  await manage.click();
  await expect(summary).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Catalogus", exact: true })).toBeFocused();
  await expect(page.getByTestId("profile-catalog-manager-header")).toBeVisible();
  await expect(page.getByPlaceholder("Zoek in de volledige catalogus…")).toBeVisible();
  await expect(nav.getByRole("button", { name: "Profiel bewerken" })).toHaveCount(0);

  const search = page.getByRole("textbox", { name: "Volledige catalogus doorzoeken" });
  await search.fill("geen-bestaand-onderwerp-zzt");
  await expect(page.getByText("Geen onderwerpen gevonden.")).toBeVisible();
  await page.getByRole("button", { name: "Zoekopdracht wissen" }).click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();

  await page.getByRole("button", { name: "Categorie, Alle categorieën" }).click();
  await page.getByRole("dialog", { name: "Categorie kiezen" }).getByRole("button", { name: /Impact Play/ }).click();
  await search.fill("geen-bestaand-onderwerp-zzt");
  const allCategories = page.getByRole("button", { name: "Zoek in alle categorieën" });
  await allCategories.focus();
  await allCategories.press("Enter");
  await expect(page.getByRole("button", { name: "Categorie, Alle categorieën" })).toBeFocused();
  await expect(search).toHaveValue("geen-bestaand-onderwerp-zzt");

  await page.getByRole("button", { name: "Gereed" }).click();
  await expect(summary).toBeVisible();
  await expect(page.getByTestId("profile-catalog-controls")).toHaveCount(0);
  await expect(manage).toBeVisible();
  await expect(manage).toBeFocused();
  await expect(nav.getByRole("button", { name: "Profiel bewerken" })).toBeVisible();
  await expect(nav.getByRole("button", { name: "Meer acties" })).toBeVisible();
});
