import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

test.describe("Profielpagina — Alex (gevorderd, Dominant)", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndGo(page, "/profile/pw-alex-001", [PROFILE_ALEX, PROFILE_SAM]);
  });

  test("hero toont naam, rol en ervaringsniveau", async ({ page }) => {
    await expect(page.getByText("Alex", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Dominant").first()).toBeVisible();
  });

  test("vragenlijst kan vanuit het profiel hervat worden", async ({ page }) => {
    const resume = page.getByRole("link", { name: /Verder invullen|Verder ontdekken|Start met vragen/i }).first();
    await expect(resume).toBeVisible();
    await resume.click();
    await expect(page).toHaveURL(/\/profile\/pw-alex-001\/questions$/);
    await expect(page.getByTestId("questions-screen")).toBeVisible();
  });

  test("eerste vraag houdt afspraken en Later boven de mobiele fold", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const emptyAlex = { ...PROFILE_ALEX, entries: {} };
    await seedAndGo(page, "/profile/pw-alex-001/questions", [emptyAlex, PROFILE_SAM]);

    await expect(page.getByTestId("questions-top-progress")).toBeVisible();
    await expect(page.getByRole("button", { name: "Uitleg over antwoordkeuzes" })).toBeVisible();

    const controls = [
      page.getByRole("button", { name: "Eerst vragen" }),
      page.getByRole("button", { name: "Eerste keer" }),
      page.getByRole("button", { name: /Later/ }),
    ];

    for (const width of [390, 375]) {
      await page.setViewportSize({ width, height: 844 });
      const viewportHeight = await page.evaluate(() => window.innerHeight);

      for (const control of controls) {
        await expect(control).toBeVisible();
        const box = await control.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewportHeight);
      }
    }
  });

  test("vragenpagina toont alleen de drie vraagmodi", async ({ page }) => {
    await page.goto("/profile/pw-alex-001/questions");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: "Dynamic" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Discover" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Deep Dive" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Categorie/i })).toHaveCount(0);
  });

  test("opgeslagen Deep Dive blijft actief na hydration", async ({ page }) => {
    const deepAlex = {
      ...PROFILE_ALEX,
      entries: {},
      questionnaireSetup: { mode: "deepDive" as const, interests: [], version: 2 as const },
    };
    await seedAndGo(page, "/profile/pw-alex-001/questions", [deepAlex, PROFILE_SAM]);

    await expect(page.getByRole("button", { name: "Deep Dive" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Dynamic" })).toHaveAttribute("aria-pressed", "false");
  });

  test("statusbalk is aanwezig op het bewerken-tabblad", async ({ page }) => {
    await page.getByRole("tab", { name: "Bewerken" }).click();
    await expect(page.getByRole("img", { name: /Heel graag/ })).toBeVisible();
  });

  test("ingevulde kinks tellen mee — teller zichtbaar", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/\d+\s*BEOORDEELD|\d+\s*beoordeeld/i);
  });

  test("geen sterren (★) zichtbaar op de pagina", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).not.toContain("★");
  });

  test("geen horizontale overflow", async ({ page }) => {
    // De tab glijdt 8px binnen — poll tot de entrance-animatie is uitgehijgd
    await expect
      .poll(() => page.evaluate(() => document.body.scrollWidth > document.body.clientWidth), { timeout: 3000 })
      .toBe(false);
  });

  test("geen overflow op mobiel (390px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/profile/pw-alex-001");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);
  });

  test("Impact Play categorie is zichtbaar in de bewerkmodus", async ({ page }) => {
    await page.getByRole("tab", { name: "Bewerken" }).click();
    await expect(page.getByText("Impact Play", { exact: true }).first()).toBeVisible();
  });

  test("gesloten categorieën zijn inert tot ze geopend worden", async ({ page }) => {
    await page.getByRole("tab", { name: "Bewerken" }).click();
    const content = page.locator("#category-impact-content");

    await expect(content).toHaveAttribute("aria-hidden", "true");
    await expect.poll(() => content.evaluate((element) => (element as HTMLElement).inert)).toBe(true);

    await page.locator('button[aria-controls="category-impact-content"]').click();
    await expect(content).toHaveAttribute("aria-hidden", "false");
    await expect.poll(() => content.evaluate((element) => (element as HTMLElement).inert)).toBe(false);
    await expect(content.locator('button[aria-label*="— bewerken"]').first()).toBeVisible();
  });

  test("tabblad 'Bewerken' is een cataloguseditor zonder ingebouwde vragenkaart", async ({ page }) => {
    const editTab = page.getByRole("tab", { name: "Bewerken" });
    await editTab.click();

    await expect(page.getByPlaceholder("Zoek in de volledige catalogus…")).toBeVisible();
    await expect(page.getByRole("button", { name: /Alle categorieën/ })).toBeVisible();
    await expect(page.getByRole("group", { name: "Status kiezen" })).toHaveCount(0);
  });

  test("categoriefilter blijft zichtbaar en wijzigbaar tijdens zoeken", async ({ page }) => {
    await page.getByRole("tab", { name: "Bewerken" }).click();
    await page.getByRole("button", { name: /Alle categorieën/ }).click();

    const categoryDialog = page.getByRole("dialog", { name: "Categorie kiezen" });
    await expect(categoryDialog).toBeVisible();
    await categoryDialog.getByRole("button", { name: /^Bondage\b/ }).click();

    const activeFilter = page.getByRole("button", { name: /^Bondage\b/ }).first();
    await expect(activeFilter).toBeVisible();
    const search = page.getByPlaceholder("Zoek in Bondage…");
    await search.fill("spanking");

    await expect(activeFilter).toBeVisible();
    await expect(page.getByText("0 resultaten", { exact: true })).toBeVisible();
    await expect(page.getByText("Geen onderwerpen gevonden.")).toBeVisible();

    await page.getByRole("button", { name: "Filter Bondage wissen" }).click();
    await expect(page.getByPlaceholder("Zoek in de volledige catalogus…")).toHaveValue("spanking");
    await expect(page.getByText(/^[1-9]\d* resultaten$/)).toBeVisible();
    await expect(page.locator('button[aria-label*="— bewerken"]').first()).toBeVisible();
  });

  test("kink-status instellen via de cataloguseditor", async ({ page }) => {
    const emptyAlex = { ...PROFILE_ALEX, entries: {} };
    await seedAndGo(page, "/profile/pw-alex-001", [emptyAlex]);

    const editTab = page.getByRole("tab", { name: "Bewerken" });
    if (await editTab.count() > 0) await editTab.first().click();

    const search = page.getByPlaceholder("Zoek in de volledige catalogus…");
    await search.fill("spanking");

    const result = page.locator('button[aria-label*=", nog niet beoordeeld"][aria-label*="— bewerken"]').first();
    await expect(result).toBeVisible();
    await result.click();

    const statusGroup = page.getByRole("group", { name: "Status kiezen" });
    await expect(statusGroup).toBeVisible();
    await statusGroup.getByRole("button", { name: /Heel graag/ }).click();
    await page.getByRole("button", { name: "Klaar" }).click();

    await expect(page.locator('button[aria-label*=", Heel graag — bewerken"]').first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Gesplitste spotlight-rondleiding", () => {
  test("profielintro en vragenrondleiding onthouden hun eigen voltooiing", async ({ page }) => {
    const emptyAlex = { ...PROFILE_ALEX, entries: {} };
    await seedAndGo(page, "/profile/pw-alex-001", [emptyAlex], { profileTourComplete: false });

    const profileTour = page.getByRole("dialog", { name: "Maak het profiel herkenbaar" });
    await expect(profileTour).toBeVisible({ timeout: 3000 });
    await profileTour.getByRole("button", { name: "Begrepen" }).click();

    await expect.poll(() => page.evaluate(() => {
      const raw = localStorage.getItem("kinksync-split-tours-v2");
      return raw ? JSON.parse(raw).state?.profileIntroTourSeen === true : false;
    })).toBe(true);
    expect(await page.evaluate(() => {
      const raw = localStorage.getItem("kinksync-split-tours-v2");
      return raw ? JSON.parse(raw).state?.questionnaireTourSeen === true : false;
    })).toBe(false);

    await page.getByRole("link", { name: /Start met vragen|Verder invullen|Verder ontdekken/i }).click();
    await expect(page).toHaveURL(/\/profile\/pw-alex-001\/questions$/);

    const questionTour = page.getByRole("dialog", { name: "Beoordeel de volledige kink" });
    await expect(questionTour).toBeVisible({ timeout: 3000 });
    await questionTour.getByRole("button", { name: "Sla over" }).click();

    await expect.poll(() => page.evaluate(() => {
      const raw = localStorage.getItem("kinksync-split-tours-v2");
      return raw ? JSON.parse(raw).state?.questionnaireTourSeen === true : false;
    })).toBe(true);
    await expect.poll(() => page.evaluate(() => {
      const raw = localStorage.getItem("kink-profiles");
      if (!raw) return false;
      return JSON.parse(raw).state?.profileTourComplete === true;
    })).toBe(true);
  });
});

test.describe("Profielpagina — Sam (gevorderd, Submissive)", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndGo(page, "/profile/pw-sam-002", [PROFILE_ALEX, PROFILE_SAM]);
  });

  test("toont Sam als naam", async ({ page }) => {
    await expect(page.getByText("Sam", { exact: true }).first()).toBeVisible();
  });

  test("toont Submissive als rol", async ({ page }) => {
    await expect(page.getByText("Submissive").first()).toBeVisible();
  });

  test("teller toont ingevulde kinks", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/\d+\s*BEOORDEELD|\d+\s*beoordeeld/i);
  });

  test("hard grens (humiliation_verbal) is verwerkt in de statusbalk", async ({ page }) => {
    await page.getByRole("tab", { name: "Bewerken" }).click();
    await expect(page.getByRole("img", { name: /\d+ Harde grens/ })).toBeVisible();
  });
});
