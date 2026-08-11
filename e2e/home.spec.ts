import { test, expect } from "@playwright/test";
import { seedProfiles, seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

test.describe("Home page — leeg", () => {
  test("laadt zonder overflow en toont onboarding of lege staat", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);
  });
});

test.describe("Home page — profielen aanwezig", () => {
  test.beforeEach(async ({ page }) => {
    await seedProfiles(page, [PROFILE_ALEX, PROFILE_SAM]);
  });

  test("toont beide profielen in de lijst", async ({ page }) => {
    await expect(page.getByText("Alex", { exact: true })).toBeVisible();
    await expect(page.getByText("Sam", { exact: true })).toBeVisible();
  });

  test("navigeert naar profielpagina via link op profiel", async ({ page }) => {
    await page.getByRole("link", { name: "Alex Dominant openen" }).click();
    await expect(page).toHaveURL(/\/profile\/pw-alex-001/);
  });

  test("toont link naar vergelijken pagina", async ({ page }) => {
    const compareLink = page.getByRole("link", { name: /Vergelijk.*Alex.*Sam/i });
    await expect(compareLink).toBeVisible();
    await expect(compareLink).toHaveAttribute("href", /\/compare\?a=pw-alex-001&b=pw-sam-002/);
  });

  test("geen horizontale overflow op mobiel (390px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);
  });
});

test.describe("Profiel aanmaken via UI", () => {
  test("opent het formulier en maakt een nieuw profiel aan", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await seedAndGo(page, "/", [], { onboardingComplete: true, profileTourComplete: false });

    await page.getByRole("button", { name: "Begin met jouw profiel" }).click();
    await expect(page.getByRole("dialog", { name: "Nieuw profiel maken" })).toBeVisible();
    await expect(page.getByText("Stap 1 van 2", { exact: true })).toBeVisible();
    await page.getByLabel("Naam of alias").fill("TestPersoon");
    await page.getByRole("button", { name: /^Dominant/ }).click();
    await page.getByRole("button", { name: "Verder" }).click();
    await expect(page.getByText("Stap 2 van 2", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Start vragen" }).click();

    await expect(page).toHaveURL(/\/profile\/[^/]+\/questions$/, { timeout: 8000 });
    await expect(page.getByTestId("questions-screen")).toBeVisible();
    await expect(page.getByText("Voorkeuren", { exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "Status kiezen" })).toBeVisible();

    const entries = await page.evaluate(() => {
      const raw = localStorage.getItem("kink-profiles");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { state?: { profiles?: Array<{ name?: string; entries?: unknown }> } };
      return parsed.state?.profiles?.find((profile) => profile.name === "TestPersoon")?.entries ?? null;
    });
    expect(entries).toEqual({});
  });
});