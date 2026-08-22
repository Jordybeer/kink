import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

test.describe("Intimiteitsagenda", () => {
  test("plant, corrigeert en houdt een lokaal moment bij op mobiel", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAndGo(page, "/intimacy", [PROFILE_ALEX, PROFILE_SAM]);

    await expect(page.getByText("Ruimte maken voor intimiteit")).toBeVisible();
    await expect(page.getByText(/geen toestemming/)).toBeVisible();
    await page.getByRole("button", { name: "Moment plannen" }).first().click();

    const planDialog = page.getByRole("dialog", { name: "Intiem moment plannen" });
    await planDialog.getByLabel("Datum").fill("2026-08-30");
    await planDialog.getByLabel("Tijd").fill("20:30");
    await planDialog.getByLabel("Titel (optioneel)").fill("Date night");
    await planDialog.getByRole("button", { name: "Plan moment" }).click();

    await expect(page.getByText("Date night", { exact: true })).toBeVisible();
    await expect(page.getByText(/30 aug.*20:30/)).toBeVisible();

    await page.getByRole("button", { name: "Bijhouden" }).click();
    const logDialog = page.getByRole("dialog", { name: "Intiem moment bijhouden" });
    await logDialog.getByLabel("Datum").fill("2026-08-31");
    await logDialog.getByLabel("Privé notitie (optioneel)").fill("Een dag later was fijner");
    await logDialog.getByRole("button", { name: "Bewaar in logboek" }).click();

    await expect(page.getByRole("tab", { name: "Logboek" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Date night", { exact: true })).toBeVisible();
    await expect(page.getByText("Een dag later was fijner", { exact: true })).toBeVisible();
    await expect(page.getByText(/31 aug/)).toBeVisible();

    const persisted = await page.evaluate(() => localStorage.getItem("kinksync-intimacy"));
    expect(persisted).toContain("Date night");
    expect(persisted).toContain("Een dag later was fijner");
    expect(persisted).toContain('"status":"completed"');
  });
});
