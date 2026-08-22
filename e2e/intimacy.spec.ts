import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

test.describe("Intimiteitsagenda", () => {
  test("plant en houdt een lokaal moment bij op mobiel", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAndGo(page, "/intimacy", [PROFILE_ALEX, PROFILE_SAM]);

    await expect(page.getByText("Ruimte maken voor intimiteit")).toBeVisible();
    await page.getByRole("button", { name: "Moment plannen" }).first().click();

    const dialog = page.getByRole("dialog", { name: "Intiem moment plannen" });
    await dialog.getByLabel("Datum").fill("2026-08-30");
    await dialog.getByLabel("Tijd").fill("20:30");
    await dialog.getByLabel("Titel (optioneel)").fill("Date night");
    await dialog.getByRole("button", { name: "Plan moment" }).click();

    await expect(page.getByText("Date night", { exact: true })).toBeVisible();
    await expect(page.getByText(/30 aug.*20:30/)).toBeVisible();

    await page.getByRole("button", { name: "Gebeurd" }).click();
    await expect(page.getByRole("tab", { name: "Logboek" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Date night", { exact: true })).toBeVisible();

    const persisted = await page.evaluate(() => localStorage.getItem("kinksync-intimacy"));
    expect(persisted).toContain("Date night");
    expect(persisted).toContain('"status":"completed"');
  });
});
