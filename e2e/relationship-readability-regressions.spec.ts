import { expect, test, type Locator, type Page } from "@playwright/test";
import { CONTRACT_SERIES_ALEX_SAM, PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";
import type { ContractSeries } from "@/lib/contractLifecycle";
import type { SceneRecord } from "@/types";

const NAME_A = "Gatinho van de Lange Naam";
const NAME_B = "LaReinaOscuraHeelLang";
const profiles = [{ ...PROFILE_ALEX, name: NAME_A }, { ...PROFILE_SAM, name: NAME_B }];

async function setRootTextScale(page: Page, scale: number) {
  await page.evaluate((scale) => { document.documentElement.style.fontSize = `${scale * 100}%`; }, scale);
  expect(await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize))).toBe(16 * scale);
}

async function expectUnclippedText(locator: Locator) {
  await expect(locator).toBeVisible();
  const measurement = await locator.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const bounds = element.getBoundingClientRect();
    const glyphs = [...range.getClientRects()];
    const containers = [bounds, element.parentElement!.getBoundingClientRect()];
    let clipped = glyphs.some((rect) => containers.some((container) => rect.left < container.left - 1 || rect.right > container.right + 1));
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      const box = ancestor.getBoundingClientRect();
      clipped ||= glyphs.some((rect) =>
        (["hidden", "clip"].includes(style.overflowX) && (rect.left < box.left - 1 || rect.right > box.right + 1))
        || (["hidden", "clip"].includes(style.overflowY) && (rect.top < box.top - 1 || rect.bottom > box.bottom + 1)),
      );
    }
    return {
      text: element.textContent,
      clipped,
    };
  });
  expect(measurement.clipped, `Text must remain readable: ${measurement.text}`).toBe(false);
}

for (const theme of ["light", "dark"] as const) {
for (const { width, textScale } of [{ width: 320, textScale: 1 }, { width: 390, textScale: 1 }, { width: 1280, textScale: 1 }, { width: 320, textScale: 2 }]) {
  const context = `${width}px in ${theme} at ${textScale * 100}% root font`;
  test(`Compare keeps names and roles readable at ${context}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript((theme) => localStorage.setItem("kinksync-color-theme", theme), theme);
    await seedAndGo(page, "/compare?a=pw-alex-001&b=pw-sam-002", profiles);
    await setRootTextScale(page, textScale);
    await page.screenshot({ path: testInfo.outputPath("compare.png") });
    for (const [slot, name] of [["A", NAME_A], ["B", NAME_B]]) {
      const selector = page.getByRole("button", { name: `Kies profiel ${slot}: ${name}` });
      await expectUnclippedText(selector.getByText(name, { exact: true }));
      await expectUnclippedText(selector.getByText(slot === "A" ? "Dominant" : "Submissive", { exact: true }));
      const box = await selector.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await selector.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });

  test(`Contract list keeps both participants readable at ${context}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript((theme) => localStorage.setItem("kinksync-color-theme", theme), theme);
    const participants = CONTRACT_SERIES_ALEX_SAM.participants.map((participant, index) => ({
      ...participant, profileName: index === 0 ? NAME_A : NAME_B,
    })) as ContractSeries["participants"];
    const active: ContractSeries = { ...CONTRACT_SERIES_ALEX_SAM, participants };
    const draft: ContractSeries = { ...active, id: "readability-draft", status: "draft", currentVersionId: undefined, draftVersionId: active.currentVersionId };
    await seedAndGo(page, "/contracts", profiles, { contractSeries: [active, draft] });
    await setRootTextScale(page, textScale);
    await page.getByRole("button", { name: /open concept/ }).click();
    await page.screenshot({ path: testInfo.outputPath("contracts.png") });
    for (const name of [NAME_A, NAME_B]) {
      const labels = page.getByRole("main").getByText(name, { exact: true });
      await expect(labels).toHaveCount(2);
      for (const label of await labels.all()) await expectUnclippedText(label);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });

  test(`Scene list keeps both participants readable at ${context}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript((theme) => localStorage.setItem("kinksync-color-theme", theme), theme);
    await seedAndGo(page, "/scenes", profiles);
    const scene: SceneRecord = {
      id: "readability-scene", title: "Een rustig moment", profileAId: PROFILE_ALEX.id, profileBId: PROFILE_SAM.id,
      profileAName: NAME_A, profileBName: NAME_B, status: "planned", items: [],
      plannedDate: "2026-10-10", createdAt: 1700000002000, updatedAt: 1700000002000,
    };
    await page.evaluate((scene) => {
      const store = JSON.parse(localStorage.getItem("kink-profiles")!);
      store.state.scenes = [scene];
      localStorage.setItem("kink-profiles", JSON.stringify(store));
    }, scene);
    await page.reload();
    await expect(page.getByText(scene.title, { exact: true })).toBeVisible();
    await setRootTextScale(page, textScale);
    await page.screenshot({ path: testInfo.outputPath("scenes.png") });
    for (const name of [NAME_A, NAME_B]) await expectUnclippedText(page.getByRole("main").getByText(name, { exact: true }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}
}
