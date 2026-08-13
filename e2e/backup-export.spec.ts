import { test, expect } from "@playwright/test";
import { PROFILE_ALEX, seedProfiles } from "./fixtures";

test("encrypted backup export stays inside an explicit save gesture", async ({ page }) => {
  await seedProfiles(page, [PROFILE_ALEX]);

  await page.evaluate(() => window.dispatchEvent(new Event("ks:open-settings")));
  await expect(page.getByRole("dialog", { name: "Instellingen" })).toBeVisible();

  await page.getByRole("button", { name: /back-up maken/i }).click();
  await expect(page.getByRole("heading", { name: "Backup versleutelen" })).toBeVisible();
  await page.getByRole("button", { name: "Doorgaan" }).click();

  const passwordInputs = page.locator('input[type="password"]');
  await passwordInputs.nth(0).fill("test-pass-123");
  await passwordInputs.nth(1).fill("test-pass-123");
  await page.getByRole("button", { name: "Versleutelen" }).click();

  await expect(page.getByRole("heading", { name: "Back-up klaar" })).toBeVisible({ timeout: 15_000 });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /back-up bewaren/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^kinksync-backup-\d{4}-\d{2}-\d{2}\.enc\.json$/);
});
