import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

test("catalogusbeheer vervangt de profielhero en herstelt context en focus na Gereed", async ({ page }) => {
  await seedAndGo(page, "/profile/pw-alex-001", [PROFILE_ALEX, PROFILE_SAM], { profileTourComplete: true });

  const summary = page.getByTestId("profile-summary");
  const nav = page.getByLabel("Hoofdnavigatie");
  const manage = page.getByRole("button", { name: /Onderwerpen beheren/ });
  await expect(summary).toBeVisible();
  await expect(manage).toBeVisible();
  await expect(nav.getByRole("button", { name: "Profiel delen" })).toBeVisible();
  await expect(nav.getByRole("button", { name: "Profiel bewerken" })).toBeVisible();

  await manage.click();
  await expect(summary).toHaveCount(0);
  await expect(page.getByTestId("profile-catalog-manager-header")).toBeVisible();
  await expect(page.getByPlaceholder("Zoek in de volledige catalogus…")).toBeVisible();
  await expect(nav.getByRole("button", { name: "Profiel delen" })).toHaveCount(0);
  await expect(nav.getByRole("button", { name: "Profiel bewerken" })).toHaveCount(0);

  await page.getByRole("button", { name: "Gereed" }).click();
  await expect(summary).toBeVisible();
  await expect(page.getByTestId("profile-catalog-controls")).toHaveCount(0);
  await expect(manage).toBeVisible();
  await expect(manage).toBeFocused();
  await expect(nav.getByRole("button", { name: "Profiel delen" })).toBeVisible();
  await expect(nav.getByRole("button", { name: "Profiel bewerken" })).toBeVisible();
});
