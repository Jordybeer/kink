import { expect, test } from "@playwright/test";
import { KINKS } from "../lib/kinks";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

test("topic editor uses one focused reading flow with a persistent completion action", async ({ page }, testInfo) => {
  const candidate = KINKS.find((kink) => kink.description && kink.safetyNote)
    ?? KINKS.find((kink) => kink.description);
  expect(candidate).toBeTruthy();

  const profile = {
    ...PROFILE_ALEX,
    entries: {
      [candidate!.id]: {
        status: "yes" as const,
        comment: "",
        tags: ["vraag eerst", "scène specifiek"],
        curious: true,
        privateResponse: true,
      },
    },
  };

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAndGo(page, "/profile/pw-alex-001", [profile]);

  await page.getByRole("button", { name: /Onderwerpen beheren/ }).click();
  await page.getByPlaceholder("Zoek in de volledige catalogus…").fill(candidate!.name);

  const result = page.locator('button[aria-label$=", bewerken"]').filter({ hasText: candidate!.name }).first();
  await expect(result).toBeVisible();
  await result.click();

  const dialog = page.getByRole("dialog", { name: `${candidate!.name} bewerken` });
  await expect(dialog).toHaveAttribute("data-sheet-variant", "task");
  await expect(dialog.getByRole("heading", { name: "Onderwerp bewerken" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: candidate!.name })).toBeVisible();
  await expect(dialog.getByText(candidate!.description!, { exact: true })).toBeVisible();
  if (candidate!.safetyNote) await expect(dialog.getByText(candidate!.safetyNote, { exact: true })).toBeVisible();

  const statusGroup = dialog.getByRole("group", { name: "Status kiezen" });
  await expect(statusGroup.getByRole("button")).toHaveCount(5);
  await expect(statusGroup.getByRole("button", { name: /Heel graag/ })).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByRole("heading", { name: "Afspraken" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Zichtbaarheid" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Context" })).toBeVisible();

  const body = dialog.getByTestId("sheet-scroll-body");
  const footer = dialog.getByTestId("sheet-footer");
  const done = footer.getByRole("button", { name: "Klaar" });
  await expect(done).toBeVisible();

  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await body.evaluate((node) => { node.scrollTop = 0; });
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.screenshot({
      path: `screenshots/theme-rehearsal/${testInfo.project.name}/topic-editor-${theme}-top.png`,
      fullPage: false,
    });

    await body.evaluate((node) => { node.scrollTop = node.scrollHeight; });
    await expect(dialog.getByRole("button", { name: "Eerst vragen" })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByRole("button", { name: "Antwoord niet langer privé maken" })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByRole("button", { name: "Nieuwsgierig" })).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({
      path: `screenshots/theme-rehearsal/${testInfo.project.name}/topic-editor-${theme}-details.png`,
      fullPage: false,
    });
  }

  await expect.poll(() => body.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);

  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expect.poll(() => body.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await expect(done).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.removeProperty("font-size"); });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  const maybe = statusGroup.getByRole("button", { name: /^Misschien\b/ });
  const willing = statusGroup.getByRole("button", { name: /^Ja\b/ });
  await maybe.click();
  await willing.click();
  await expect(willing).toHaveAttribute("aria-pressed", "true");
  await expect(maybe).toHaveAttribute("aria-pressed", "false");
  await done.click();
  await expect(dialog).toBeHidden();
  await expect(result).toBeFocused();
});
