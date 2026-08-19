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
});

test("Verloop gebruikt dezelfde profielkeuze als Compare", async ({ page }) => {
  await seedAndGo(page, "/timeline", [PROFILE_ALEX, PROFILE_SAM]);

  await page.getByRole("button", { name: "Kies profiel A" }).click();
  await page.getByRole("button", { name: /Alex, Dominant/ }).click();
  await expect(page.getByRole("button", { name: "Kies profiel A: Alex" })).toBeVisible();

  await page.getByRole("button", { name: "Kies profiel B" }).click();
  await page.getByRole("button", { name: /Sam, Submissive/ }).click();
  await expect(page.getByRole("button", { name: "Kies profiel B: Sam" })).toBeVisible();
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
});
