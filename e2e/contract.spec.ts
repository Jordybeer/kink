import { test, expect } from "@playwright/test";
import { CONTRACT_ALEX_SAM, seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

const URL = "/contract?a=pw-alex-001&b=pw-sam-002";


test.describe("Historische contractrecovery", () => {
  test("opent een encoded legacy contract rechtstreeks na een cold local-store start", async ({ page }) => {
    const seriesId = `legacy-series:${CONTRACT_ALEX_SAM.id}`;
    await seedAndGo(
      page,
      `/contracts/${encodeURIComponent(seriesId)}`,
      [PROFILE_ALEX, PROFILE_SAM],
      { contracts: [CONTRACT_ALEX_SAM] },
    );

    await expect(page.getByText("Contract niet gevonden.", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Alex × Sam" })).toBeVisible();
    await expect(page.getByText(/Versie 1/)).toBeVisible();
  });

  test("toont op een geïmporteerd profiel alleen het nieuwste getekende contract als lokale shortcut", async ({ page }) => {
    const importedSam = { ...PROFILE_SAM, isImported: true, origin: "shared" as const };
    await seedAndGo(
      page,
      `/profile/${importedSam.id}`,
      [PROFILE_ALEX, importedSam],
      { contracts: [CONTRACT_ALEX_SAM] },
    );

    const contract = page.getByRole("link", { name: "Open het meest recente contract met Sam" });
    await expect(contract).toBeVisible();
    await expect(contract).toHaveAttribute(
      "href",
      `/contracts/${encodeURIComponent(`legacy-series:${CONTRACT_ALEX_SAM.id}`)}`,
    );
  });
});

test.describe("Contractpagina", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndGo(page, URL, [PROFILE_ALEX, PROFILE_SAM]);
  });

  test("toont namen van beide profielen", async ({ page }) => {
    await expect(page.getByText("Alex", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Sam", { exact: true }).first()).toBeVisible();
  });

  test("geen horizontale overflow", async ({ page }) => {
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);
  });

  test("geen overflow op mobiel (390px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(URL);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);
  });

  test("handtekeningveld of canvas is aanwezig", async ({ page }) => {
    expect(await page.locator("canvas").count()).toBeGreaterThan(0);
  });

  test("veilig woord sectie is zichtbaar", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/[Ss]afeword|[Vv]eilig woord/);
  });

  test("harde grenzen sectie is aanwezig (humiliation_verbal = no/hard_no)", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/Harde grenzen/);
  });

  test("gedeelde wensen sectie toont matches", async ({ page }) => {
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/[Gg]edeelde|[Ss]panking|[Bb]lindfold/);
  });

  test("lege staat: toont fallback bij geen URL-params", async ({ page }) => {
    await seedAndGo(page, "/contract", [PROFILE_ALEX, PROFILE_SAM]);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/geen|selecteer|profiel/i);
  });

  test("toont één lifecycle-actie en geen losse PDF-bypass", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Contract bewaren of digitaal bevestigen" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Opslaan als PDF/i })).toHaveCount(0);
  });
});

test.describe("Contractpagina — handtekening canvas", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndGo(page, URL, [PROFILE_ALEX, PROFILE_SAM]);
  });

  test("handtekening trigger-knop of canvas is aanwezig per profiel", async ({ page }) => {
    const trigger = page.locator("button[aria-label*='Handtekeningveld'], canvas[aria-label*='Handtekening']");
    expect(await trigger.count()).toBeGreaterThan(0);
  });

  test("wis-knop is aanwezig per handtekening", async ({ page }) => {
    const wisBtn = page.locator("button").filter({ hasText: /[Ww]is/ });
    expect(await wisBtn.count()).toBeGreaterThan(0);
  });
});

const DIRECTIONAL_CONTRACT_A = {
  ...PROFILE_ALEX,
  entries: {
    spanking_hand: { status: "yes", comment: "" },
    pegging_give: { status: "yes", comment: "geven" },
  },
} satisfies typeof PROFILE_ALEX;

const DIRECTIONAL_CONTRACT_B_RECEIVE = {
  ...PROFILE_SAM,
  entries: {
    spanking_hand: { status: "yes", comment: "" },
    pegging_receive: { status: "yes", comment: "ontvangen" },
  },
} satisfies typeof PROFILE_SAM;

const DIRECTIONAL_CONTRACT_B_GIVE = {
  ...PROFILE_SAM,
  entries: {
    spanking_hand: { status: "yes", comment: "" },
    pegging_give: { status: "yes", comment: "ook geven" },
  },
} satisfies typeof PROFILE_SAM;

const DIRECTIONAL_CONTRACT_B_LIMIT = {
  ...PROFILE_SAM,
  entries: {
    spanking_hand: { status: "yes", comment: "" },
    pegging_receive: { status: "hard_no", comment: "grens" },
  },
} satisfies typeof PROFILE_SAM;

test.describe("Contractpagina — directionele pairing", () => {
  test("zet geven tegenover ontvangen in gedeelde verlangens", async ({ page }) => {
    await seedAndGo(page, URL, [DIRECTIONAL_CONTRACT_A, DIRECTIONAL_CONTRACT_B_RECEIVE]);
    const shared = page.getByText("Gedeelde verlangens", { exact: true }).locator("..");
    await expect(shared.getByText("Pegging — geven ↔ ontvangen", { exact: true })).toBeVisible();
  });

  test("behandelt geven plus geven niet als gedeeld verlangen", async ({ page }) => {
    await seedAndGo(page, URL, [DIRECTIONAL_CONTRACT_A, DIRECTIONAL_CONTRACT_B_GIVE]);
    await expect(page.getByText("Pegging — geven ↔ ontvangen", { exact: true })).toHaveCount(0);
  });

  test("plaatst een hard_no op de complementaire ontvangstrichting bij harde grenzen", async ({ page }) => {
    await seedAndGo(page, URL, [DIRECTIONAL_CONTRACT_A, DIRECTIONAL_CONTRACT_B_LIMIT]);
    const limits = page.getByText("Harde grenzen", { exact: true }).locator("..");
    await expect(limits.getByText(/Pegging — geven ↔ ontvangen/)).toBeVisible();
  });
});
