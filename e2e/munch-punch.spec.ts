import { expect, test } from "@playwright/test";

test("Munch Punch shuttles one anonymous response and rejects exact replay", async ({ page, browser }) => {
  await page.goto("/munch-punch", { waitUntil: "networkidle" });
  await expect(page.getByRole("navigation", { name: "Tabbladen" })).toHaveCount(0);

  await page.getByLabel("Naam van de room").fill("Foxtail munch");
  await page.getByRole("button", { name: "Maak conceptroom" }).click();
  await expect(page.getByRole("button", { name: "Open room en toon join-QR" })).toBeVisible();
  await page.getByRole("button", { name: "Open room en toon join-QR" }).click();

  const joinOutput = page.locator('output[data-qr-value]').first();
  await expect(joinOutput).toBeAttached();
  const joinUrl = await joinOutput.getAttribute("data-qr-value");
  expect(joinUrl).toContain("/munch-punch/join#KSMJ1:");

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(joinUrl!, { waitUntil: "networkidle" });
  await expect(guest.getByRole("navigation", { name: "Tabbladen" })).toHaveCount(0);
  expect(await guest.evaluate(() => localStorage.getItem("kinksync-munch-punch-v1"))).toBeNull();

  for (let index = 0; index < 8; index += 1) {
    await guest.locator('button[aria-pressed]').first().click();
    if (index < 7) {
      await guest.getByRole("button", { name: "Volgende" }).click();
    }
  }
  await guest.getByRole("button", { name: "Maak response-QR" }).click();
  await expect(guest.getByText("De losse keuzes zijn uit deze pagina gewist", { exact: false })).toBeVisible();
  await expect(guest.locator('button[aria-pressed]')).toHaveCount(0);
  expect(await guest.evaluate(() => localStorage.getItem("kinksync-munch-punch-v1"))).toBeNull();

  const responseOutput = guest.locator('output[data-qr-value]').first();
  await expect(responseOutput).toBeAttached();
  const responseCode = await responseOutput.getAttribute("data-qr-value");
  expect(responseCode).toMatch(/^KSMR1:/);

  await page.getByRole("button", { name: "Open submission station" }).click();
  const responseField = page.getByLabel("Versleutelde responsecode");
  if (!await responseField.isVisible()) {
    await page.getByRole("button", { name: "Plak responsecode" }).click();
  }
  await responseField.fill(responseCode!);
  await page.getByRole("button", { name: "Response verwerken" }).click();
  await expect(page.getByText("Response 1 is opgeteld", { exact: false })).toBeVisible();

  await responseField.fill(responseCode!);
  await page.getByRole("button", { name: "Response verwerken" }).click();
  await expect(page.getByText("Exact dezelfde response-QR was al verwerkt.")).toBeVisible();

  const countCard = page.getByText("geldige responses").locator("..");
  await expect(countCard.getByText("1", { exact: true })).toBeVisible();
  await guestContext.close();
});
