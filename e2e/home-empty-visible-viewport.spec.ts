import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

const VIEWPORTS = [
  { width: 320, height: 667 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
] as const;

test.describe("lege Home gebruikt de werkelijk zichtbare browserruimte", () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.width}x${viewport.height} reserveert geen verborgen PWA-dock`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await seedAndGo(page, "/", [], { onboardingComplete: true, profileTourComplete: false });

      const card = page.locator("[data-home-empty-card]");
      const stage = card.locator("xpath=ancestor::main");
      await expect(card).toBeVisible();
      await expect(page.locator(".bottom-nav")).toBeHidden();

      const clearance = await stage.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--page-bottom-clearance").trim(),
      );
      expect(clearance).toBe("0px");

      const [stageBox, cardBox] = await Promise.all([
        stage.boundingBox(),
        card.boundingBox(),
      ]);
      expect(stageBox).not.toBeNull();
      expect(cardBox).not.toBeNull();

      const visibleBottom = await page.evaluate(() =>
        Math.round(window.visualViewport?.height ?? window.innerHeight),
      );
      const stageBottom = stageBox!.y + stageBox!.height;
      expect(Math.abs(stageBottom - visibleBottom)).toBeLessThanOrEqual(2);

      const freeAbove = cardBox!.y - stageBox!.y;
      const freeBelow = stageBottom - (cardBox!.y + cardBox!.height);
      expect(Math.abs(freeAbove - freeBelow)).toBeLessThanOrEqual(12);
      expect(await page.evaluate(() => document.body.scrollHeight - window.innerHeight)).toBeLessThanOrEqual(2);
    });
  }

  test("leeg en gevuld gebruiken dezelfde afstand onder de Home-masthead", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await seedAndGo(page, "/", [], { onboardingComplete: true, profileTourComplete: false });
    const emptyMain = page.locator("main").first();
    const emptyGap = await emptyMain.evaluate((element) => getComputedStyle(element).paddingTop);

    await seedAndGo(page, "/", [PROFILE_ALEX], { onboardingComplete: true, profileTourComplete: true });
    const populatedMain = page.locator("main").first();
    const populatedGap = await populatedMain.evaluate((element) => getComputedStyle(element).paddingTop);

    expect(emptyGap).toBe("8px");
    expect(populatedGap).toBe(emptyGap);
  });
});
