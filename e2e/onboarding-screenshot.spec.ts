import { test } from "@playwright/test";

test("onboarding full scroll", async ({ page }) => {
  // Clear storage so onboarding shows
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/ss-onboarding-1.png", fullPage: false });

  // Try swiping/scrolling through onboarding slides
  for (let i = 0; i < 7; i++) {
    await page.screenshot({ path: `/tmp/ss-onboarding-slide-${i}.png`, fullPage: false });
    // Try clicking next or swiping right
    const nextBtn = page.locator("button").filter({ hasText: /volgende|next|verder|→/i });
    if (await nextBtn.count() > 0) {
      await nextBtn.first().click();
      await page.waitForTimeout(400);
    } else {
      // Swipe left to go to next slide
      await page.evaluate(() => window.scrollBy(400, 0));
      await page.waitForTimeout(300);
    }
  }
  await page.screenshot({ path: "/tmp/ss-onboarding-last.png", fullPage: true });
});
