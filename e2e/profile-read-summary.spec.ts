import { expect, test } from "@playwright/test";
import { KINKS } from "../lib/kinks";
import type { Profile } from "../types";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

test("mature profile read view is status-first, private-safe and readable in both themes", async ({ page }, testInfo) => {
  const impact = KINKS.filter((kink) => kink.category === "impact");
  const bondage = KINKS.filter((kink) => kink.category === "bondage");
  const profile: Profile = {
    ...PROFILE_ALEX,
    entries: Object.fromEntries(KINKS.map((kink) => [kink.id, { status: "willing", comment: "" }])),
  };

  impact.slice(0, 4).forEach((kink) => {
    profile.entries[kink.id] = { status: "yes", comment: "" };
  });
  impact.slice(4, 7).forEach((kink, index) => {
    profile.entries[kink.id] = { status: "hard_no", comment: index === 0 ? "Deze grens staat vast." : "" };
  });
  profile.entries[bondage[0].id] = {
    status: "yes",
    comment: "Privé context",
    tags: ["privégeheim"],
    curious: true,
    privateResponse: true,
  };

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAndGo(page, `/profile/${profile.id}`, [profile]);

  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

    const hardLimits = page.getByTestId("profile-read-hard-limits");
    await expect(hardLimits).toBeVisible();
    for (const kink of impact.slice(4, 7)) {
      await expect(hardLimits.getByText(kink.name, { exact: true })).toBeVisible();
    }
    await expect(hardLimits.getByText("Deze grens staat vast.", { exact: true })).toBeVisible();

    const yes = page.getByTestId("profile-read-status-yes");
    const yesSummary = page.getByTestId("profile-read-status-yes-summary");
    await expect(yes).toHaveAccessibleName(/Heel graag, .* antwoorden. Details tonen/);
    await expect(yesSummary.getByText(impact[0].name, { exact: true })).toBeVisible();
    await expect(yesSummary).not.toContainText(bondage[0].name);
    await expect(yesSummary).not.toContainText("Privé context");
    await expect(yesSummary).not.toContainText("privégeheim");

    const privateSection = page.getByTestId("profile-read-private");
    await expect(privateSection).toContainText("1");
    await expect(page.locator("#profile-read-private-content")).toBeHidden();

    await yes.focus();
    await page.keyboard.press("Enter");
    await expect(yes).toHaveAttribute("aria-expanded", "true");
    await expect(yesSummary).toHaveCount(0);
    const yesContent = page.locator("#profile-read-status-yes-content");
    await expect(yesContent).toBeVisible();
    await expect(yesContent.getByText("Impact Play", { exact: true })).toBeVisible();
    await expect.poll(() => yesContent.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await page.keyboard.press("Enter");

    await page.evaluate(async () => { await document.fonts.ready; });
    await page.screenshot({
      path: `screenshots/theme-rehearsal/${testInfo.project.name}/profile-status-first-${theme}.png`,
      fullPage: true,
    });
  }
});
