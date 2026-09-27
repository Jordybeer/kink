import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

test.describe("gevulde Home-hiërarchie", () => {
  test("houdt Home compact en onthult extra eigen profielen alleen op verzoek", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAndGo(page, "/", [PROFILE_ALEX, PROFILE_SAM], {
      onboardingComplete: true,
      profileTourComplete: true,
      pinnedProfileId: PROFILE_ALEX.id,
    });

    const heading = page.getByRole("heading", { name: "Mijn profielen", exact: true });
    const profileStack = page.locator("[data-home-profile-stack]");
    const compare = page.locator("[data-home-compare-feature]");
    const utilities = page.locator("[data-home-utility-list]");
    const profileActions = page.locator("[data-home-profile-actions]");

    await expect(heading).toBeVisible();
    await expect(profileStack).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Alex Dominant openen" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sam Submissive openen" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Alle profielen · 2" })).toBeVisible();

    await expect(page.getByText(/beoordeeld/i)).toHaveCount(0);
    await expect(compare).toBeVisible();
    await expect(compare).toHaveAccessibleName("Vergelijk Alex en Sam");
    await expect(compare.getByText("Vergelijk", { exact: true })).toHaveCount(0);
    await expect(utilities).toBeVisible();
    await expect(utilities.getByRole("link")).toHaveCount(3);
    await expect(profileActions).toBeVisible();
    await expect(profileActions.getByRole("button", { name: "Nieuw profiel" })).toBeVisible();
    await expect(profileActions.getByRole("button", { name: "Scan gedeeld profiel" })).toBeVisible();
    await expect(profileActions.getByText("Perspectief en startlijst", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Alle profielen · 2" }).click();
    await expect(page.getByRole("link", { name: "Sam Submissive openen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Minder profielen" })).toBeVisible();

    expect(await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)).toBe(false);
  });

  test("toont maximaal twee gedeelde personen voordat de lijst wordt uitgeklapt", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const shared = ["Dom", "Sub", "Alias", "Vierde"].map((name, index) => ({
      ...PROFILE_SAM,
      id: `shared-${index}`,
      name,
      createdAt: PROFILE_SAM.createdAt + index,
      updatedAt: PROFILE_SAM.updatedAt + index,
      origin: "shared" as const,
      isImported: true,
    }));

    await seedAndGo(page, "/", [PROFILE_ALEX, ...shared], {
      onboardingComplete: true,
      profileTourComplete: true,
      pinnedProfileId: PROFILE_ALEX.id,
    });

    await expect(page.getByRole("heading", { name: "Gedeeld met mij", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dom Submissive openen" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sub Submissive openen" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Alias Submissive openen" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Vierde Submissive openen" })).toHaveCount(0);

    const disclose = page.getByRole("button", { name: "Alle gedeelde profielen · 4" });
    await expect(disclose).toBeVisible();
    await disclose.click();
    await expect(page.getByRole("link", { name: "Alias Submissive openen" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Vierde Submissive openen" })).toBeVisible();
    await expect(page.getByText(/beoordeeld/i)).toHaveCount(0);
  });
});
