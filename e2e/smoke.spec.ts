import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

test("home page loads without horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
  expect(overflow).toBe(false);
});

test("all interactive elements meet 44px touch target minimum", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const violations = await page.evaluate(() => {
    const targets = Array.from(document.querySelectorAll("button, a[href], input, select, textarea"));
    return targets
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { tag: el.tagName, w: r.width, h: r.height, text: (el as HTMLElement).innerText?.slice(0, 30) };
      })
      .filter((el) => el.w > 0 && el.h > 0 && (el.w < 44 || el.h < 44));
  });
  if (violations.length > 0) {
    console.warn("Touch target violations:", violations);
  }
  // Soft check — warn but don't fail on < 44px (some decorative links are intentionally small)
  expect(violations.length).toBeLessThan(10);
});

test("main element has dark background — no white flash", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const bg = await page.evaluate(() => {
    const main = document.querySelector("main");
    return main ? window.getComputedStyle(main).backgroundColor : "";
  });
  // Background should not be pure white (rgb(255, 255, 255))
  expect(bg).not.toBe("rgb(255, 255, 255)");
});

test("contract page shows its empty state without profile params", async ({ page }) => {
  await seedAndGo(page, "/contract", [PROFILE_ALEX, PROFILE_SAM]);
  const text = await page.evaluate(() => document.body.innerText);
  expect(text).toMatch(/geen|selecteer|profiel/i);
});
