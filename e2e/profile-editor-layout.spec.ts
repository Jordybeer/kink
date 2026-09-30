import { expect, test } from "@playwright/test";
import { KINKS } from "../lib/kinks";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

test("topic editor uses one focused reading flow with a persistent completion action", async ({ page }) => {
  const candidate = KINKS.find((kink) => kink.description && kink.safetyNote)
    ?? KINKS.find((kink) => kink.description);
  expect(candidate).toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/profile/pw-alex-001", [{ ...PROFILE_ALEX, entries: {} }]);

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
  await expect(dialog.getByRole("heading", { name: "Afspraken" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Zichtbaarheid" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Context" })).toBeVisible();

  const body = dialog.getByTestId("sheet-scroll-body");
  const footer = dialog.getByTestId("sheet-footer");
  const done = footer.getByRole("button", { name: "Klaar" });
  await expect(done).toBeVisible();
  await body.evaluate((node) => { node.scrollTop = node.scrollHeight; });
  await expect(done).toBeVisible();
  await expect.poll(() => body.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);

  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expect.poll(() => body.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await expect(done).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.removeProperty("font-size"); });

  await statusGroup.getByRole("button", { name: /Heel graag/ }).click();
  await done.click();
  await expect(dialog).toBeHidden();
  await expect(result).toBeFocused();
});
