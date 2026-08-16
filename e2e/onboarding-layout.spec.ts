import { expect, test } from "@playwright/test";

const IPHONE_VIEWPORTS = [
  { name: "compact", width: 320, height: 568 },
  { name: "standard", width: 390, height: 844 },
  { name: "large", width: 430, height: 932 },
] as const;

for (const viewport of IPHONE_VIEWPORTS) {
  test(`onboarding intro rhythm stays breathable on ${viewport.name} iPhone viewport`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Begin", exact: true }).click();

    const eyebrow = page.getByText("Voor we beginnen", { exact: true });
    const title = page.getByRole("heading", { name: "18+?" });
    const primaryAction = page.getByRole("button", { name: "Ik ben 18+", exact: true });

    await expect(eyebrow).toBeVisible();
    await expect(title).toBeVisible();
    await expect(primaryAction).toBeVisible();

    // Measure normal document flow rather than transformed paint boxes. Framer Motion
    // deliberately translates staggered children during entry, while offset geometry
    // remains the stable layout contract we want this regression test to protect.
    const rhythm = await eyebrow.evaluate((element) => {
      const eyebrowElement = element as HTMLElement;
      const iconElement = element.previousElementSibling as HTMLElement | null;
      const titleElement = element.nextElementSibling as HTMLElement | null;

      return {
        iconGap: iconElement
          ? eyebrowElement.offsetTop - (iconElement.offsetTop + iconElement.offsetHeight)
          : -1,
        titleGap: titleElement
          ? titleElement.offsetTop - (eyebrowElement.offsetTop + eyebrowElement.offsetHeight)
          : -1,
      };
    });

    expect(rhythm.iconGap).toBeGreaterThanOrEqual(12);
    expect(rhythm.titleGap).toBeGreaterThanOrEqual(10);

    const actionBox = await primaryAction.boundingBox();
    const visibleHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
    expect(actionBox).not.toBeNull();
    expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(visibleHeight + 1);

    const horizontalOverflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(horizontalOverflow).toBe(false);
  });
}
