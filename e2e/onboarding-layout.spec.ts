import { expect, test } from "@playwright/test";

const IPHONE_VIEWPORTS = [
  { name: "compact", width: 320, height: 568 },
  { name: "standard", width: 390, height: 844 },
  { name: "large", width: 430, height: 932 },
] as const;

for (const viewport of IPHONE_VIEWPORTS) {
  test(`onboarding age gate stays reachable on ${viewport.name} iPhone viewport`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Begin", exact: true }).click();

    const hiddenEyebrow = page.getByText("Voor we beginnen", { exact: true });
    const title = page.getByRole("heading", { name: "18+?" });
    const ageCopy = page.getByText("Je moet wel 18 of ouder zijn.", { exact: true });
    const primaryAction = page.getByRole("button", { name: "Ik ben 18+", exact: true });
    const secondaryAction = page.getByRole("button", { name: "Ik ben jonger", exact: true });

    await expect(hiddenEyebrow).toBeHidden();
    await expect(title).toBeVisible();
    await expect(ageCopy).toBeVisible();
    await expect(primaryAction).toBeVisible();
    await expect(secondaryAction).toBeVisible();

    const titleMargin = await title.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).marginTop),
    );
    expect(titleMargin).toBeLessThanOrEqual(0.25);

    const visibleHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
    for (const action of [primaryAction, secondaryAction]) {
      const box = await action.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(-1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(visibleHeight + 1);
    }

    const overflow = await page.evaluate(() => ({
      horizontal: document.body.scrollWidth > document.body.clientWidth,
      vertical: document.body.scrollHeight - (window.visualViewport?.height ?? window.innerHeight),
    }));
    expect(overflow.horizontal).toBe(false);
    expect(overflow.vertical).toBeLessThanOrEqual(2);
  });
}
