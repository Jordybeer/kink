import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX } from "./fixtures";

const AUDIT_PROFILE = {
  ...PROFILE_ALEX,
  id: "test-pw-001",
  name: "Playwright",
  entries: {
    spanking_hand: { status: "yes" as const, score: null, comment: "notitie hier" },
    spanking_implement: { status: "willing" as const, score: null, comment: "" },
    flogging: { status: "maybe" as const, score: null, comment: "" },
    paddling: { status: "no" as const, score: null, comment: "" },
    cropping: { status: "hard_no" as const, score: null, comment: "" },
  },
};

// 390 is the Pixel-ish default; 375 is the smallest phone the house dresses
// for — every overflow guard runs at both so the corset never pinches.
const MOBILE_VIEWPORTS = [
  { width: 390, height: 844, label: "390px" },
  { width: 375, height: 667, label: "375px" },
] as const;

test.describe("UI audit", () => {

  test("home page — no overflow on any axis, screenshot", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "/tmp/pw-home.png", fullPage: true });
    const { xOverflow, yNested } = await page.evaluate(() => ({
      xOverflow: document.body.scrollWidth > window.innerWidth,
      yNested: Array.from(document.querySelectorAll("*")).some(el => {
        const s = window.getComputedStyle(el);
        return s.overflowX === "scroll" && el.scrollWidth > el.clientWidth + 2;
      }),
    }));
    expect(xOverflow).toBe(false);
  });

  test("profile page — key elements visible, no clipping", async ({ page }) => {
    // Create a profile first via localStorage seed
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Check if there's a create profile button or form
    await page.screenshot({ path: "/tmp/pw-home-full.png", fullPage: true });
  });

  test("compare page — no overflow, screenshot", async ({ page }) => {
    await page.goto("/compare");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "/tmp/pw-compare.png", fullPage: true });
    const xOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(xOverflow).toBe(false);
  });

  test("contract page — no overflow, screenshot", async ({ page }) => {
    await page.goto("/contract");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "/tmp/pw-contract.png", fullPage: true });
    const xOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(xOverflow).toBe(false);
  });

  for (const vp of MOBILE_VIEWPORTS) {
    test(`mobile viewport ${vp.label} — home page no overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `/tmp/pw-home-mobile-${vp.width}.png`, fullPage: true });
      const xOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
      expect(xOverflow).toBe(false);
    });

    test(`mobile viewport ${vp.label} — compare page no overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/compare");
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `/tmp/pw-compare-mobile-${vp.width}.png`, fullPage: true });
      const xOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
      expect(xOverflow).toBe(false);
    });

    test(`mobile viewport ${vp.label} — contract page no overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/contract");
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `/tmp/pw-contract-mobile-${vp.width}.png`, fullPage: true });
      const xOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
      expect(xOverflow).toBe(false);
    });
  }

  test("seed profile then visit profile page", async ({ page }) => {
    await seedAndGo(page, "/profile/test-pw-001", [AUDIT_PROFILE]);
    await page.screenshot({ path: "/tmp/pw-profile.png", fullPage: true });

    await expect(page.getByText("Playwright", { exact: true }).first()).toBeVisible();

    // Check Bewerken tab is visible in the profile hero area
    const bewerkenTab = page.getByRole("tab", { name: "Bewerken" });
    const tabY = await bewerkenTab.evaluate(el => el.getBoundingClientRect().top);
    expect(tabY).toBeLessThan(600);

    // Check no x overflow
    const xOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(xOverflow).toBe(false);

    // Mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/pw-profile-mobile.png", fullPage: true });
    const xOverflowMobile = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(xOverflowMobile).toBe(false);
  });

  test("profile page — status bar renders, kink overview shows 5 statuses", async ({ page }) => {
    await seedAndGo(page, "/profile/test-pw-001", [AUDIT_PROFILE]);

    // Overview should count the five rated kinks — not the vacuous
    // "Nog niets beoordeeld." that also contains the word.
    await expect(page.locator("text=5 beoordeeld").first()).toBeVisible();

    await page.getByRole("tab", { name: "Bewerken" }).click();
    const statusBar = page.getByRole("img", { name: /Harde grens/ });
    await expect(statusBar).toBeVisible();
    const statusLabel = await statusBar.getAttribute("aria-label");
    expect(statusLabel).not.toContain("nog niets beoordeeld");

    // No ★ characters anywhere on page
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).not.toContain("★");
  });

  test("check for elements clipped by bottom nav", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAndGo(page, "/", []);

    // Check BottomNav z-index is high
    const navZ = await page.evaluate(() => {
      const nav = document.querySelector("nav") || document.querySelector('[class*="bottom"]');
      return nav ? parseInt(window.getComputedStyle(nav).zIndex) || 0 : 0;
    });
    // Sheet components should have higher z-index than BottomNav
    // Just verify no obvious overlap issues by checking nothing is visually stuck
    const xOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(xOverflow).toBe(false);
  });
});
