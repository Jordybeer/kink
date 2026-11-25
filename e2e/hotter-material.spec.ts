import { expect, test } from "@playwright/test";
import { seedAndGo } from "./fixtures";

test("material comparison preserves selection and question geometry", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/hotter", []);
  const answers = page.getByRole("group", { name: "Status kiezen" });
  const maybe = answers.getByRole("button", { name: /Misschien/ });
  await maybe.click();
  await expect(maybe).toHaveAttribute("aria-pressed", "true");
  const baseline = await maybe.boundingBox();
  await page.getByRole("group", { name: "Materiaal" }).getByRole("button", { name: "Velvet" }).click();
  await expect(maybe).toHaveAttribute("aria-pressed", "true");
  const next = await maybe.boundingBox();
  expect(Math.abs(next!.y - baseline!.y)).toBeLessThanOrEqual(1);
  await page.getByRole("group", { name: "Voorbeeldthema" }).getByRole("button", { name: "Donker" }).click();
  await expect(maybe).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Volgende" }).click();
  await expect(maybe).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Vorige" }).click();
  await expect(maybe).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Opnieuw proberen" }).click();
  await expect(maybe).toHaveAttribute("aria-pressed", "false");
});

test("narrow preview and reduced motion retain functional selection", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAndGo(page, "/hotter", []);
  const limit = page.getByRole("group", { name: "Status kiezen" }).getByRole("button", { name: /Harde grens/ });
  await limit.click();
  await expect(limit).toHaveAttribute("aria-pressed", "true");
  expect(await limit.evaluate(node => getComputedStyle(node, "::before").animationName)).toBe("none");
  expect(await page.locator(".ht-world").evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
});
