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

async function deliberateGrip(page: Page) {
  const dial = page.getByTestId("onboarding-turn-dial");
  const box = await dial.boundingBox();
  expect(box).not.toBeNull();

  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;
  const radius = Math.min(box!.width, box!.height) * 0.34;
  const angles = Array.from({ length: 13 }, (_, index) => -90 + index * 10);
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

  for (const angle of angles.slice(1)) {
    const next = point(angle);
    await page.mouse.move(next.x, next.y);
    await page.waitForTimeout(35);
  }

  await page.mouse.up();
}

test.describe("Onboarding vault", () => {
  test("a tap never opens it and the 236° vault turn can be finished across two comfortable grips", async ({ page }) => {
    await reachVault(page);
    const dial = page.getByTestId("onboarding-turn-dial");

    await dial.click();
    await expect(page.getByRole("heading", { name: /genoeg voorspel/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Begin met jouw profiel" })).not.toBeVisible();

    await deliberateGrip(page);
    await expect(page.getByText("Blijf draaien…", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Begin met jouw profiel" })).not.toBeVisible();

    await deliberateGrip(page);
    await expect(page.getByText("Open.", { exact: true })).toBeVisible();
    await page.waitForTimeout(220);
    await expect(page.getByRole("heading", { name: /genoeg voorspel/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Begin met jouw profiel" })).not.toBeVisible({ timeout: 100 });
    await expect(page.getByRole("button", { name: "Begin met jouw profiel" })).toBeVisible({ timeout: 2500 });

    const footer = page.getByRole("contentinfo");
    await expect(footer.getByText("For adults. By adults.", { exact: true })).toBeVisible();
    await expect(footer.getByRole("link", { name: "FetLife" })).toHaveAttribute("href", "https://fetlife.com/zwoelebeer");
    await expect(footer.getByRole("link", { name: "E-mail" })).toHaveAttribute("href", "mailto:info@jordy.beer");
  });

  test("a partial grip stays closed without throwing away the user's progress", async ({ page }) => {
    await reachVault(page);

    await deliberateGrip(page);

    await expect(page.getByRole("heading", { name: /genoeg voorspel/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Begin met jouw profiel" })).not.toBeVisible();
    await expect(page.getByText("Blijf draaien…", { exact: true })).toBeVisible();
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
    await expect(page.getByText("Draai de kluisschijf naar rechts", { exact: true })).toBeVisible();
  });
});
