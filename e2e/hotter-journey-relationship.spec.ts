import { expect, test } from "@playwright/test";
import { seedAndGo } from "./fixtures";
const root = "/hotter/journey/connection/people";

test("public identity opens a direct profile; private value is hidden until explicitly revealed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, root, []);
  const original = await page.evaluate(() => localStorage.getItem("kink-profiles"));
  await page.getByRole("link", { name: "Bekijk Noor", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(root + "/noor$"));
  const secret = page.getByText("Ik neem graag de tijd om iets nieuws te bespreken.", { exact: true });
  await expect(secret).toHaveCount(0);
  await page.getByRole("button", { name: "Toon privénotitie" }).click();
  await expect(secret).toBeVisible();
  await page.getByRole("button", { name: "Verberg privénotitie" }).click();
  await expect(secret).toHaveCount(0);
  await page.getByRole("textbox", { name: "Zoek onderwerp" }).fill("not-a-topic");
  await expect(page.getByText("Geen onderwerpen gevonden.")).toBeVisible();
  await page.getByRole("button", { name: "Wis zoekterm" }).click();
  await expect(page.getByText("Geen onderwerpen gevonden.")).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Wie wil je ontdekken?" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("kink-profiles"))).toBe(original);
});

test("comparison keeps identities and explicit boundaries through swap and empty perspective", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAndGo(page, root + "/compare", []);
  await expect(page.getByRole("heading", { name: "Noor & Jules" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Harde grenzen" })).toBeVisible();
  const physical = page.locator('[data-fact-topic="aftercare_physical"]');
  await physical.getByRole("button", { name: "Markeer als besproken" }).click();
  await physical.getByRole("button", { name: "Besproken" }).waitFor();
  await page.getByRole("button", { name: "Wissel perspectieven" }).click();
  await expect(page.getByRole("heading", { name: "Jules & Noor" })).toBeVisible();
  await expect(physical.getByRole("button", { name: "Besproken" })).toBeVisible();
  await page.getByLabel("Linker perspectief").selectOption("jules-empty");
  await expect(page.getByText("Nog geen gezamenlijk beoordeelde onderwerpen.")).toBeVisible();
  expect(await page.locator(".journey-world").evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
});
