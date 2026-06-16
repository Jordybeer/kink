// Ad-hoc visual verification for the /compare score masthead.
// Captures top-of-page + scrolled views across midnight and ledger themes,
// in both mobile and desktop projects. Outputs to /tmp/masthead/.

import { test } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

const PROFILES = [PROFILE_ALEX, PROFILE_SAM];
const PAIR = "/compare?a=pw-alex-001&b=pw-sam-002";

function shotName(slug: string, project: string) {
  return `/tmp/masthead/${project}-${slug}.png`;
}

test.describe("score masthead", () => {
  test("midnight — viewport", async ({ page }, info) => {
    await seedAndGo(page, PAIR, PROFILES, { theme: "midnight" });
    await page.waitForTimeout(800); // let masthead transition settle
    await page.screenshot({ path: shotName("midnight-viewport", info.project.name) });
  });

  test("midnight — full page", async ({ page }, info) => {
    await seedAndGo(page, PAIR, PROFILES, { theme: "midnight" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: shotName("midnight-full", info.project.name), fullPage: true });
  });

  test("ledger — viewport", async ({ page }, info) => {
    await seedAndGo(page, PAIR, PROFILES, { theme: "ledger" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: shotName("ledger-viewport", info.project.name) });
  });

  test("ledger — full page", async ({ page }, info) => {
    await seedAndGo(page, PAIR, PROFILES, { theme: "ledger" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: shotName("ledger-full", info.project.name), fullPage: true });
  });

  test("ledger — empty pair", async ({ page }, info) => {
    // Pair selected but neither rated overlapping kinks — checks the "—" em-dash state
    const empty = { ...PROFILE_ALEX, entries: {} };
    await seedAndGo(page, PAIR, [empty, { ...PROFILE_SAM, entries: {} }], { theme: "ledger" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: shotName("ledger-empty", info.project.name) });
  });
});
