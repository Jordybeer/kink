import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { decryptBackup, type EncryptedBackup } from "../lib/crypto";
import { PROFILE_ALEX, seedProfiles } from "./fixtures";

const BACKUP_PASSWORD = "test-pass-123";

test("encrypted backup export stays inside an explicit save gesture and excludes PDF binaries", async ({ page }) => {
  await seedProfiles(page, [PROFILE_ALEX]);

  await page.evaluate(() => window.dispatchEvent(new Event("ks:open-settings")));
  await expect(page.getByRole("dialog", { name: "Instellingen" })).toBeVisible();

  await page.getByRole("button", { name: /back-up maken/i }).click();
  await expect(page.getByRole("heading", { name: "Backup versleutelen" })).toBeVisible();
  await expect(page.getByText(/PDF-bestanden zelf worden niet als vertrouwde backupdata meegenomen/i)).toBeVisible();
  await page.getByRole("button", { name: "Doorgaan" }).click();

  // Deze twee velden leunden op hun placeholder. Die is geen toegankelijke naam
  // en verdwijnt zodra je typt, dus wie ze met VoiceOver opende hoorde twee
  // naamloze gemaskeerde velden. Het gaat om een wachtwoord dat KinkSync niet
  // kan herstellen. getByLabel vindt ze alleen als die naam er echt staat.
  await page.getByLabel("Back-upwachtwoord, minimaal 8 tekens").fill(BACKUP_PASSWORD);
  await page.getByLabel("Herhaal het back-upwachtwoord").fill(BACKUP_PASSWORD);
  await page.getByRole("button", { name: "Versleutelen" }).click();

  await expect(page.getByRole("heading", { name: "Back-up klaar" })).toBeVisible({ timeout: 15_000 });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /back-up bewaren/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^kinksync-backup-\d{4}-\d{2}-\d{2}\.enc\.json$/);

  const path = await download.path();
  expect(path).not.toBeNull();
  const encrypted = JSON.parse(await readFile(path!, "utf8")) as EncryptedBackup;
  const payload = JSON.parse(await decryptBackup(encrypted, BACKUP_PASSWORD)) as Record<string, unknown>;

  expect(payload.source).toBe("backup");
  expect(payload.contractSeries).toBeDefined();
  expect(payload).not.toHaveProperty("contractArtifacts");
});
