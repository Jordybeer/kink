/**
 * Mobile screenshot tool — seeds a test profile and captures key views.
 * Usage: npm run dev   (in another terminal)
 *        node scripts/screenshots.mjs
 * Output: /tmp/kink-*.png
 */
import { chromium } from "./node_modules/playwright/index.mjs";

const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const BASE   = "http://localhost:3000";

// experienceLevel must be a key from LEVEL_MAX in lib/kinks.ts:
//   beginner=1  gevorderd=2  ervaren=3  diepgaand=4
const SEED = {
  state: {
    profiles: [{
      id:                 "demo-01",
      name:               "Alex",
      role:               "switch",
      experienceLevel:    "diepgaand",
      relationshipStatus: "single",
      createdAt:          Date.now() - 1000 * 60 * 60 * 24 * 30,
      entries: {
        spanking_hand:      { status: "yes",     tags: [], comment: "" },
        spanking_implement: { status: "willing", tags: [], comment: "" },
        flogging:           { status: "maybe",   tags: [], comment: "" },
        caning:             { status: "no",      tags: [], comment: "" },
        cropping:           { status: "hard_no", tags: [], comment: "" },
        rope_bondage:       { status: "yes",     tags: [], comment: "" },
        shibari:            { status: "willing", tags: [], comment: "" },
        handcuffs:          { status: "yes",     tags: [], comment: "" },
        leather_cuffs:      { status: "willing", tags: [], comment: "" },
        spreader_bar:       { status: "maybe",   tags: [], comment: "" },
        hogtie:             { status: "no",      tags: [], comment: "" },
        mummification:      { status: "hard_no", tags: [], comment: "" },
      },
      customKinks: [],
    }],
    onboardingComplete: true,
    appLockEnabled:     false,
    maxLevel:           4,
  },
  version: 5,
};

async function shot(browser, name, fn) {
  const ctx  = await browser.newContext({ viewport: MOBILE });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.evaluate((seed) => localStorage.setItem("kink-profiles", JSON.stringify(seed)), SEED);
  await page.reload();
  await page.waitForTimeout(800);
  await fn(page);
  const path = `/tmp/kink-${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`  ✓ ${path}`);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();

  // Hub (homepage)
  await shot(browser, "hub", async () => {});

  // Profile hero — spotlight + DNA bar + stats
  await shot(browser, "profile-hero", async (page) => {
    await page.goto(`${BASE}/profile/demo-01`);
    await page.waitForTimeout(600);
  });

  // Bewerken tab — kink rows with status tints
  await shot(browser, "profile-kinkrows", async (page) => {
    await page.goto(`${BASE}/profile/demo-01`);
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: "Bewerken", exact: true }).first().click();
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollBy(0, 320));
    await page.waitForTimeout(200);
  });

  // Offline — red dot only, no text overflow
  await shot(browser, "topnav-offline", async (page) => {
    await page.goto(`${BASE}/profile/demo-01`);
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
      window.dispatchEvent(new Event("offline"));
    });
    await page.waitForTimeout(300);
  });

  await browser.close();
  console.log("Done.");
})();
