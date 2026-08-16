import { expect, test, type Page } from "@playwright/test";

async function reachVault(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await page.getByRole("button", { name: "Ik ben 18+", exact: true }).click();
  await page.getByRole("button", { name: /kom maar door/i }).click();
  await page.getByRole("button", { name: /^verder/i }).click();
  await page.getByRole("button", { name: "Niet nu", exact: true }).click();

  await expect(page.getByRole("heading", { name: /genoeg voorspel/i })).toBeVisible();
  await expect(page.getByTestId("onboarding-turn-dial")).toBeVisible();
}

async function deliberateQuarterTurn(page: Page, finish: "up" | "cancel" = "up") {
  const dial = page.getByTestId("onboarding-turn-dial");
  const box = await dial.boundingBox();
  expect(box).not.toBeNull();

  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;
  const radius = Math.min(box!.width, box!.height) * 0.34;
  const angles = [-90, -75, -60, -45, -30, -15, 0, 15];
  const point = (angle: number) => {
    const radians = angle * Math.PI / 180;
    return {
      x: centerX + Math.cos(radians) * radius,
      y: centerY + Math.sin(radians) * radius,
    };
  };

  const start = point(angles[0]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();

  let last = start;
  for (const angle of angles.slice(1)) {
    last = point(angle);
    await page.mouse.move(last.x, last.y);
    await page.waitForTimeout(55);
  }

  if (finish === "cancel") {
    await dial.dispatchEvent("pointercancel", {
      pointerId: 1,
      clientX: last.x,
      clientY: last.y,
    });
    await page.mouse.up();
    return;
  }

  await page.mouse.up();
}

test.describe("Onboarding vault", () => {
  test("a tap never opens it, a deliberate quarter-turn does", async ({ page }) => {
    await reachVault(page);
    const dial = page.getByTestId("onboarding-turn-dial");

    await dial.click();
    await expect(page.getByRole("heading", { name: /genoeg voorspel/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Begin met jouw profiel" })).not.toBeVisible();

    await deliberateQuarterTurn(page);
    await expect(page.getByRole("button", { name: "Begin met jouw profiel" })).toBeVisible({ timeout: 2500 });
  });

  test("an interrupted quarter-turn always resets closed", async ({ page }) => {
    await reachVault(page);

    await deliberateQuarterTurn(page, "cancel");

    await expect(page.getByRole("heading", { name: /genoeg voorspel/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Begin met jouw profiel" })).not.toBeVisible();
    await expect(page.getByText("Draai met de klok mee", { exact: true })).toBeVisible();
  });

  test("the vault stays fully visible on the compact iPhone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await reachVault(page);

    const dial = page.getByTestId("onboarding-turn-dial");
    const box = await dial.boundingBox();
    const visibleHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);

    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(131);
    expect(box!.width).toBeLessThanOrEqual(153);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(visibleHeight + 1);

    const horizontalOverflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(horizontalOverflow).toBe(false);
    await expect(page.getByText("Draai met de klok mee", { exact: true })).toBeVisible();
    await expect(page.getByText(/kwartslag/i)).not.toBeVisible();
  });
});
