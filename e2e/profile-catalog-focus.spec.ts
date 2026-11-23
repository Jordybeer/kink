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
  await expect(nav.getByRole("button", { name: "Profiel bewerken" })).toBeVisible();
  await expect(nav.getByRole("button", { name: "Meer acties" })).toBeVisible();

  await manage.click();
  await expect(summary).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Catalogus", exact: true })).toBeFocused();
  await expect(page.getByTestId("profile-catalog-manager-header")).toBeVisible();
  await expect(page.getByPlaceholder("Zoek in de volledige catalogus…")).toBeVisible();
  await expect(nav.getByRole("button", { name: "Profiel bewerken" })).toHaveCount(0);

  await page.getByRole("button", { name: "Gereed" }).click();
  await expect(summary).toBeVisible();
  await expect(page.getByTestId("profile-catalog-controls")).toHaveCount(0);
  await expect(manage).toBeVisible();
  await expect(manage).toBeFocused();
  await expect(nav.getByRole("button", { name: "Profiel bewerken" })).toBeVisible();
  await expect(nav.getByRole("button", { name: "Meer acties" })).toBeVisible();
});

test("een cataloguswijziging keert terug naar het opgeslagen antwoord en respecteert privé", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await seedAndGo(page, "/profile?id=pw-alex-001&interests=yes", [PROFILE_ALEX, PROFILE_SAM]);

  const manage = page.getByRole("button", { name: "Catalogus doorzoeken" });
  const search = page.getByRole("textbox", { name: "Volledige catalogus doorzoeken" });
  const item = page.locator('#profile-catalog-manager [data-kink-id="wax_play"]');
  const overview = page.getByTestId("profile-status-overview");
  await manage.click();
  await search.fill("wax");
  const row = item.locator("[data-profile-topic-trigger]");
  await expect(row).toContainText("Heel graag");
  await row.click();
  await item.getByRole("group", { name: "Status kiezen" }).getByRole("button", { name: /^Harde grens/ }).click();
  await item.getByRole("button", { name: "Terug naar profiel" }).click();

  const limit = overview.locator('[data-kink-id="wax_play"] [data-profile-topic-trigger]');
  await expect(limit).toBeFocused();
  await expect(limit).toBeInViewport();
  await expect(limit).toContainText("Harde grens");
  await expect(page.getByTestId("profile-read-status-hard_no")).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/interests=hard_no/);
  await page.reload();
  await expect(limit).toContainText("Harde grens");

  await manage.click();
  await search.fill("wax");
  await row.click();
  await item.getByRole("button", { name: "Details", exact: true }).click();
  await item.getByRole("button", { name: "Antwoord privé maken" }).click();
  await expect(item).not.toContainText("Harde grens");
  await expect(search).toBeFocused();
  await search.press("Escape");
  await expect(manage).toBeFocused();
  await expect(limit).toHaveCount(0);
  await expect(page.getByTestId("profile-read-private")).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
