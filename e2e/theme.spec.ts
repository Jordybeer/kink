import { expect, test, type Page } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedProfiles } from "./fixtures";

const THEME_STORAGE_KEY = "kinksync-color-theme";

async function expectTheme(page: Page, theme: "light" | "dark") {
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme))
    .toBe(theme);
}

async function readContrastPairs(page: Page) {
  return page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const read = (name: string) => styles.getPropertyValue(name).trim();
    const rgb = (value: string) => {
      const raw = value.replace("#", "");
      const hex = /^[0-9a-f]{3}$/i.test(raw)
        ? raw.split("").map((channel) => channel.repeat(2)).join("")
        : raw;
      if (!/^[0-9a-f]{6}$/i.test(hex)) throw new Error(`Expected a hex colour, got ${value}`);
      return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
    };
    const luminance = (value: string) => rgb(value)
      .map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const contrast = (foreground: string, background: string) => {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };

    return {
      primaryText: contrast(read("--text"), read("--bg")),
      secondaryText: contrast(read("--text2"), read("--surface")),
      accentText: contrast(read("--accent"), read("--surface3")),
      accentButton: contrast(read("--on-accent"), read("--accent")),
      filledButton: contrast(read("--on-accent-fill"), read("--accent-fill")),
      dangerButton: contrast(read("--on-danger-fill"), read("--danger-fill")),
    };
  });
}

test("system mode follows the device while explicit choices persist", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await seedProfiles(page, [PROFILE_ALEX], { pinnedProfileId: PROFILE_ALEX.id });
  await expectTheme(page, "light");

  await page.getByRole("button", { name: "Instellingen openen" }).click();
  const settings = page.getByRole("dialog", { name: "Instellingen" });
  const system = settings.getByRole("radio", { name: "Systeem" });
  const light = settings.getByRole("radio", { name: "Licht" });
  const dark = settings.getByRole("radio", { name: "Donker" });
  await expect(system).toBeChecked();

  await dark.check();
  await expectTheme(page, "dark");
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe("dark");

  await page.reload();
  await expectTheme(page, "dark");

  await page.getByRole("button", { name: "Instellingen openen" }).click();
  await light.check();
  await page.emulateMedia({ colorScheme: "dark" });
  await expectTheme(page, "light");

  await settings.getByRole("radio", { name: "Systeem" }).check();
  await expectTheme(page, "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expectTheme(page, "light");
  await expect(system).toBeChecked();
});

test("both palettes keep core text and controls at WCAG AA contrast", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "light" });
  await seedProfiles(page, [PROFILE_ALEX, PROFILE_SAM], { pinnedProfileId: PROFILE_ALEX.id });

  for (const theme of ["light", "dark"] as const) {
    await page.evaluate(({ key, theme: nextTheme }) => localStorage.setItem(key, nextTheme), {
      key: THEME_STORAGE_KEY,
      theme,
    });
    await page.goto("/");
    await expectTheme(page, theme);
    const pairs = await readContrastPairs(page);
    for (const [name, ratio] of Object.entries(pairs)) {
      expect(ratio, `${theme} ${name}`).toBeGreaterThanOrEqual(4.5);
    }

    await page.evaluate(async () => { await document.fonts.ready; });
    await page.screenshot({
      path: `screenshots/theme-rehearsal/${testInfo.project.name}/theme-${theme}-home.png`,
      fullPage: true,
    });

    await page.goto(`/scene?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}`);
    await expectTheme(page, theme);
    const dateControl = page.locator('input[type="date"]').first();
    await expect(dateControl).toBeVisible();
    await expect.poll(() => dateControl.evaluate((element) => getComputedStyle(element).colorScheme))
      .toBe(theme);
    await page.screenshot({
      path: `screenshots/theme-rehearsal/${testInfo.project.name}/theme-${theme}-scene.png`,
      fullPage: false,
    });
  }
});
