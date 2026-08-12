import { test, expect } from "@playwright/test";
import { seedProfiles, seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

const SHARED_SAM = { ...PROFILE_SAM, isImported: true, origin: "shared" as const };

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
    await seedProfiles(page, [PROFILE_ALEX, SHARED_SAM]);
  });

  test("scheidt eigen en gedeelde profielen zonder verborgen profielmetadata te bewaren", async ({ page }) => {
    const mine = page.getByRole("button", { name: "Mijn profielen 1" });
    const shared = page.getByRole("button", { name: "Gedeeld met mij 1" });

    await expect(mine).toHaveAttribute("aria-expanded", "true");
    await expect(shared).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText("Alex", { exact: true })).toBeVisible();
    await expect(page.getByText("Sam", { exact: true })).toBeHidden();

    await shared.click();
    await expect(page.getByText("Sam", { exact: true })).toBeVisible();
    await mine.click();
    await expect(page.getByText("Alex", { exact: true })).toBeHidden();

    const stored = await page.evaluate(() => sessionStorage.getItem("kinksync-home-profile-disclosures"));
    expect(stored).toBe('{"mine":false,"shared":true}');
    expect(stored).not.toContain(PROFILE_ALEX.id);
    expect(stored).not.toContain(PROFILE_SAM.id);

    await page.goto("/about");
    await page.goBack();
    await expect(mine).toHaveAttribute("aria-expanded", "false");
    await expect(shared).toHaveAttribute("aria-expanded", "true");
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

  test("instellingen houden hun titel vast terwijl de laatste actie bereikbaar blijft", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const trigger = page.getByRole("button", { name: "Instellingen openen" });
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Instellingen" });
    const title = dialog.getByRole("heading", { name: "Instellingen" });
    const scrollBody = dialog.getByTestId("sheet-scroll-body");
    const lastAction = dialog.getByRole("button", { name: /Alle data verwijderen/ });

    await expect(dialog).toBeVisible();
    const titleTop = (await title.boundingBox())?.y;
    await lastAction.scrollIntoViewIfNeeded();
    await expect.poll(() => scrollBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    const actionBox = await lastAction.boundingBox();
    const visibleHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
    expect(actionBox).not.toBeNull();
    expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(visibleHeight + 1);
    expect((await title.boundingBox())?.y).toBe(titleTop);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
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