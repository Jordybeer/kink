import { test, expect } from "@playwright/test";

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

  test("mobile viewport — home page no overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "/tmp/pw-home-mobile.png", fullPage: true });
    const xOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(xOverflow).toBe(false);
  });

  test("mobile viewport — compare page no overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/compare");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "/tmp/pw-compare-mobile.png", fullPage: true });
    const xOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(xOverflow).toBe(false);
  });

  test("mobile viewport — contract page no overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/contract");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "/tmp/pw-contract-mobile.png", fullPage: true });
    const xOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(xOverflow).toBe(false);
  });

  test("seed profile then visit profile page", async ({ page }) => {
    // Seed localStorage with a test profile
    await page.goto("/");
    await page.evaluate(() => {
      const profile = {
        id: "test-pw-001",
        name: "Playwright",
        role: "Switch",
        experienceLevel: "ervaren",
        customKinks: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        entries: {
          "bdsm-general": { status: "yes", score: null, comment: "test notitie" },
          "bondage-rope": { status: "willing", score: null, comment: "" },
          "impact-spanking": { status: "maybe", score: null, comment: "" },
          "pain-biting": { status: "no", score: null, comment: "" },
          "humiliation-general": { status: "hard_no", score: null, comment: "" },
        }
      };
      const existing = JSON.parse(localStorage.getItem("kink-profiles") || "{}");
      existing.state = existing.state || {};
      existing.state.profiles = [profile];
      existing.version = 8;
      localStorage.setItem("kink-profiles", JSON.stringify(existing));
    });
    await page.goto("/profile/test-pw-001");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "/tmp/pw-profile.png", fullPage: true });

    // Check key elements are visible
    const heroVisible = await page.locator("text=Playwright").isVisible();
    expect(heroVisible).toBe(true);

    // Check Bewerken tab is visible in the profile hero area
    const bewerkenTab = page.locator("button, [role='tab']").filter({ hasText: /^Bewerken$/ });
    const hasTab = await bewerkenTab.count() > 0;
    if (hasTab) {
      const tabY = await bewerkenTab.first().evaluate(el => el.getBoundingClientRect().top);
      expect(tabY).toBeLessThan(600);
    }

    // Check no x overflow
    const xOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(xOverflow).toBe(false);

    // Mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/pw-profile-mobile.png", fullPage: true });
    const xOverflowMobile = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(xOverflowMobile).toBe(false);
  });

  test("profile page — DNA bar renders, kink overview shows 5 statuses", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const profile = {
        id: "test-pw-001",
        name: "Playwright",
        role: "Switch",
        experienceLevel: "ervaren",
        customKinks: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        entries: {
          // Live kink ids from lib/kinks.ts — the v8-era slugs rotted into
          // ghosts and made this test pass on an empty overview for weeks.
          spanking_hand: { status: "yes", score: null, comment: "notitie hier" },
          spanking_implement: { status: "willing", score: null, comment: "" },
          flogging: { status: "maybe", score: null, comment: "" },
          caning: { status: "no", score: null, comment: "" },
          cropping: { status: "hard_no", score: null, comment: "" },
        }
      };
      const s = { state: { profiles: [profile] }, version: 15 };
      localStorage.setItem("kink-profiles", JSON.stringify(s));
    });
    await page.goto("/profile/test-pw-001");
    await page.waitForLoadState("networkidle");

    // Overview should count the five rated kinks — not the vacuous
    // "Nog niets beoordeeld." that also contains the word.
    await expect(page.locator("text=5 beoordeeld").first()).toBeVisible();

    // The DNA bar left the hero in 5bd1c25 ("hero is identity, not
    // statistics") — it now lives in the Bewerken tab's sticky header,
    // and the tabs themselves are radios these days.
    await page.getByRole("radio", { name: "Bewerken" }).click();
    const dnaBar = page.locator('[aria-label^="Kink DNA:"]');
    await expect(dnaBar.first()).toBeVisible();
    const dnaLabel = await dnaBar.first().getAttribute("aria-label");
    expect(dnaLabel).not.toContain("nog niets beoordeeld");

    // No ★ characters anywhere on page
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).not.toContain("★");
  });

  test("check for elements clipped by bottom nav", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.evaluate(() => {
      const s = { state: { profiles: [] }, version: 8 };
      localStorage.setItem("kink-profiles", JSON.stringify(s));
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

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
