import { expect, test } from "@playwright/test";
import { KINKS } from "../lib/kinks";
import type { Profile } from "../types";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

const topic = KINKS.find((kink) => kink.description && kink.safetyNote)!;
const yesContent = "#profile-read-status-yes-content";

test("status filters preserve the hero, boundaries, empty selections, deep links and browser history", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}?interests=willing`, [PROFILE_ALEX]);
  const hero = page.getByTestId("profile-summary");
  await expect(hero).toBeVisible();
  await expect(page.locator("#profile-read-status-willing-content")).toContainText("Lichte sessies");
  await expect(page.getByTestId("profile-read-hard-limits")).toContainText("Breath restriction / neck pressure");
  const filters = page.getByRole("group", { name: "Antwoordstatus" });
  await expect(filters.getByRole("button")).toHaveCount(5);
  await page.getByTestId("profile-read-status-yes").click();
  await expect(page).toHaveURL(/interests=yes/);
  await expect(hero).toBeVisible();
  await expect(page.locator(yesContent)).toContainText("Klassiek en heerlijk");
  await page.getByTestId("profile-read-status-maybe").click();
  await expect(page.locator("#profile-read-status-maybe-content")).toContainText("Nog geen openbare antwoorden met deze status.");
  await expect(page.getByTestId("profile-read-status-maybe")).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator("#profile-read-status-maybe-content")).toBeVisible();
  await expect(hero).toBeVisible();
  await page.goBack();
  await expect(page.locator(yesContent)).toBeVisible();
  await expect(hero).toBeVisible();
  await page.goForward();
  await expect(page.locator("#profile-read-status-maybe-content")).toBeVisible();
  await page.getByTestId("profile-read-status-hard_no").click();
  await expect(page.getByTestId("profile-read-hard-limits")).toBeVisible();
  await expect(page.getByTestId("profile-read-hard-limits").getByText("Breath restriction / neck pressure", { exact: true })).toHaveCount(1);
  await expect(page.locator(yesContent)).toHaveCount(0);
});

test("Profile overview and inline editor wrap at mobile, desktop and 320px with enlarged text in both themes", async ({ page }, testInfo) => {
  const longName = `Eigen onderwerp ${"langenaam".repeat(12)}`;
  const profile: Profile = {
    ...PROFILE_ALEX,
    name: "Alexandra" + "langealias".repeat(12),
    customKinks: [{ id: "custom_long", name: longName }],
    entries: {
      [topic.id]: { status: "yes", comment: "Context met afspraken." },
      choking: { status: "hard_no", comment: `Geenuitzonderingen${"x".repeat(120)}` },
      custom_long: { status: "yes", comment: "Zelf gekozen context." },
    },
  };
  await page.setViewportSize({ width: testInfo.project.name === "mobile" ? 390 : 1280, height: testInfo.project.name === "mobile" ? 844 : 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAndGo(page, `/profile?id=${profile.id}`, [profile]);
  const overview = page.getByRole("region", { name: "Profieloverzicht" });
  const assertFit = async () => {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await expect.poll(() => overview.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    for (const control of await overview.locator('button:visible').all()) {
      const box = (await control.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual((await page.viewportSize())!.width + 1);
    }
  };
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.evaluate(async () => { await document.fonts.ready; });
    await assertFit();
    await page.getByTestId("profile-read-status-yes").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/profile-inline-overview-${theme}.png`, fullPage: false });
    const row = page.locator(`[data-kink-id="${topic.id}"]`);
    await row.locator('button[aria-label$=", bewerken"]').click();
    await row.getByTestId("profile-inline-editor").scrollIntoViewIfNeeded();
    await assertFit();
    await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/profile-inline-editor-${theme}.png`, fullPage: false });
    await row.getByRole("button", { name: "Klaar", exact: true }).click();
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  const custom = page.locator('[data-kink-id="custom_long"]');
  await custom.locator('button[aria-label$=", bewerken"]').click();
  await custom.getByRole("button", { name: "Details", exact: true }).click();
  await custom.getByLabel("Persoonlijke context").fill("Context" + "x".repeat(150));
  await assertFit();
  await expect(custom.getByText(longName, { exact: true })).toBeVisible();
  await expect.poll(() => custom.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await custom.getByRole("button", { name: "Details", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/profile-inline-320-text-200.png`, fullPage: false });
});

test("shared and imported profiles disclose no private data and cannot edit answers", async ({ page }) => {
  for (const ownership of [{ origin: "shared" as const }, { origin: "own" as const, isImported: true }]) {
    const profile: Profile = { ...PROFILE_ALEX, ...ownership, entries: {
      [topic.id]: { status: "yes", comment: "Public context" },
      custom_pw001: { status: "hard_no", comment: "Secret comment", tags: ["secret tag"], privateResponse: true },
    } };
    await seedAndGo(page, `/profile?id=${profile.id}&interests=yes`, [profile]);
    await expect(page.getByTestId("profile-summary")).toBeVisible();
    await expect(page.locator(yesContent)).toContainText("Public context");
    await expect(page.getByTestId("profile-read-status-hard_no")).toHaveAccessibleName("Harde grens, 0 antwoorden");
    await expect(page.getByTestId("profile-read-private")).toHaveCount(0);
    await expect(page.getByText("Secret comment", { exact: true })).toHaveCount(0);
    await expect(page.getByText("secret tag", { exact: true })).toHaveCount(0);
    await expect(page.locator('button[aria-label$=", bewerken"]')).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Status kiezen" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Onderwerpen beheren/ })).toHaveCount(0);
  }
});
