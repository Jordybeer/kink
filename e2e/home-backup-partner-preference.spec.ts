import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

const MOBILE = { width: 390, height: 844 } as const;

test.describe("Home herstel en partner-voorkeur", () => {
  test("lege Home biedt backup herstellen als rustige derde instaproute", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await seedAndGo(page, "/", [], {
      onboardingComplete: true,
      profileTourComplete: true,
    });

    await expect(page.getByRole("heading", { name: "Maak je eerste profiel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Maak mijn profiel Kies wat bij jou past" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Scan gedeeld profiel Bekijk wat iemand met je heeft gedeeld" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Backup herstellen Ga verder met een bestaande KinkSync-backup" })).toBeVisible();
    await expect(page.getByLabel("Kies een backupbestand")).toHaveAttribute("accept", ".json,application/json");

    expect(await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)).toBe(false);
  });

  test("Mijn partner stuurt de gedeelde preview en standaardvergelijking", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    const sharedSam = {
      ...PROFILE_SAM,
      id: "shared-sam",
      name: "Sam",
      origin: "shared" as const,
      isImported: true,
    };
    const sharedRiley = {
      ...PROFILE_SAM,
      id: "shared-riley",
      name: "Riley",
      createdAt: PROFILE_SAM.createdAt + 1,
      updatedAt: PROFILE_SAM.updatedAt + 1,
      origin: "shared" as const,
      isImported: true,
    };

    await seedAndGo(page, `/profile/${sharedRiley.id}`, [PROFILE_ALEX, sharedSam, sharedRiley], {
      onboardingComplete: true,
      profileTourComplete: true,
      pinnedProfileId: PROFILE_ALEX.id,
    });

    await page.getByRole("button", { name: "Meer acties" }).click();
    await expect(page.getByText("Markeer als mijn partner", { exact: true })).toBeVisible();
    await page.getByText("Markeer als mijn partner", { exact: true }).click();
    await expect(page.getByText("Gedeeld profiel · Mijn partner", { exact: true })).toBeVisible();

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("link", { name: "Riley Submissive openen" })).toBeVisible();
    await expect(page.locator("[data-home-compare-feature]")).toHaveAccessibleName("Vergelijk Alex en Riley");

    await page.goto(`/profile/${sharedRiley.id}`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Meer acties" }).click();
    await expect(page.getByText("Mijn partner", { exact: true })).toBeVisible();
  });
});
