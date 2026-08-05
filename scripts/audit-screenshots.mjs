/**
 * Global mobile UI audit — captures every page + key states.
 * Seeds two profiles, a scene, and toggles offline/onboarding so the full
 * coherence of the app is on one contact sheet.
 * Usage: npm run dev   (in another terminal)
 *        node scripts/audit-screenshots.mjs
 * Output: /tmp/kink-audit-*.png
 */
import { chromium } from "playwright";

const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const BASE = "http://localhost:3000";

const PROFILE_A = {
  id: "alex-01",
  name: "Alex",
  role: "switch",
  experienceLevel: "diepgaand",
  relationshipStatus: "single",
  fetLifeUsername: "alex_kinkster",
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
  entries: {
    spanking_hand:      { status: "yes",     tags: ["eerste keer"], comment: "" },
    spanking_implement: { status: "willing", tags: [],              comment: "" },
    flogging:           { status: "maybe",   tags: [],              comment: "" },
    caning:             { status: "no",      tags: [],              comment: "" },
    cropping:           { status: "hard_no", tags: [],              comment: "" },
    rope_bondage:       { status: "yes",     tags: ["alleen privé"], comment: "Voorzichtig met polsen" },
    shibari:            { status: "willing", tags: [],              comment: "" },
    handcuffs:          { status: "yes",     tags: [],              comment: "" },
    leather_cuffs:      { status: "willing", tags: [],              comment: "" },
    spreader_bar:       { status: "maybe",   tags: [],              comment: "" },
    hogtie:             { status: "no",      tags: [],              comment: "" },
    mummification:      { status: "hard_no", tags: [],              comment: "" },
    blindfold:          { status: "yes",     tags: [],              comment: "" },
    gag:                { status: "willing", tags: [],              comment: "" },
  },
  customKinks: [],
};

const PROFILE_B = {
  id: "sam-02",
  name: "Sam",
  role: "dominant",
  experienceLevel: "ervaren",
  relationshipStatus: "partner",
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
  entries: {
    spanking_hand:      { status: "yes",     tags: [], comment: "" },
    spanking_implement: { status: "yes",     tags: [], comment: "" },
    flogging:           { status: "yes",     tags: [], comment: "" },
    caning:             { status: "willing", tags: [], comment: "" },
    rope_bondage:       { status: "yes",     tags: [], comment: "" },
    shibari:            { status: "yes",     tags: [], comment: "" },
    handcuffs:          { status: "yes",     tags: [], comment: "" },
    blindfold:          { status: "yes",     tags: [], comment: "" },
    gag:                { status: "willing", tags: [], comment: "" },
    mummification:      { status: "hard_no",tags: [], comment: "" },
  },
  customKinks: [],
};

const SCENE = {
  id: "scene-01",
  title: "Avondsessie",
  profileAId: "alex-01",
  profileAName: "Alex",
  profileBId: "sam-02",
  profileBName: "Sam",
  items: [
    { id: "si-1", name: "Spanking (hand)", intensity: "zacht",  duration: "10m", note: "Start zacht",  fromKink: true, kinkId: "spanking_hand" },
    { id: "si-2", name: "Touw bondage",    intensity: "midden", duration: "20m", note: "",             fromKink: true, kinkId: "rope_bondage" },
    { id: "si-3", name: "Blinddoek",       intensity: "zacht",  duration: "—",   note: "Na de touwen", fromKink: true, kinkId: "blindfold" },
  ],
  plannedDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().slice(0, 10),
  safeword: "rood",
  status: "planned",
  createdAt: Date.now() - 1000 * 60 * 60 * 6,
  updatedAt: Date.now() - 1000 * 60 * 60 * 2,
};

const SEED = {
  state: {
    profiles: [PROFILE_A, PROFILE_B],
    scenes: [SCENE],
    onboardingComplete: true,
    profileTourComplete: true,
    appLockEnabled: false,
    maxLevel: 4,
    theme: "default",
  },
  version: 13,
};

async function shot(browser, name, fn, { fullPage = false } = {}) {
  const ctx = await browser.newContext({ viewport: MOBILE });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.warn(`  ⚠ ${name} pageerror: ${e.message}`));
  await page.goto(BASE);
  await page.evaluate((seed) => localStorage.setItem("kink-profiles", JSON.stringify(seed)), SEED);
  await page.reload();
  await page.waitForTimeout(900);
  try {
    await fn(page);
  } catch (err) {
    console.warn(`  ⚠ ${name} step error: ${err.message}`);
  }
  const path = `/tmp/kink-audit-${name}.png`;
  await page.screenshot({ path, fullPage });
  console.log(`  ✓ ${path}`);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();

  // 1. Hub / homepage
  await shot(browser, "01-hub", async () => {});

  // 2. Hub full-page (scrolled view)
  await shot(browser, "02-hub-full", async () => {}, { fullPage: true });

  // 3. Profile hero — own profile
  await shot(browser, "03-profile-hero", async (page) => {
    await page.goto(`${BASE}/profile/alex-01`);
    await page.waitForTimeout(700);
  });

  // 4. Profile full scroll
  await shot(browser, "04-profile-full", async (page) => {
    await page.goto(`${BASE}/profile/alex-01`);
    await page.waitForTimeout(700);
  }, { fullPage: true });

  // 5. Profile Bewerken tab (kink rows)
  await shot(browser, "05-profile-bewerken", async (page) => {
    await page.goto(`${BASE}/profile/alex-01`);
    await page.waitForTimeout(700);
    await page.getByRole("button", { name: "Bewerken", exact: true }).first().click();
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(200);
  });

  // 6. Compare
  await shot(browser, "06-compare", async (page) => {
    await page.goto(`${BASE}/compare?a=alex-01&b=sam-02`);
    await page.waitForTimeout(800);
  });

  // 7. Compare full
  await shot(browser, "07-compare-full", async (page) => {
    await page.goto(`${BASE}/compare?a=alex-01&b=sam-02`);
    await page.waitForTimeout(800);
  }, { fullPage: true });

  // 8. Scenes list
  await shot(browser, "08-scenes", async (page) => {
    await page.goto(`${BASE}/scenes`);
    await page.waitForTimeout(600);
  });

  // 9. Scene detail
  await shot(browser, "09-scene-detail", async (page) => {
    await page.goto(`${BASE}/scenes/scene-01`);
    await page.waitForTimeout(700);
  }, { fullPage: true });

  // 10. Scene planner (live build)
  await shot(browser, "10-scene-planner", async (page) => {
    await page.goto(`${BASE}/scene`);
    await page.waitForTimeout(700);
  });

  // 11. How KinkSync works
  await shot(browser, "11-about", async (page) => {
    await page.goto(`${BASE}/about`);
    await page.waitForTimeout(600);
  }, { fullPage: true });

  // 12. Timeline
  await shot(browser, "12-timeline", async (page) => {
    await page.goto(`${BASE}/timeline`);
    await page.waitForTimeout(600);
  });

  // 13. Contract
  await shot(browser, "13-contract", async (page) => {
    await page.goto(`${BASE}/contract`);
    await page.waitForTimeout(700);
  }, { fullPage: true });

  // 14. Offline page
  await shot(browser, "14-offline", async (page) => {
    await page.goto(`${BASE}/offline`);
    await page.waitForTimeout(400);
  });

  // 15. Onboarding (fresh state)
  await shot(browser, "15-onboarding", async (page) => {
    await page.evaluate(() => localStorage.removeItem("kink-profiles"));
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(900);
  });

  // 16. TopNav offline state on profile
  await shot(browser, "16-topnav-offline", async (page) => {
    await page.goto(`${BASE}/profile/alex-01`);
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
