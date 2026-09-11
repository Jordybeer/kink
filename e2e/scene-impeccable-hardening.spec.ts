import { expect, test } from "@playwright/test";
import {
  CONTRACT_SERIES_ALEX_SAM,
  PROFILE_ALEX,
  PROFILE_SAM,
  seedAndGo,
} from "./fixtures";

const MOBILE = { width: 390, height: 844 } as const;

test.describe("Scene planner hardening", () => {
  test("kernvelden hebben toegankelijke namen", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await seedAndGo(
      page,
      `/scene?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}`,
      [PROFILE_ALEX, PROFILE_SAM],
    );

    await expect(page.getByLabel("Naam van scène")).toBeVisible();
    await expect(page.getByLabel("Datum")).toBeVisible();
    await expect(page.getByLabel("Safeword")).toBeVisible();
    await expect(page.getByLabel("Eigen item")).toBeVisible();

    await page.getByLabel("Eigen item").fill("Check-in");
    await page.getByRole("button", { name: "Item toevoegen" }).click();
    await page.getByRole("button", { name: "Details" }).click();
    await expect(page.getByLabel("Notitie bij Check-in")).toBeVisible();
  });

  test("Mijn partner wordt de standaardcombinatie zonder de terugroute te kapen", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    const sharedSam = {
      ...PROFILE_SAM,
      id: "shared-sam-scenes",
      origin: "shared" as const,
      isImported: true,
    };

    await seedAndGo(page, "/", [PROFILE_ALEX, sharedSam], {
      pinnedProfileId: PROFILE_ALEX.id,
      onboardingComplete: true,
      profileTourComplete: true,
    });
    await page.evaluate((profileId) => {
      window.localStorage.setItem("kinksync-my-partner-profile", profileId);
    }, sharedSam.id);

    await page.goto("/scene");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Alex & Sam", { exact: true })).toBeVisible();
    await expect(page.getByText("Voor wie is deze scène?", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Terug" })).toHaveAttribute("href", "/scenes");
    await expect(page.getByText("Contract · optioneel", { exact: true })).toBeVisible();
  });

  test("inplannen zet afspraken vast en laat afronden vanuit de play-surface", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await seedAndGo(
      page,
      `/scene?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}`,
      [PROFILE_ALEX, PROFILE_SAM],
      { contractSeries: [CONTRACT_SERIES_ALEX_SAM] },
    );

    await page.getByLabel("Eigen item").fill("Check-in");
    await page.getByRole("button", { name: "Item toevoegen" }).click();
    await page.getByRole("button", { name: "Scène inplannen" }).click();

    await expect(page.getByText(
      "Deze setlist is vastgezet. Activiteiten, intensiteiten en safeword kunnen hier niet meer stilletjes worden aangepast.",
      { exact: true },
    )).toBeVisible();
    await expect(page.getByRole("button", { name: "Scène afronden" })).toBeVisible();

    await page.getByRole("button", { name: "Scène afronden" }).click();
    await expect(page.getByRole("heading", { name: "Aftercare check-in" })).toBeVisible();
    await expect(page.getByLabel("Wat werkte goed?")).toBeVisible();
    await expect(page.getByLabel("Onthouden voor volgende keer")).toBeVisible();
  });
});
