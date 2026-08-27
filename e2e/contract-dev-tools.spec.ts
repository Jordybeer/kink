import { expect, test, type Page } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

const URL = "/contract?a=pw-alex-001&b=pw-sam-002&testtools=1";
const LOCAL_ALEX = { ...PROFILE_ALEX, origin: "own" as const, isImported: false };
const LOCAL_SAM = { ...PROFILE_SAM, origin: "own" as const, isImported: false };

async function drawSignature(page: Page, name: string) {
  await page.getByRole("button", { name: `Handtekeningveld openen voor ${name}` }).click();
  const canvas = page.locator(`canvas[aria-label="Handtekening voor ${name}"]`);
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  await page.mouse.move(box.x + 30, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 30, box.y + box.height / 2 + 12, { steps: 6 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Klaar", exact: true }).click();
}

test("explicit dev test mode offers local dual signing for two own profiles", async ({ page }) => {
  await seedAndGo(page, URL, [LOCAL_ALEX, LOCAL_SAM]);

  await drawSignature(page, LOCAL_ALEX.name);
  await drawSignature(page, LOCAL_SAM.name);
  await page.getByRole("button", { name: "Contract bewaren of digitaal bevestigen" }).click();

  await expect(page.getByText("Testmodus", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Beide lokale profielen bevestigen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "QR voor partner tonen" })).toHaveCount(0);
  await expect(page).toHaveURL(/testtools=1/);
});
