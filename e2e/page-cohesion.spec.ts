import { test, expect, type Page } from "@playwright/test";
import {
  seedAndGo,
  PROFILE_ALEX,
  PROFILE_SAM,
  CONTRACT_SERIES_ALEX_SAM,
} from "./fixtures";

async function seedScenes(page: Page, count = 1) {
  await page.evaluate((sceneCount: number) => {
    const raw = localStorage.getItem("kink-profiles");
    if (!raw) throw new Error("E2E store ontbreekt");
    const parsed = JSON.parse(raw) as { state: { scenes?: unknown[] } };
    parsed.state.scenes = Array.from({ length: sceneCount }, (_, index) => ({
      id: `cohesion-scene-${index + 1}`,
      title: index === 0 ? "Rustige avond" : "Tweede set",
      profileAId: "pw-alex-001",
      profileBId: "pw-sam-002",
      profileAName: "Alex",
      profileBName: "Sam",
      items: [{
        id: `scene-item-${index + 1}`,
        name: "Spanking (hand)",
        intensity: "zacht",
        duration: "15",
        note: "",
        fromKink: true,
        kinkId: "spanking_hand_give",
      }],
      plannedDate: "2026-08-20",
      plannedTime: "20:00",
      status: "planned",
      createdAt: 1700000003000 + index,
      updatedAt: 1700000003000 + index,
    }));
    localStorage.setItem("kink-profiles", JSON.stringify(parsed));
  }, count);
  await page.reload();
  await page.waitForLoadState("networkidle");
}

test.describe("Page cohesion contracts", () => {
  test("contractdetail gebruikt één back-navigation en één rustige actiegroep", async ({ page }) => {
    await seedAndGo(
      page,
      "/contracts/pw-contract-series-alex-sam",
      [PROFILE_ALEX, PROFILE_SAM],
      { contractSeries: [CONTRACT_SERIES_ALEX_SAM] },
    );

    await expect(page.getByRole("link", { name: "Terug" })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Contracten", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Huidig contract" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Verloop" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Beheren" })).toBeVisible();
  });

  test("contractacties schalen op tablet zonder horizontale overflow", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await seedAndGo(
      page,
      "/contracts/pw-contract-series-alex-sam",
      [PROFILE_ALEX, PROFILE_SAM],
      { contractSeries: [CONTRACT_SERIES_ALEX_SAM] },
    );

    const actions = [
      page.getByRole("link", { name: "Huidig contract" }),
      page.getByRole("link", { name: "Verloop" }),
      page.getByRole("button", { name: "Beheren" }),
    ];
    const boxes = await Promise.all(actions.map((action) => action.boundingBox()));
    expect(boxes.every(Boolean)).toBe(true);
    expect(Math.max(...boxes.map((box) => box!.y)) - Math.min(...boxes.map((box) => box!.y))).toBeLessThan(2);
    expect(await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)).toBe(false);
  });

  test("contracteditor gebruikt TopNav als enige routeheader en schaalt acties mobiel", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAndGo(page, "/contract?a=pw-alex-001&b=pw-sam-002", [PROFILE_ALEX, PROFILE_SAM]);

    await expect(page.getByRole("link", { name: "Terug" })).toHaveCount(1);
    await expect(page.getByText("Teken het contract", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Alex.*Sam/ })).toBeVisible();
    await expect(page.getByText("Stel de afspraken samen; het ondertekende document blijft de formele weergave.", { exact: true })).toBeVisible();

    const pdf = page.getByRole("button", { name: /Opslaan als PDF/ });
    const sign = page.getByRole("button", { name: "Contract bewaren of tekenen" });
    const [pdfBox, signBox] = await Promise.all([pdf.boundingBox(), sign.boundingBox()]);
    expect(pdfBox).not.toBeNull();
    expect(signBox).not.toBeNull();
    expect(signBox!.y).toBeGreaterThan(pdfBox!.y);
    expect(await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)).toBe(false);
  });
});

test.describe("Page cohesion scenes", () => {
  test("delete blijft bereikbaar maar concurreert niet met spelen", async ({ page }) => {
    await seedAndGo(page, "/scenes", [PROFILE_ALEX, PROFILE_SAM]);
    await seedScenes(page);

    await expect(page.getByRole("button", { name: "Spelen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Scène verwijderen" })).toHaveCount(0);

    await page.getByRole("button", { name: "Meer acties voor Rustige avond" }).click();
    await expect(page.getByRole("menuitem", { name: "Scène verwijderen" })).toBeVisible();
  });

  test("scènekaarten benutten desktopbreedte zonder mobile-semantie te veranderen", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await seedAndGo(page, "/scenes", [PROFILE_ALEX, PROFILE_SAM]);
    await seedScenes(page, 2);

    const first = page.getByText("Rustige avond", { exact: true });
    const second = page.getByText("Tweede set", { exact: true });
    const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()]);
    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();
    expect(Math.abs(firstBox!.y - secondBox!.y)).toBeLessThan(4);
    expect(await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)).toBe(false);
  });

  test("contractgate houdt de kern zichtbaar en zet verdieping in disclosure", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 667 });
    await seedAndGo(page, "/scene?a=pw-alex-001&b=pw-sam-002", [PROFILE_ALEX, PROFILE_SAM]);

    await expect(page.getByRole("heading", { name: "Verbond vereist" })).toBeVisible();
    await expect(page.getByText("Voor een scène is een actief bevestigd contract nodig. Kies twee profielen om verder te gaan.", { exact: true })).toBeVisible();
    const why = page.getByRole("button", { name: "Waarom is dit nodig?" });
    await expect(why).toHaveAttribute("aria-expanded", "false");
    await why.click();
    await expect(why).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(/grenzen, verlangens en safewords/i)).toBeVisible();
  });

  test("scene-item beheer verschijnt pas bij details en blijft toegankelijk", async ({ page }) => {
    await seedAndGo(page, "/scenes", [PROFILE_ALEX, PROFILE_SAM]);
    await seedScenes(page);
    await page.goto("/scene?id=cohesion-scene-1");
    await page.waitForLoadState("networkidle");

    const details = page.getByRole("button", { name: "Duur, notitie en beheer" });
    await expect(details).toHaveAttribute("aria-expanded", "false");

    await details.click();
    await expect(page.getByRole("button", { name: "Details verbergen" })).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("button", { name: "Naar boven verplaatsen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Naar beneden verplaatsen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Spanking (hand) verwijderen" })).toBeVisible();
  });
});

test.describe("Page cohesion profile", () => {
  test("query- en legacy-profielroute delen dezelfde actieve profieltab", async ({ page }) => {
    const overviewTab = () => page.getByRole("tablist", { name: "Profielweergave" }).getByRole("tab", { name: "Overzicht" });

    await seedAndGo(page, "/profile?id=pw-alex-001", [PROFILE_ALEX, PROFILE_SAM]);
    await expect(overviewTab()).toHaveAttribute("aria-selected", "true");

    await page.goto("/profile/pw-alex-001");
    await page.waitForLoadState("networkidle");
    await expect(overviewTab()).toHaveAttribute("aria-selected", "true");
  });
});
