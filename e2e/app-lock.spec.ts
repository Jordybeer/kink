import { expect, test } from "@playwright/test";
import { buildStore, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

const STORE_KEY = "kink-profiles";

test("app-lock blocks direct data routes before their content mounts", async ({ page }) => {
  const base = buildStore([PROFILE_ALEX, PROFILE_SAM]);
  const lockedStore = JSON.stringify({
    ...base,
    state: {
      ...base.state,
      appLockEnabled: true,
      appLockPin: "locked-for-e2e",
    },
  });

  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: STORE_KEY, value: lockedStore },
  );

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
