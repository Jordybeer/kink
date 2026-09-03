import { test, expect } from "@playwright/test";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

async function openFirstSpankingEditor(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /Onderwerpen beheren/ }).click();
  const search = page.getByPlaceholder("Zoek in de volledige catalogus…");
  await search.fill("spanking");
  const result = page.locator('button[aria-label*=", bewerken"]').first();
  await expect(result).toBeVisible();
  await result.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function renderedContrastRatio(locator: import("@playwright/test").Locator) {
  return locator.evaluate((element) => {
    function rgb(value: string): [number, number, number] {
      const modern = value.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/[^)]*)?\)$/);
      if (modern) return [Number(modern[1]) * 255, Number(modern[2]) * 255, Number(modern[3]) * 255];

      const legacy = value.match(/^rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)/);
      if (legacy) return [Number(legacy[1]), Number(legacy[2]), Number(legacy[3])];

      throw new Error(`Unsupported computed colour: ${value}`);
    }

    function luminance([r, g, b]: [number, number, number]) {
      const channel = (value: number) => {
        const normalized = value / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    }

    const foreground = luminance(rgb(getComputedStyle(element).color));
    const button = element.closest("button");
    if (!button) throw new Error("Status hint is not inside a button");
    const background = luminance(rgb(getComputedStyle(button).backgroundColor));
    const lighter = Math.max(foreground, background);
    const darker = Math.min(foreground, background);
    return (lighter + 0.05) / (darker + 0.05);
  });
}

test.describe("Edit Kinks cohesion", () => {
  test.beforeEach(async ({ page }) => {
    const emptyAlex = { ...PROFILE_ALEX, entries: {} };
    await seedAndGo(page, "/profile/pw-alex-001", [emptyAlex]);
  });

  test("scheidt antwoord, voorwaarden, ervaring en zichtbaarheid", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const dialog = await openFirstSpankingEditor(page);

    await expect(dialog.getByText("Jouw antwoord", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Voorwaarden", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Ervaring & interesse", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Zichtbaarheid", { exact: true })).toBeVisible();

    const conditions = dialog.locator("section").filter({ hasText: "Voorwaarden" });
    await expect(conditions.getByRole("button", { name: /Eerst vragen/ })).toBeVisible();
    await expect(conditions.getByRole("button", { name: /Alleen privé/ })).toBeVisible();
    await expect(conditions.getByRole("button", { name: /Alleen afgesproken/ })).toBeVisible();

    const experience = dialog.locator("section").filter({ hasText: "Ervaring & interesse" });
    await expect(experience.getByRole("button", { name: /Weinig ervaring/ })).toBeVisible();
    await expect(experience.getByRole("button", { name: /Nieuwsgierig/ })).toBeVisible();
  });

  test("een gekozen status wist zichzelf niet meer en mobiel sluiten blijft bereikbaar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const dialog = await openFirstSpankingEditor(page);
    const statusGroup = dialog.getByRole("group", { name: "Status kiezen" });
    const yes = statusGroup.getByRole("button", { name: /Heel graag/ });

    await yes.click();
    await expect(yes).toHaveAttribute("aria-pressed", "true");
    await yes.click();
    await expect(yes).toHaveAttribute("aria-pressed", "true");

    const clear = dialog.getByRole("button", { name: "Wis antwoord" });
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(yes).toHaveAttribute("aria-pressed", "false");
    await expect(clear).toHaveCount(0);

    const close = dialog.getByRole("button", { name: /sluiten$/ }).first();
    await expect(close).toBeVisible();
    const scrollBody = dialog.getByTestId("sheet-scroll-body");
    await scrollBody.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await expect.poll(() => scrollBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(close).toBeVisible();

    await close.click();
    await expect(dialog).toBeHidden();
  });

  test("320px houdt de editor binnen de horizontale viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const dialog = await openFirstSpankingEditor(page);
    const scrollBody = dialog.getByTestId("sheet-scroll-body");

    await expect.poll(() => scrollBody.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);

    const hints = dialog.locator("[data-status-hint]");
    for (let index = 0; index < await hints.count(); index += 1) {
      const hint = hints.nth(index);
      await expect(hint).toBeVisible();
      await expect.poll(() => hint.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const parent = element.closest("button")?.getBoundingClientRect();
        return parent ? rect.right <= parent.right + 0.5 && rect.left >= parent.left - 0.5 : false;
      })).toBe(true);
    }
  });

  test("geselecteerde status-hints houden AA contrast in light en dark", async ({ page }) => {
    const dialog = await openFirstSpankingEditor(page);
    const statusGroup = dialog.getByRole("group", { name: "Status kiezen" });
    const yes = statusGroup.getByRole("button", { name: /Heel graag/ });
    const hint = statusGroup.locator('[data-status-hint="yes"]');

    await yes.click();
    await expect(yes).toHaveAttribute("aria-pressed", "true");

    for (const theme of ["light", "dark"] as const) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      await expect.poll(() => renderedContrastRatio(hint)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
