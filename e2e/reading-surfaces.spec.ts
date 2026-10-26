import { expect, test, type Locator, type Page } from "@playwright/test";
import { KINKS } from "@/lib/kinks";
import type { Profile } from "@/types";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

const TOPIC = "Vulva / pussy worship — being worshipped";
const cases = [
  { name: "status", kink: "vagina_aanbidding_receive", trigger: "Uitleg antwoordkeuzes", dialog: "Uitleg keuzes", close: "Wat betekenen deze keuzes? sluiten" },
  { name: "topic", kink: "vagina_aanbidding_receive", trigger: "Info & uitleg", dialog: `Info en uitleg bij ${TOPIC}`, close: "Info & uitleg sluiten" },
  { name: "safety", kink: "sound_deprivation_give", trigger: "Veiligheid", dialog: "Veiligheid bij Restricting a partner’s hearing", close: "Veiligheid sluiten" },
  { name: "category", kink: "vagina_aanbidding_receive", trigger: "Uitleg over Body Focus & Worship", dialog: "Over Body Focus & Worship", close: "Body Focus & Worship sluiten" },
] as const;

function profileFor(kinkId: string): Profile {
  return {
    ...PROFILE_ALEX,
    id: "pw-reading-surfaces",
    customKinks: [],
    questionnaireSetup: { mode: "deepDive", interests: [], version: 2 },
    entries: Object.fromEntries(KINKS.map((kink) => [kink.id, {
      status: kink.id === kinkId ? null : "maybe",
      score: null,
      comment: "Bestaande context",
      ...(kink.id === kinkId ? { curious: true, privateResponse: true, tags: ["vraag eerst"] } : {}),
    }])),
  };
}

async function entries(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("kink-profiles")!).state.profiles[0].entries);
}

async function expectReadingGeometry(dialog: Locator, close: Locator, page: Page) {
  await expect(dialog.getByTestId("sheet-scroll-body")).toHaveCount(1);
  await expect(dialog.locator("[data-sheet-handle]")).toHaveCount(0);
  await expect(dialog.getByRole("button")).toHaveCount(1);
  const body = dialog.getByTestId("sheet-scroll-body");
  const viewport = page.viewportSize()!;
  // Wait for viewport reconciliation, retaining exact containment/centering below.
  await expect(page.getByTestId("sheet-visual-viewport")).toHaveCSS("height", `${viewport.height}px`);
  for (const target of [dialog, body, ...await dialog.locator("h2, h3, h4, p, li").all()]) {
    expect(await target.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  }
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  if (viewport.width < 640) {
    expect(box.y).toBeLessThanOrEqual(25);
    expect(box.height).toBeGreaterThan(viewport.height * 0.9);
  } else {
    expect(box.width).toBeLessThanOrEqual(576);
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThanOrEqual(1);
  }
  await expect(close).toBeInViewport({ ratio: 1 });
  const before = (await close.boundingBox())!;
  expect(before.width).toBeGreaterThanOrEqual(44);
  expect(before.height).toBeGreaterThanOrEqual(44);
  await body.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(close).toBeInViewport({ ratio: 1 });
  expect((await close.boundingBox())!.y).toBeCloseTo(before.y, 1);
  await body.evaluate((element) => { element.scrollTop = 0; });
}

for (const sample of cases) {
  test(`${sample.name} reading surface keeps close reachable and preserves the question`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    const profile = profileFor(sample.kink);
    await seedAndGo(page, `/profile/${profile.id}/questions`, [profile]);
    const title = await page.getByTestId("question-title").textContent();
    const before = await entries(page);
    const trigger = page.getByRole("button", { name: sample.trigger, exact: true });
    // Exercise a real touch opening in the mobile project, pointer on desktop.
    if (testInfo.project.name === "mobile") await trigger.tap();
    else await trigger.click();
    const dialog = page.getByRole("dialog", { name: sample.dialog, exact: true });
    const close = dialog.getByRole("button", { name: sample.close, exact: true });
    await expect(dialog).toBeVisible();
    if (sample.name === "status") await expect(dialog).toContainText("Een ster is geen ja.");
    if (sample.name === "topic") {
      await expect(dialog.getByRole("heading", { name: TOPIC, exact: true })).toBeVisible();
      await expect(dialog.getByTestId("question-detail-essence")).toHaveText("Je vulva expliciet door een partner laten aanbidden met aandacht, woorden of seksuele handelingen.");
      await expect(dialog).toContainText("Dit is een anatomy-specifieke voorkeur en veronderstelt geen rol of genderidentiteit.");
      await expect(dialog).toContainText("Vulva-aanbidding ontvangen · Vagina-aanbidding ontvangen · Je vulva laten aanbidden");
    }
    if (sample.name === "safety") await expect(dialog).toContainText("Spreek een tastbaar non-verbaal stopsignaal af en behoud omgevingsbewustzijn voor alarmen, verkeer en andere gevaren.");
    if (sample.name === "category") await expect(dialog).toContainText("Ze vult niets voor je in en verandert geen antwoorden.");
    const path = `screenshots/theme-rehearsal/settings-motion/${testInfo.project.name}`;
    await expectReadingGeometry(dialog, close, page);
    await page.screenshot({ path: `${path}/reading-${sample.name}-390.png` });
    await page.setViewportSize({ width: 1280, height: 900 });
    await expectReadingGeometry(dialog, close, page);
    await page.screenshot({ path: `${path}/reading-${sample.name}-desktop.png` });
    await page.setViewportSize({ width: 320, height: 568 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await expectReadingGeometry(dialog, close, page);
    await page.screenshot({ path: `${path}/reading-${sample.name}-320-text-200.png` });
    await close.click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await entries(page)).toEqual(before);
    await expect(page.getByTestId("question-title")).toHaveText(title!);
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    await page.setViewportSize({ width: 390, height: 844 });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await entries(page)).toEqual(before);
    await trigger.click();
    await expect(dialog).toBeVisible();
    // The mobile surface leaves its safe top clearance available to dismiss.
    await page.mouse.click(1, 1);
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await entries(page)).toEqual(before);
    if (sample.name === "category") {
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem("kinksync-questionnaire-category-explainers-v1")!))).toEqual(["body_focus"]);
    }
  });
}
