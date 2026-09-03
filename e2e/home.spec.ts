import { test, expect } from "@playwright/test";
import { seedProfiles, seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

const SHARED_SAM = { ...PROFILE_SAM, isImported: true, origin: "shared" as const };

test.describe("Home page — leeg", () => {
  test("laadt zonder overflow en houdt de lege compositie verticaal in balans", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAndGo(page, "/", [], { onboardingComplete: true, profileTourComplete: false });

    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);

    const emptyHeading = page.getByRole("heading", { name: "Maak je eerste profiel" });
    await expect(emptyHeading).toBeVisible();
    const emptySection = emptyHeading.locator("xpath=ancestor::section");
    const sectionBox = await emptySection.boundingBox();
    expect(sectionBox).not.toBeNull();

    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const sectionBottom = sectionBox!.y + sectionBox!.height;
    expect(sectionBox!.y).toBeGreaterThan(viewportHeight * 0.24);
    expect(sectionBottom).toBeGreaterThan(viewportHeight * 0.68);
    expect(sectionBottom).toBeLessThan(viewportHeight * 0.9);
  });
});

test.describe("Home page — profielen aanwezig", () => {
  test.beforeEach(async ({ page }) => {
    await seedProfiles(page, [PROFILE_ALEX, SHARED_SAM]);
  });

  test("scheidt eigen en gedeelde profielen in stabiele secties zonder UI-state te bewaren", async ({ page }) => {
    const mine = page.getByRole("heading", { name: "Mijn profielen" });
    const shared = page.getByRole("heading", { name: "Gedeeld met mij" });

    await expect(mine).toBeVisible();
    await expect(shared).toBeVisible();
    await expect(page.getByText("Alex", { exact: true })).toBeVisible();
    await expect(page.getByText("Sam", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Mijn profielen/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Gedeeld met mij/ })).toHaveCount(0);

    const stored = await page.evaluate(() => sessionStorage.getItem("kinksync-home-profile-disclosures"));
    expect(stored).toBeNull();

    await page.goto("/about");
    await page.goBack();
    await expect(mine).toBeVisible();
    await expect(shared).toBeVisible();
    await expect(page.getByText("Alex", { exact: true })).toBeVisible();
    await expect(page.getByText("Sam", { exact: true })).toBeVisible();
  });

  test("navigeert naar profielpagina via link op profiel", async ({ page }) => {
    await page.getByRole("link", { name: "Alex Dominant openen" }).click();
    await expect(page).toHaveURL(/\/profile\/pw-alex-001/);
  });

  test("bundelt zeldzame profielacties in een ruime actiekiezer", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const profileLink = page.getByRole("link", { name: "Alex Dominant openen" });
    const trigger = page.getByRole("button", { name: "Meer acties voor Alex" });
    const [linkBox, triggerBox] = await Promise.all([profileLink.boundingBox(), trigger.boundingBox()]);

    expect(linkBox).not.toBeNull();
    expect(triggerBox).not.toBeNull();
    expect(triggerBox!.width).toBeGreaterThanOrEqual(44);
    expect(triggerBox!.height).toBeGreaterThanOrEqual(44);
    expect(linkBox!.x + linkBox!.width).toBeLessThanOrEqual(triggerBox!.x + 1);

    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Acties voor Alex" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Markeer als mijn profiel" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Profiel bewerken" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Profiel verwijderen" })).toBeVisible();
    await dialog.getByRole("button", { name: "Annuleren" }).click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("houdt home vrij van directe contract- en scènecreatie", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Maak een contract", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Nieuwe scène", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Contracten", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Scènes", exact: true })).toBeVisible();
  });

  test("toont link naar vergelijken pagina", async ({ page }) => {
    const compareLink = page.getByRole("link", { name: /Vergelijk.*Alex.*Sam/i });
    await expect(compareLink).toBeVisible();
    await expect(compareLink).toHaveAttribute("href", /\/compare\?a=pw-alex-001&b=pw-sam-002/);
  });

  test("instellingen houden hun titel vast terwijl de laatste actie bereikbaar blijft", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 480 });
    const more = page.getByRole("button", { name: "Meer opties" });
    await more.click();
    await page.getByRole("menuitem", { name: "Instellingen" }).click();

    const dialog = page.getByRole("dialog", { name: "Instellingen" });
    const title = dialog.getByRole("heading", { name: "Instellingen" });
    const scrollBody = dialog.getByTestId("sheet-scroll-body");
    const lastAction = dialog.getByRole("button", { name: /Alle data verwijderen/ });

    await expect(dialog).toBeVisible();
    await expect.poll(async () => dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
      return Math.max(0, -rect.top, rect.bottom - visibleHeight);
    })).toBeLessThanOrEqual(1);
    const titleBox = await title.boundingBox();
    expect(titleBox).not.toBeNull();
    const titleTop = titleBox!.y;
    await scrollBody.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await expect.poll(() => scrollBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    const actionBox = await lastAction.boundingBox();
    const visibleHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
    expect(actionBox).not.toBeNull();
    expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(visibleHeight + 1);
    expect((await title.boundingBox())!.y).toBeCloseTo(titleTop, 0);

    await dialog.getByRole("button", { name: "Instellingen sluiten" }).click();
    await expect(dialog).toBeHidden();
    await expect(more).toBeFocused();
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

    await page.getByRole("button", { name: /^Maak mijn profiel\b/ }).click();
    await expect(page.getByRole("dialog", { name: "Nieuw profiel maken" })).toBeVisible();
    await expect(page.getByText("Stap 1 van 2", { exact: true })).toBeVisible();
    await page.getByLabel("Naam of alias").fill("TestPersoon");
    await page.getByRole("button", { name: /^Dominant/ }).click();
    await page.getByRole("button", { name: "Verder" }).click();
    await expect(page.getByText("Stap 2 van 2", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Start vragen" }).click();

    await expect(page).toHaveURL(/\/profile\/[^/]+\/questions$/, { timeout: 8000 });
    await expect(page.getByTestId("questions-screen")).toBeVisible();
    await expect(page.getByText("Vragenlijst", { exact: true })).toBeVisible();
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
