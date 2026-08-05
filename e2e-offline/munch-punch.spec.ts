import { expect, test } from "@playwright/test";

async function waitForOfflineCache(page: import("@playwright/test").Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20_000 });
  await page.waitForFunction(
    () => document.documentElement.dataset.offlineCache === "ready",
    null,
    { timeout: 30_000 },
  );
  await page.waitForLoadState("networkidle");
}

test("Munch Punch host and guest shells work after the network disappears", async ({ page, context }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await waitForOfflineCache(page);
  await context.setOffline(true);

  await page.goto("/munch-punch", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Je bent offline")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Munch Punch" })).toBeVisible();

  await page.getByRole("button", { name: "Maak conceptroom" }).click();
  await page.getByRole("button", { name: "Open room en toon join-QR" }).click();
  const joinUrl = await page.locator('output[data-qr-value]').first().getAttribute("data-qr-value");
  expect(joinUrl).toContain("/munch-punch/join#KSMJ1:");

  const guest = await context.newPage();
  await guest.goto(joinUrl!, { waitUntil: "domcontentloaded" });
  await expect(guest.getByText("Je bent offline")).toHaveCount(0);
  await expect(guest.getByText("Vraag 1 van 8")).toBeVisible();
});
