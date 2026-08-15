import { expect, test } from "@playwright/test";
import { KINKS } from "@/lib/kinks";
import type { Profile } from "@/types";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

const SAFETY_COPY = "Spreek een tastbaar non-verbaal stopsignaal af en behoud omgevingsbewustzijn voor alarmen, verkeer en andere gevaren.";
const SAFETY_PROFILE: Profile = {
  ...PROFILE_ALEX,
  id: "pw-safety-003",
  name: "Safety",
  customKinks: [],
  questionnaireSetup: { mode: "deepDive", interests: [], version: 2 },
  entries: Object.fromEntries(
    KINKS
      .filter((kink) => kink.id !== "sound_deprivation_give")
      .map((kink) => [kink.id, { status: "maybe" as const, score: null, comment: "" }]),
  ),
};

test("questionnaire focus hands off to the dedicated questions route", async ({ page }) => {
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}?focus=questionnaire`, [PROFILE_ALEX]);

  await expect(page).toHaveURL(new RegExp(`/profile/${PROFILE_ALEX.id}/questions$`));
  await expect(page.getByTestId("questions-screen")).toBeVisible();
  const nav = page.getByLabel("Hoofdnavigatie");
  await expect(nav.getByText("Vragenlijst", { exact: true })).toBeVisible();
  await expect(nav).toContainText("Vragenlijst · Dynamic");
  await expect(page.getByRole("group", { name: "Status kiezen" })).toBeVisible();
});

test("answered question persists across a reload without document-width overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}/questions`, [PROFILE_ALEX]);

  const nav = page.getByLabel("Hoofdnavigatie");
  const cardTitle = page.locator('[data-tour="kink-card"] h3');
  const firstQuestion = await cardTitle.innerText();
  await page.getByRole("button", { name: /Heel graag/i }).click();
  await expect(cardTitle).not.toHaveText(firstQuestion);
  await expect(nav).toContainText("Vragenlijst · Dynamic");
  await expect(nav.getByText("Opgeslagen ✓", { exact: true })).toHaveCount(0);

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("questions-screen")).toBeVisible();
  await expect(cardTitle).not.toHaveText(firstQuestion);
  await expect(nav).toContainText("Vragenlijst · Dynamic");

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasHorizontalOverflow).toBe(false);
});

test("question change keeps a stable visual shell without a full-content fade", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}/questions`, [PROFILE_ALEX]);

  const card = page.locator('[data-tour="kink-card"]');
  const content = card.getByTestId("question-content");
  const title = card.locator("h3");
  const firstQuestion = await title.innerText();
  const progressFill = page.getByTestId("questions-top-progress-fill");
  const eagerAnswer = card.getByRole("button", { name: /Heel graag/i });
  const eagerHint = eagerAnswer.getByText("zoek ik actief op", { exact: true });

  await expect(content).toBeVisible();
  await expect(content).toHaveCSS("opacity", "1");
  await expect(progressFill).toHaveCSS("transition-duration", "0s");
  const hintBefore = await eagerHint.boundingBox();
  expect(hintBefore).not.toBeNull();
  await content.evaluate((node) => {
    (window as typeof window & { __questionContentNode?: Element }).__questionContentNode = node;
  });

  await eagerAnswer.click();
  await page.waitForTimeout(40);
  await expect(content).toHaveCSS("opacity", "1");
  const hintAfterSelection = await eagerHint.boundingBox();
  expect(hintAfterSelection).not.toBeNull();
  expect(Math.abs(hintAfterSelection!.x - hintBefore!.x)).toBeLessThanOrEqual(1);

  for (const delay of [80, 100]) {
    await page.waitForTimeout(delay);
    await expect(content).toHaveCSS("opacity", "1");
  }

  await expect(title).not.toHaveText(firstQuestion);
  const contentNodeStayedMounted = await content.evaluate((node) =>
    (window as typeof window & { __questionContentNode?: Element }).__questionContentNode === node,
  );
  expect(contentNodeStayedMounted).toBe(true);
  await expect(content).toHaveCSS("opacity", "1");
  await expect(progressFill).toHaveCSS("transition-duration", "0s");
});

test("question card keeps its primary controls inside an iPhone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}/questions`, [PROFILE_ALEX]);

  const nav = page.getByLabel("Hoofdnavigatie");
  const card = page.locator('[data-tour="kink-card"]');
  await expect(card).toBeVisible();
  await expect(card.getByTestId("question-category-meta")).toBeVisible();
  await expect(card.locator("h3")).toBeVisible();
  await expect(card.getByRole("button", { name: "Markeer als nieuwsgierig" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Antwoord verbergen" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Eerst vragen" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Eerste keer" })).toBeVisible();
  await expect(card.getByText("optioneel", { exact: true })).toBeVisible();
  await expect(card.getByTestId("question-progress")).toBeVisible();

  const statusButtons = card.getByRole("group", { name: "Status kiezen" }).locator("button");
  await expect(statusButtons).toHaveCount(5);
  await expect(card.getByRole("button", { name: /Heel graag/ })).toBeVisible();
  await expect(card.getByRole("button", { name: /^Ja/ })).toBeVisible();
  await expect(card.getByRole("button", { name: /Misschien/ })).toBeVisible();
  await expect(card.getByRole("button", { name: /Voor hen/ })).toBeVisible();
  await expect(card.getByRole("button", { name: /Harde grens/ })).toBeVisible();
  const firstStatusBox = await statusButtons.nth(0).boundingBox();
  const lastStatusBox = await statusButtons.nth(4).boundingBox();
  expect(firstStatusBox).not.toBeNull();
  expect(lastStatusBox).not.toBeNull();
  expect(Math.abs(firstStatusBox!.x - lastStatusBox!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(firstStatusBox!.width - lastStatusBox!.width)).toBeLessThanOrEqual(1);

  const navBox = await nav.boundingBox();
  const cardBox = await card.boundingBox();
  const visibleHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
  expect(navBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  const topGap = cardBox!.y - (navBox!.y + navBox!.height);
  const bottomGap = visibleHeight - (cardBox!.y + cardBox!.height);
  expect(topGap).toBeGreaterThanOrEqual(14);
  expect(bottomGap).toBeGreaterThanOrEqual(12);
  expect(Math.abs(topGap - bottomGap)).toBeLessThanOrEqual(24);

  const later = card.getByRole("button", { name: /Later/ });
  await expect(later).toBeVisible();
  const laterBox = await later.boundingBox();
  expect(laterBox).not.toBeNull();
  expect(laterBox!.y + laterBox!.height).toBeLessThanOrEqual(visibleHeight + 1);

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasHorizontalOverflow).toBe(false);
});

test("safety guidance stays compact until the user opens it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${SAFETY_PROFILE.id}/questions`, [SAFETY_PROFILE]);

  const card = page.locator('[data-tour="kink-card"]');
  await expect(card.getByRole("heading", { name: "Sound deprivation — applying" })).toBeVisible();
  await expect(card.getByText(SAFETY_COPY, { exact: true })).toHaveCount(0);

  const disclosure = card.getByTestId("safety-disclosure");
  await expect(disclosure).toBeVisible();
  await expect(disclosure).toContainText("Veiligheid");
  const disclosureBox = await disclosure.boundingBox();
  expect(disclosureBox).not.toBeNull();
  expect(disclosureBox!.height).toBeLessThanOrEqual(48);

  await disclosure.click();
  const dialog = page.getByRole("dialog", { name: "Veiligheid bij Sound deprivation — applying" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(SAFETY_COPY, { exact: true })).toBeVisible();

  const visibleHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
  await expect.poll(async () => {
    const box = await dialog.boundingBox();
    return box ? box.y + box.height : Number.POSITIVE_INFINITY;
  }).toBeLessThanOrEqual(visibleHeight + 1);
  const settledDialogBox = await dialog.boundingBox();
  expect(settledDialogBox).not.toBeNull();
  expect(settledDialogBox!.y).toBeGreaterThanOrEqual(-1);

  await dialog.getByRole("button", { name: "Sluit" }).click();
  await expect(dialog).toBeHidden();
});

test("questionnaire help stays inside a short visual viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 480 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}/questions`, [PROFILE_ALEX]);

  const nav = page.getByLabel("Hoofdnavigatie");
  await nav.getByRole("button", { name: "Uitleg antwoordkeuzes" }).click();

  const dialog = page.getByRole("dialog", { name: "Uitleg keuzes" });
  await expect(dialog).toBeVisible();
  const visibleHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
  await expect.poll(async () => {
    const box = await dialog.boundingBox();
    return box ? box.y + box.height : Number.POSITIVE_INFINITY;
  }).toBeLessThanOrEqual(visibleHeight + 1);
  const settledDialogBox = await dialog.boundingBox();
  expect(settledDialogBox).not.toBeNull();
  expect(settledDialogBox!.y).toBeGreaterThanOrEqual(-1);

  await dialog.getByRole("button", { name: "Sluit" }).click();
  await expect(dialog).toBeHidden();
});

test("questionnaire modes live in the context menu and floating details fit a short browser viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 480 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}/questions`, [PROFILE_ALEX]);

  const nav = page.getByLabel("Hoofdnavigatie");
  await expect(nav).toContainText("Vragenlijst · Dynamic");
  await expect(page.getByRole("button", { name: "Dynamic", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Discover", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Deep Dive", exact: true })).toHaveCount(0);

  await nav.getByRole("button", { name: "Meer acties" }).click();
  await expect(page.getByRole("menuitemradio", { name: "Dynamic" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("menuitemradio", { name: "Discover" })).toBeVisible();
  await expect(page.getByRole("menuitemradio", { name: "Deep Dive" })).toBeVisible();
  await page.keyboard.press("Escape");

  const card = page.locator('[data-tour="kink-card"]');
  await expect(card.getByRole("button", { name: "Lees meer" })).toHaveCount(0);
  const detailTrigger = card.locator("[data-clamp-trigger]").first();
  await expect(detailTrigger).toBeVisible();
  await detailTrigger.click();

  const overlay = card.locator("[data-clamp-overlay]").first();
  await expect(overlay).toBeVisible();
  const overlayBox = await overlay.boundingBox();
  const visibleHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
  expect(overlayBox).not.toBeNull();
  expect(overlayBox!.y).toBeGreaterThanOrEqual(-1);
  expect(overlayBox!.y + overlayBox!.height).toBeLessThanOrEqual(visibleHeight + 1);

  await overlay.click();
  await expect(overlay).toBeHidden();
  await expect(page.getByRole("group", { name: "Status kiezen" })).toBeVisible();
});
