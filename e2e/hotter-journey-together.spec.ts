import { expect, test } from "@playwright/test";
import { seedAndGo } from "./fixtures";
const path = "/hotter/journey/together/atelier";

test("moment writer retains draft on failure, optional partner and explicit completion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, path, []);
  const before = await page.evaluate(() => localStorage.getItem("kinksync-intimacy"));
  await page.getByRole("button", { name: "Bewerk Tijd voor mezelf" }).click();
  await page.getByRole("button", { name: "Details", exact: true }).click();
  await expect(page.getByLabel("Met wie")).toHaveValue("");
  await page.getByRole("button", { name: "Naar notitie" }).click();
  await page.getByLabel("Jouw notitie").fill("Een eigen gedachte.");
  await page.getByText("Technische proef", { exact: true }).click();
  await page.getByLabel("Simuleer een bewaarfout").check();
  await page.getByRole("button", { name: "Bewaar moment" }).click();
  await expect(page.getByRole("alert")).toContainText("Bewaartest mislukt");
  await expect(page.getByLabel("Jouw notitie")).toHaveValue("Een eigen gedachte.");
  await page.getByRole("button", { name: "Bewaar moment" }).click();
  await expect(page.getByText("Een eigen gedachte.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Bijhouden Een avond samen" }).click();
  await expect(page.getByRole("heading", { name: "Een avond samen" })).toBeVisible();
  await page.getByRole("button", { name: "Bewaar in logboek" }).click();
  await expect(page.getByRole("heading", { name: "Logboek", exact: true })).toBeVisible();
  await expect(page.getByText("Een avond samen", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("kinksync-intimacy"))).toBe(before);
});

test("cancel protects changes and a draft survives navigation inside the studio", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAndGo(page, path, []);
  await page.getByRole("button", { name: "Bewerk Een avond samen" }).click();
  await page.getByLabel("Jouw notitie").fill("Niet weggooien zonder vraag.");
  await page.getByRole("navigation", { name: "Ervaringen" }).getByRole("link", { name: "Elkaar" }).click();
  await page.getByRole("navigation", { name: "Ervaringen" }).getByRole("link", { name: "Samen" }).click();
  await expect(page.getByLabel("Jouw notitie")).toHaveValue("Niet weggooien zonder vraag.");
  await page.getByRole("button", { name: "Annuleren", exact: true }).click();
  await expect(page.getByText("Wijzigingen weggooien?", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Verder schrijven" }).click();
  await expect(page.getByLabel("Jouw notitie")).toHaveValue("Niet weggooien zonder vraag.");
  await page.getByRole("button", { name: "Annuleren", exact: true }).click();
  await page.getByRole("button", { name: "Gooi wijzigingen weg" }).click();
  await expect(page.getByRole("heading", { name: "Wat komt" })).toBeVisible();
  expect(await page.locator(".journey-world").evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
});

test("agreement examples do not sign; scene completion and aftercare are distinct", async ({ page }) => {
  await seedAndGo(page, path + "/agreements", []);
  await page.getByLabel("Voorbeeldstatus").selectOption("pending_signature");
  await expect(page.getByText("Wacht op handtekening", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /onderteken/i })).toHaveCount(0);
  await page.getByLabel("Voorbeeldstatus").selectOption("quarantine");
  await expect(page.getByRole("status")).toContainText("Niet bruikbaar als overeenkomst");
  await page.getByRole("navigation", { name: "Samen ervaren" }).getByRole("link", { name: "Scènes" }).click();
  await page.getByRole("button", { name: "Markeer scène als beleefd" }).click();
  await expect(page.getByRole("heading", { name: "Hoe voelde het?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bewaar nazorg" })).toBeDisabled();
  await page.getByRole("button", { name: "Goed, maar…" }).click();
  await page.getByLabel("Onthouden voor volgende keer").fill("Meer tijd nemen.");
  await page.getByRole("button", { name: "Bewaar nazorg" }).click();
  await expect(page.getByText("Meer tijd nemen.", { exact: true })).toBeVisible();
});
