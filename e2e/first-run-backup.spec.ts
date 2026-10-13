import { test, expect, type Page } from "@playwright/test";
import { encryptBackup } from "../lib/crypto";
import { PROFILE_ALEX } from "./fixtures";

const payload = { source: "backup", profiles: [PROFILE_ALEX] };
const state = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("kink-profiles") ?? '{"state":{}}').state);
async function openRestore(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Back-up herstellen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "18+?" })).toBeVisible();
  await expect(page.getByLabel("Kies een backupbestand")).toHaveCount(0);
  await page.getByRole("button", { name: "Ik ben 18+", exact: true }).click();
  await expect(page.getByText(/een match is nooit automatisch consent/i)).toBeVisible();
  await expect(page.getByLabel("Kies een backupbestand")).toHaveCount(0);
  await page.getByRole("button", { name: "Verder naar mijn back-up" }).click();
  await expect(page.getByRole("heading", { name: "Je eigen plek terug" })).toBeFocused();
}
for (const encrypted of [false, true]) {
  test(`first-run ${encrypted ? "encrypted" : "JSON"} recovery preserves gates and needs explicit completion`, async ({ page }) => {
    await openRestore(page);
    const file = encrypted ? await encryptBackup(JSON.stringify(payload), "test-pass-123") : payload;
    await page.getByLabel("Kies een backupbestand").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) });
    if (encrypted) {
      const dialog = page.getByRole("dialog", { name: "Versleutelde backup ontgrendelen" });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel("Wachtwoord van deze versleutelde back-up").fill("wrong-password");
      await dialog.getByRole("button", { name: "Backup herstellen", exact: true }).click();
      await expect(dialog.getByRole("alert")).toBeVisible();
      expect((await state(page)).onboardingComplete).toBe(false);
      await dialog.getByLabel("Wachtwoord van deze versleutelde back-up").fill("test-pass-123");
      await dialog.getByRole("button", { name: "Backup herstellen", exact: true }).click();
    }
    await expect(page.getByRole("button", { name: "Verder met mijn gegevens" })).toBeVisible();
    const restored = await state(page);
    expect(restored.onboardingComplete).toBe(false);
    expect(restored.profiles.map((p: { id: string }) => p.id)).toEqual([PROFILE_ALEX.id]);
    await expect(page.getByText(/Stel na het herstellen een nieuwe PIN in/)).toBeVisible();
    await page.getByRole("button", { name: "Verder met mijn gegevens" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Begin", exact: true })).toHaveCount(0);
    expect((await state(page)).onboardingComplete).toBe(true);
    expect((await state(page)).profiles).toHaveLength(1);
  });
}

test("invalid backup and back navigation never finish onboarding", async ({ page }) => {
  await openRestore(page);
  await page.getByLabel("Kies een backupbestand").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Verder met mijn gegevens" })).toHaveCount(0);
  await page.getByRole("button", { name: "Terug naar de introductie" }).click();
  await expect(page.getByRole("button", { name: "Begin", exact: true })).toBeVisible();
  expect((await state(page)).onboardingComplete).toBe(false);
  expect((await state(page)).profiles).toHaveLength(0);
});

test("leaving while a backup is read aborts restoration before any writes", async ({ page }) => {
  await openRestore(page);
  await page.evaluate(() => {
    File.prototype.text = () => new Promise<string>((resolve) => {
      Object.assign(window, { finishBackupRead: resolve });
    });
  });
  await page.getByLabel("Kies een backupbestand").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(page.getByRole("button", { name: "Back-up lezen…" })).toBeDisabled();
  await page.getByRole("button", { name: "Terug naar de introductie" }).click();
  await page.evaluate((data) => (window as unknown as { finishBackupRead: (s: string) => void }).finishBackupRead(JSON.stringify(data)), payload);
  await expect(page.getByRole("button", { name: "Begin", exact: true })).toBeVisible();
  expect((await state(page)).profiles).toHaveLength(0);
  expect((await state(page)).onboardingComplete).toBe(false);
});

test("underage choice cannot reach first-run recovery", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Back-up herstellen", exact: true }).click();
  await page.getByRole("button", { name: "Ik ben jonger", exact: true }).click();
  await expect(page.getByLabel("Kies een backupbestand")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Verder naar mijn back-up" })).toHaveCount(0);
  expect((await state(page)).onboardingComplete).toBe(false);
});

test("cancelling an encrypted backup returns to an interactive recovery screen", async ({ page }) => {
  await openRestore(page);
  const encrypted = await encryptBackup(JSON.stringify(payload), "test-pass-123");
  await page.getByLabel("Kies een backupbestand").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(encrypted)) });
  await expect(page.getByRole("dialog", { name: "Versleutelde backup ontgrendelen" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Versleutelde backup ontgrendelen" })).toHaveCount(0);
  await page.getByRole("button", { name: "Terug naar de introductie" }).click();
  await expect(page.getByRole("button", { name: "Begin", exact: true })).toBeVisible();
  expect((await state(page)).onboardingComplete).toBe(false);
  expect((await state(page)).profiles).toHaveLength(0);
});
