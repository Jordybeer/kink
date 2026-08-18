import { pbkdf2Sync } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { buildStore, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

const STORE_KEY = "kink-profiles";
const PIN_ITERATIONS = 310_000;

function storedPinHash(pin: string): string {
  const salt = Buffer.from("kinksync-e2e-pin-salt");
  const bits = pbkdf2Sync(pin, salt, PIN_ITERATIONS, 32, "sha256");
  return `pbkdf2:${salt.toString("base64")}:${bits.toString("base64")}`;
}

function lockedStore(pinHash: string): string {
  const base = buildStore([PROFILE_ALEX, PROFILE_SAM]);
  return JSON.stringify({
    ...base,
    state: {
      ...base.state,
      appLockEnabled: true,
      appLockPin: pinHash,
    },
  });
}

async function installLockedStore(page: Page, pinHash: string) {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => window.localStorage.setItem(key, value),
    { key: STORE_KEY, value: lockedStore(pinHash) },
  );
}

test("app-lock blocks direct data routes before their content mounts", async ({ page }) => {
  await installLockedStore(page, "locked-for-e2e");

  for (const route of [
    "/profile/pw-alex-001",
    "/compare?a=pw-alex-001&b=pw-sam-002",
    "/contracts",
    "/scenes",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: "KinkSync ontgrendelen" })).toBeVisible();
    await expect(page.getByLabel("Tabbladen")).toHaveCount(0);
    await expect(page.getByText("Alex", { exact: true })).toHaveCount(0);
  }
});

test("een nieuwe viercijferige PIN ontgrendelt nog zonder extra bevestiging", async ({ page }) => {
  await installLockedStore(page, storedPinHash("1234"));
  await page.goto("/");

  for (const digit of ["1", "2", "3", "4"]) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }

  await expect(page.getByRole("heading", { name: "KinkSync ontgrendelen" })).toHaveCount(0);
});

test("een vóór de fix ingestelde zescijferige PIN blijft bruikbaar", async ({ page }) => {
  await installLockedStore(page, storedPinHash("123456"));
  await page.goto("/");

  for (const digit of ["1", "2", "3", "4"]) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }

  await expect(page.getByText(/Had je eerder 5–8 cijfers/)).toBeVisible();
  await page.getByRole("button", { name: "5", exact: true }).click();
  await page.getByRole("button", { name: "6", exact: true }).click();
  await page.getByRole("button", { name: "Oudere PIN bevestigen" }).click();

  await expect(page.getByRole("heading", { name: "KinkSync ontgrendelen" })).toHaveCount(0);
});
