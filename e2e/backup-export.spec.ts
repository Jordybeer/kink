import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { decryptBackup, encryptBackup, type EncryptedBackup } from "../lib/crypto";
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

test("encrypted backup import keeps readable copy inside the visual viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 568 });
  await seedProfiles(page, [PROFILE_ALEX]);
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--visual-viewport-height", "360px");
    document.documentElement.style.setProperty("--visual-viewport-offset-top", "72px");
  });

  const encrypted = await encryptBackup(JSON.stringify({ source: "backup", profiles: [] }), BACKUP_PASSWORD);
  await page.evaluate(() => window.dispatchEvent(new Event("ks:open-settings")));
  const settings = page.getByRole("dialog", { name: "Instellingen" });
  await settings.locator('input[type="file"]').setInputFiles({
    name: "kinksync-backup.enc.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(encrypted)),
  });

  const dialog = page.getByRole("dialog", { name: "Versleutelde backup ontgrendelen" });
  await expect(dialog).toBeVisible();
  const copy = dialog.getByText("Voer het wachtwoord in waarmee je deze backup hebt beveiligd.");
  await expect(copy).toHaveCSS("font-size", "14px");

  const visualViewport = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      height: Number.parseFloat(styles.getPropertyValue("--visual-viewport-height")),
      offsetTop: Number.parseFloat(styles.getPropertyValue("--visual-viewport-offset-top")),
    };
  });
  const viewportBottom = visualViewport.offsetTop + visualViewport.height;

  // The sheet enters with a short Framer Motion transition. Keep the viewport
  // contract strict, but observe it after the real rendered geometry settles.
  await expect.poll(async () => {
    const bounds = await dialog.boundingBox();
    return bounds ? bounds.y + bounds.height : Number.POSITIVE_INFINITY;
  }).toBeLessThanOrEqual(viewportBottom + 2);

  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
  expect(bounds!.y).toBeGreaterThanOrEqual(visualViewport.offsetTop - 1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewportBottom + 2);
});