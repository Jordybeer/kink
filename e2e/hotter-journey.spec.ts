import { expect, test } from "@playwright/test";
import { seedAndGo } from "./fixtures";

test("journey entries preserve fictional state across candidate, theme and navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/hotter/journey/self", []);
  const world = page.locator(".journey-world");
  const original = await page.evaluate(() => localStorage.getItem("kink-profiles"));
  const maybe = page.getByRole("group", { name: "Jouw antwoord" }).getByRole("button", { name: /Misschien/ });
  await expect(page.getByRole("heading", { name: "Leiding nemen of geven" })).toBeVisible();
  await maybe.click();
  await expect(maybe).toHaveAttribute("aria-pressed", "true");
  await page.locator(".journey-labdetails summary").click();
  await page.getByRole("group", { name: "Kleurwereld" }).getByRole("button", { name: "Velvet" }).click();
  await expect(world).toHaveAttribute("data-world", "velvet");
  await page.getByRole("group", { name: "Thema" }).getByRole("button", { name: "Donker" }).click();
  await expect(world).toHaveAttribute("data-preview-theme", "dark");
  await expect(maybe).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("navigation", { name: "Ervaringen" }).getByRole("link", { name: "Elkaar" }).click();
  await expect(page.getByRole("heading", { name: "Noor & Jules" })).toBeVisible();
  await page.getByRole("navigation", { name: "Ervaringen" }).getByRole("link", { name: "Samen" }).click();
  await expect(page.getByRole("heading", { name: "Een avond samen" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Noor & Jules" })).toBeVisible();
  await page.getByRole("navigation", { name: "Ervaringen" }).getByRole("link", { name: "Jezelf" }).click();
  await page.getByRole("link", { name: "Vergelijk met de materiaalproef" }).click();
  await expect(maybe).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => localStorage.getItem("kink-profiles"))).toBe(original);
  await page.reload();
  await expect(maybe).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("link", { name: "Materialenstudio" }).click();
  await expect(page.getByRole("heading", { name: "Voel het verschil." })).toBeVisible();
});

test("material and palette comparison preserves geometry and keyboard selection", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAndGo(page, "/hotter/journey/self", []);
  const limit = page.getByRole("group", { name: "Jouw antwoord" }).getByRole("button", { name: /Harde grens/ });
  await limit.focus();
  await page.keyboard.press("Space");
  await expect(limit).toHaveAttribute("aria-pressed", "true");
  await page.locator(".journey-labdetails summary").click();
  const box = await limit.boundingBox();
  for (const material of ["Ingedrukt", "Verheven", "Dynamisch"]) {
    await page.getByRole("group", { name: "Materiaal" }).getByRole("button", { name: material }).click();
    await expect(limit).toHaveAttribute("aria-pressed", "true");
    const next = await limit.boundingBox();
    expect(Math.abs(next!.y - box!.y)).toBeLessThanOrEqual(1);
  }
  expect(await limit.evaluate(node => getComputedStyle(node, "::before").animationName)).toBe("none");
  expect(await page.locator(".journey-world").evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Volgende" }).click();
  await expect(page.getByRole("heading", { name: "Aanspreektitels" })).toBeVisible();
  await expect(limit).toHaveAttribute("aria-pressed", "false");
});

test("comparison private note is explicitly revealed and removed on hide", async ({ page }) => {
  await seedAndGo(page, "/hotter/journey/connection", []);
  await page.getByRole("button", { name: "Bekijk Noor" }).click();
  const note = page.getByText("Ik neem graag de tijd om iets nieuws te bespreken.", { exact: true });
  await expect(note).toHaveCount(0);
  await page.getByRole("button", { name: "Toon privénotitie" }).click();
  await expect(note).toBeVisible();
  await page.getByRole("button", { name: "Verberg privénotitie" }).click();
  await expect(note).toHaveCount(0);
  await page.getByRole("button", { name: "Terug naar vergelijking" }).click();
  await expect(page.getByText("Harde grens", { exact: true })).toBeVisible();
});

test("a moment becomes a memory only on explicit action; writer cancel retains saved text", async ({ page }) => {
  await seedAndGo(page, "/hotter/journey/together", []);
  await page.getByRole("button", { name: "Gedachte toevoegen" }).click();
  await page.getByRole("textbox", { name: "Jouw gedachte" }).fill("Samen rustig beginnen.");
  await page.getByRole("button", { name: "Bewaar gedachte" }).click();
  await expect(page.getByText("Samen rustig beginnen.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gedachte bewerken" }).click();
  await page.getByRole("textbox", { name: "Jouw gedachte" }).fill("Niet bewaren.");
  await page.getByRole("button", { name: "Annuleren" }).click();
  await expect(page.getByText("Samen rustig beginnen.", { exact: true })).toBeVisible();
  await expect(page.getByText("Gepland", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Markeer als beleefd" }).click();
  await expect(page.getByText("Beleefd", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Een avond samen" })).toBeVisible();
  await expect(page.getByText("Samen rustig beginnen.", { exact: true })).toBeVisible();
});
