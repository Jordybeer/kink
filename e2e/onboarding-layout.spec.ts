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

    const eyebrowLabel = page.getByText("Voor we beginnen", { exact: true });
    const eyebrow = eyebrowLabel.locator("..");
    const title = page.getByRole("heading", { name: "18+?" });
    const primaryAction = page.getByRole("button", { name: "Ik ben 18+", exact: true });

    await expect(eyebrowLabel).toBeVisible();
    await expect(title).toBeVisible();
    await expect(primaryAction).toBeVisible();

    // The label lives in a child span because the eyebrow also contains its accent rule.
    // Measure from the actual eyebrow container to its block siblings, after the short
    // staggered entrance motion has reached its final painted geometry.
    await expect.poll(async () => eyebrow.evaluate((element) => {
      const siblings = [element.previousElementSibling, element, element.nextElementSibling]
        .filter((candidate): candidate is Element => candidate !== null);

      return siblings.every((candidate) => {
        const transform = getComputedStyle(candidate).transform;
        if (transform === "none") return true;
        const matrix = new DOMMatrixReadOnly(transform);
        return Math.abs(matrix.m41) < 0.1 && Math.abs(matrix.m42) < 0.1;
      });
    })).toBe(true);

    const rhythm = await eyebrow.evaluate((element) => {
      const eyebrowRect = element.getBoundingClientRect();
      const iconRect = element.previousElementSibling?.getBoundingClientRect();
      const titleRect = element.nextElementSibling?.getBoundingClientRect();

      return {
        iconGap: iconRect ? eyebrowRect.top - iconRect.bottom : -1,
        titleGap: titleRect ? titleRect.top - eyebrowRect.bottom : -1,
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
