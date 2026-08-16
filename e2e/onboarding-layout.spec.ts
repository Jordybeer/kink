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
    // Wait until the staggered entry motion reaches its final painted geometry before
    // physically measuring the icon-to-eyebrow gap.
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
      const titleElement = element.nextElementSibling as HTMLElement | null;

      // Resolve the authored responsive token in the browser itself. Dynamic viewport
      // units are browser-defined and must not be approximated from Playwright's requested
      // viewport height: mobile emulation can resolve dvh against a different visual viewport.
      const probe = document.createElement("div");
      probe.style.marginTop = "clamp(0.875rem, 2.2dvh, 1.25rem)";
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      document.body.appendChild(probe);

      const expectedTitleMargin = Number.parseFloat(getComputedStyle(probe).marginTop);
      probe.remove();

      return {
        iconGap: iconRect ? eyebrowRect.top - iconRect.bottom : -1,
        titleMargin: titleElement ? Number.parseFloat(getComputedStyle(titleElement).marginTop) : -1,
        expectedTitleMargin,
      };
    });

    expect(rhythm.iconGap).toBeGreaterThanOrEqual(12);

    // This still verifies the exact authored clamp token. It simply lets the browser be
    // the source of truth for dvh instead of duplicating viewport-unit semantics in JS.
    expect(Math.abs(rhythm.titleMargin - rhythm.expectedTitleMargin)).toBeLessThanOrEqual(0.25);

    const actionBox = await primaryAction.boundingBox();
    const visibleHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
    expect(actionBox).not.toBeNull();
    expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(visibleHeight + 1);

    const horizontalOverflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(horizontalOverflow).toBe(false);
  });
}
