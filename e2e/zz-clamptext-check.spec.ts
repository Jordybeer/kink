import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

const SHOTS = "/tmp/claude-1000/-home-cyberbear-code-kink/1d60e2e1-a560-4cd8-af42-aec97b06241c/scratchpad/clamp";

test.use({ viewport: { width: 375, height: 812 } });

test("expanding description does not move the pills, and focuses the overlay", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [PROFILE_ALEX, PROFILE_SAM]);
  await page.getByRole("radio", { name: "Bewerken" }).click();
  await page.waitForTimeout(600);
  await page.getByPlaceholder("Zoek een kink…").fill("choking");
  await page.waitForTimeout(300);
  await page.getByText("Choking / breath restriction").click();
  await page.waitForTimeout(500);

  const pills = page.locator('[data-tour="pills"]');
  const before = await pills.boundingBox();
  await page.screenshot({ path: `${SHOTS}/1-collapsed.png` });

  await page.getByText("…meer").click();
  await page.waitForTimeout(500);

  const after = await pills.boundingBox();
  await page.screenshot({ path: `${SHOTS}/2-expanded.png` });

  expect(after?.y).toBeCloseTo(before?.y ?? -1, 0);
  expect(after?.x).toBeCloseTo(before?.x ?? -1, 0);

  const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  expect(focused).toBe("Toon minder");

  await page.getByText("minder ↑").click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/3-collapsed-again.png` });
  const restored = await pills.boundingBox();
  expect(restored?.y).toBeCloseTo(before?.y ?? -1, 0);
});
