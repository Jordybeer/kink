import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

test.describe("gevulde Home-hiërarchie", () => {
  test("toont profielen als één rustige groep en bewaart Vergelijk als featurevlak", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAndGo(page, "/", [PROFILE_ALEX, PROFILE_SAM], {
      onboardingComplete: true,
      profileTourComplete: true,
    });

    const heading = page.getByRole("heading", { name: "Mijn profielen", exact: true });
    const profileStack = page.locator("[data-home-profile-stack]");
    const compare = page.locator("[data-home-compare-feature]");
    const utilities = page.locator("[data-home-utility-list]");

    await expect(heading).toBeVisible();
    await expect(profileStack).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Alex Dominant openen" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sam Submissive openen" })).toBeVisible();

    const headingParentHasRedundantCount = await heading.locator("xpath=..").getByText("2", { exact: true }).count();
    expect(headingParentHasRedundantCount).toBe(0);

    await expect(compare).toBeVisible();
    await expect(utilities).toBeVisible();
    await expect(utilities.getByRole("link")).toHaveCount(3);

    await expect.poll(() => profileStack.evaluate((element) => getComputedStyle(element).boxShadow)).toContain("inset");
    expect(await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)).toBe(false);
  });
});
