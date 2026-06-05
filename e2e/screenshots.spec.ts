import { test } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

const PROFILES = [PROFILE_ALEX, PROFILE_SAM];

test("home populated", async ({ page }) => {
  await seedAndGo(page, "/", PROFILES);
  await page.screenshot({ path: "/tmp/ss-home.png", fullPage: true });
});

test("profile alex", async ({ page }) => {
  await seedAndGo(page, "/profile/pw-alex-001", PROFILES);
  await page.screenshot({ path: "/tmp/ss-profile-alex.png", fullPage: true });
});

test("profile sam", async ({ page }) => {
  await seedAndGo(page, "/profile/pw-sam-002", PROFILES);
  await page.screenshot({ path: "/tmp/ss-profile-sam.png", fullPage: true });
});

test("compare populated", async ({ page }) => {
  await seedAndGo(page, "/compare?a=pw-alex-001&b=pw-sam-002", PROFILES);
  await page.screenshot({ path: "/tmp/ss-compare.png", fullPage: true });
});

test("contract populated", async ({ page }) => {
  await seedAndGo(page, "/contract?a=pw-alex-001&b=pw-sam-002", PROFILES);
  await page.screenshot({ path: "/tmp/ss-contract.png", fullPage: true });
});

test("scene populated", async ({ page }) => {
  await seedAndGo(page, "/scene?a=pw-alex-001&b=pw-sam-002", PROFILES);
  await page.screenshot({ path: "/tmp/ss-scene.png", fullPage: true });
});

test("scenes populated", async ({ page }) => {
  await seedAndGo(page, "/scenes", PROFILES);
  await page.screenshot({ path: "/tmp/ss-scenes.png", fullPage: true });
});

test("timeline populated", async ({ page }) => {
  await seedAndGo(page, "/timeline?a=pw-alex-001&b=pw-sam-002", PROFILES);
  await page.screenshot({ path: "/tmp/ss-timeline.png", fullPage: true });
});

test("home reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAndGo(page, "/", PROFILES);
  await page.screenshot({ path: "/tmp/ss-home-reduced.png", fullPage: true });
});

test("profile alex scrolled", async ({ page }) => {
  await seedAndGo(page, "/profile/pw-alex-001", PROFILES);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(150);
  await page.screenshot({ path: "/tmp/ss-profile-scrolled.png" });
});

test("compare scrolled", async ({ page }) => {
  await seedAndGo(page, "/compare?a=pw-alex-001&b=pw-sam-002", PROFILES);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(150);
  await page.screenshot({ path: "/tmp/ss-compare-scrolled.png" });
});

test("contract print preview", async ({ page }) => {
  await seedAndGo(page, "/contract?a=pw-alex-001&b=pw-sam-002", PROFILES);
  await page.emulateMedia({ media: "print" });
  await page.screenshot({ path: "/tmp/ss-contract-print.png", fullPage: true });
});
