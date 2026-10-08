import { expect, test } from "@playwright/test";
import { KINKS } from "../lib/kinks";
import type { Profile } from "../types";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

test("mature profile read view is status-first, private-safe and readable in both themes", async ({ page }, testInfo) => {
  const impact = KINKS.filter((kink) => kink.category === "impact");
  const bondage = KINKS.filter((kink) => kink.category === "bondage");
  const profile: Profile = {
    ...PROFILE_ALEX,
    name: "Alexandra" + "langealias".repeat(18),
    entries: Object.fromEntries(KINKS.map((kink) => [kink.id, { status: "willing", comment: "" }])),
  };

  impact.slice(0, 4).forEach((kink) => {
    profile.entries[kink.id] = { status: "yes", comment: "" };
  });
  const longBoundaryNote = `Geenuitzonderingen${"x".repeat(180)}🙂`;
  impact.slice(4, 7).forEach((kink, index) => {
    profile.entries[kink.id] = { status: "hard_no", comment: index === 0 ? longBoundaryNote : "" };
  });
  profile.entries[bondage[0].id] = {
    status: "yes",
    comment: "Privé context",
    tags: ["privégeheim"],
    curious: true,
    privateResponse: true,
  };

  profile.entries[KINKS[KINKS.length - 1].id] = { status: "maybe", comment: "" };
  profile.entries[KINKS[KINKS.length - 2].id] = { status: "no", comment: "" };

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
    await expect(hardLimits.getByText(longBoundaryNote, { exact: true })).toBeVisible();

    const yes = page.getByTestId("profile-read-status-yes");
    const yesSummary = page.getByTestId("profile-read-status-yes-summary");
    await expect(yes).toHaveAccessibleName(/Heel graag, .* antwoorden/);
    await expect(yesSummary.getByText(impact[0].name, { exact: true })).toBeVisible();
    await expect(yesSummary).not.toContainText(bondage[0].name);
    await expect(yesSummary).not.toContainText("Privé context");
    await expect(yesSummary).not.toContainText("privégeheim");

    const privateSection = page.getByTestId("profile-read-private");
    await expect(privateSection).toContainText("1");
    await expect(page.locator("#profile-read-private-content")).toBeHidden();

    await yes.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/interests=yes/);
    await expect(page.getByTestId("profile-summary")).toHaveCount(0);
    const browser = page.getByRole("region", { name: "Interesses & grenzen" });
    const yesContent = page.locator("#profile-read-status-yes-content");
    await expect(page.getByLabel("Hoofdnavigatie").getByRole("link", { name: "Terug", exact: true })).toHaveAttribute("href", `/profile?id=${profile.id}#profile-interests-title`);
    await expect(yesContent).toBeVisible();
    await expect(yesContent.getByText("Impact Play", { exact: true })).toBeVisible();
    await expect(browser).not.toContainText("Privé context");
    await expect(browser).not.toContainText("privégeheim");
    await expect.poll(() => yesContent.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);

    await browser.getByRole("link", { name: /^Ja,/ }).click();
    await expect(page).toHaveURL(/interests=willing/);
    await expect(yesContent).toHaveCount(0);
    const willingContent = page.locator("#profile-read-status-willing-content");
    await expect(willingContent).toBeVisible();
    await expect(willingContent).not.toContainText(bondage[0].name);
    await page.reload();
    await expect(willingContent).toBeVisible();
    await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/profile-interest-browser-${theme}.png`, fullPage: false });

    await page.goBack();
    await expect(page.getByTestId("profile-summary")).toBeVisible();
    await page.goForward();
    await expect(willingContent).toBeVisible();
    await browser.getByRole("link", { name: "Terug naar profiel" }).click();
    await expect(page.getByTestId("profile-summary")).toBeVisible();
    await expect(yesSummary).toBeVisible();
    await expect(page.getByTestId("profile-read-hard-limits")).toBeVisible();

    if (testInfo.project.name === "mobile" && theme === "dark") {
      await page.setViewportSize({ width: 320, height: 844 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

      await page.locator("html").evaluate((element) => {
        element.style.fontSize = "200%";
      });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      await expect(hardLimits.getByText(longBoundaryNote, { exact: true })).toBeVisible();
      await page.getByTestId("profile-read-status-yes").click();
      await expect(page.getByRole("region", { name: "Interesses & grenzen" })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      await expect.poll(() => page.locator("#profile-read-status-yes-content").evaluate((node) => {
        const header = node.parentElement!.previousElementSibling!.getBoundingClientRect();
        const navHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 112;
        return header.height + navHeight < window.innerHeight - 160;
      })).toBe(true);
      await page.getByRole("link", { name: "Terug naar profiel" }).click();
      await page.locator("html").evaluate((element) => {
        element.style.fontSize = "";
      });
      await page.setViewportSize({ width: 390, height: 844 });
    }

    await page.evaluate(async () => { await document.fonts.ready; });
    await page.screenshot({
      path: `screenshots/theme-rehearsal/${testInfo.project.name}/profile-status-first-${theme}.png`,
      fullPage: true,
    });
  }
});
