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
    KINKS.filter((kink) => kink.id !== "sound_deprivation_give").map((kink) => [kink.id, { status: "maybe" as const, score: null, comment: "" }]),
  ),
};

async function stableControlGeometry(page: import("@playwright/test").Page) {
  const card = page.locator('[data-tour="kink-card"]');
  const names = [/Heel graag/i, /^Ja/, /Misschien/, /Voor hen/, /Harde grens/, /Eerst vragen/, /Eerste keer/, /Later/];
  return Promise.all(names.map(async (name) => {
    const box = await card.getByRole("button", { name }).boundingBox();
    expect(box).not.toBeNull();
    return { y: box!.y, height: box!.height };
  }));
}

function expectSameGeometry(before: { y: number; height: number }[], after: { y: number; height: number }[]) {
  expect(after).toHaveLength(before.length);
  for (let index = 0; index < before.length; index += 1) {
    expect(Math.abs(after[index].y - before[index].y)).toBeLessThanOrEqual(1);
    expect(Math.abs(after[index].height - before[index].height)).toBeLessThanOrEqual(1);
  }
}

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
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("questions-screen")).toBeVisible();
  await expect(cardTitle).not.toHaveText(firstQuestion);
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
  await expect(content).toHaveCSS("opacity", "1");
  await expect(progressFill).toHaveCSS("transition-duration", "0s");
  await content.evaluate((node) => { (window as typeof window & { __questionContentNode?: Element }).__questionContentNode = node; });
  await card.getByRole("button", { name: /Heel graag/i }).click();
  await page.waitForTimeout(40);
  await expect(content).toHaveCSS("opacity", "1");
  await expect(title).not.toHaveText(firstQuestion);
  const contentNodeStayedMounted = await content.evaluate((node) => (window as typeof window & { __questionContentNode?: Element }).__questionContentNode === node);
  expect(contentNodeStayedMounted).toBe(true);
});

test("questionnaire keeps repeated controls geometrically fixed across dynamic content", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}/questions`, [PROFILE_ALEX]);
  const card = page.locator('[data-tour="kink-card"]');
  const before = await stableControlGeometry(page);
  const cardBefore = await card.boundingBox();
  const essenceBefore = await card.getByTestId("question-essence").boundingBox();
  expect(cardBefore).not.toBeNull();
  expect(essenceBefore).not.toBeNull();
  expect(essenceBefore!.height).toBeLessThanOrEqual(41);

  await card.getByRole("button", { name: /Heel graag/i }).click();
  await expect(card.getByTestId("question-title")).not.toHaveText(await card.getByTestId("question-title").innerText());
  await page.waitForTimeout(240);
  const after = await stableControlGeometry(page);
  const cardAfter = await card.boundingBox();
  expect(cardAfter).not.toBeNull();
  expect(Math.abs(cardAfter!.height - cardBefore!.height)).toBeLessThanOrEqual(1);
  expectSameGeometry(before, after);
});

test("detail layer leaves the question canvas untouched when opened and closed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}/questions`, [PROFILE_ALEX]);
  const card = page.locator('[data-tour="kink-card"]');
  const details = card.getByRole("button", { name: /Uitleg & voorbeelden/ });
  await expect(details).toBeVisible();
  const before = await stableControlGeometry(page);
  const titleBefore = await card.getByTestId("question-title").innerText();

  await details.click();
  const dialog = page.getByRole("dialog", { name: new RegExp(`Uitleg en voorbeelden bij ${titleBefore.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Sluit" }).click();
  await expect(dialog).toBeHidden();
  await expect(card.getByTestId("question-title")).toHaveText(titleBefore);
  const after = await stableControlGeometry(page);
  expectSameGeometry(before, after);
});

test("category explainer teaches context without changing answers", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}/questions`, [PROFILE_ALEX]);
  const card = page.locator('[data-tour="kink-card"]');
  const category = card.getByTestId("question-category-meta");
  const before = await stableControlGeometry(page);
  await category.click();
  const dialog = page.getByRole("dialog", { name: /Over / });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("vult niets voor je in");
  await dialog.getByRole("button", { name: "Begrepen" }).click();
  const after = await stableControlGeometry(page);
  expectSameGeometry(before, after);
});

test("question card keeps its primary controls inside an iPhone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}/questions`, [PROFILE_ALEX]);
  const card = page.locator('[data-tour="kink-card"]');
  await expect(card).toBeVisible();
  await expect(card.getByTestId("question-category-meta")).toBeVisible();
  await expect(card.getByTestId("question-title")).toBeVisible();
  await expect(card.getByTestId("question-essence")).toBeVisible();
  await expect(card.getByRole("button", { name: "Markeer als nieuwsgierig" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Antwoord verbergen" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Eerst vragen" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Eerste keer" })).toBeVisible();
  await expect(card.getByText("optioneel", { exact: true })).toBeVisible();
  await expect(card.getByTestId("question-progress")).toBeVisible();
  const statusButtons = card.getByRole("group", { name: "Status kiezen" }).locator("button");
  await expect(statusButtons).toHaveCount(5);
  const visibleHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
  const laterBox = await card.getByRole("button", { name: /Later/ }).boundingBox();
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
  await disclosure.click();
  const dialog = page.getByRole("dialog", { name: "Veiligheid bij Sound deprivation — applying" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(SAFETY_COPY, { exact: true })).toBeVisible();
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
  await expect.poll(async () => { const box = await dialog.boundingBox(); return box ? box.y + box.height : Number.POSITIVE_INFINITY; }).toBeLessThanOrEqual(visibleHeight + 1);
  await dialog.getByRole("button", { name: "Sluit" }).click();
});

test("questionnaire modes live in the context menu", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 480 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}/questions`, [PROFILE_ALEX]);
  const nav = page.getByLabel("Hoofdnavigatie");
  await expect(nav).toContainText("Vragenlijst · Dynamic");
  await nav.getByRole("button", { name: "Meer acties" }).click();
  await expect(page.getByRole("menuitemradio", { name: "Dynamic" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("menuitemradio", { name: "Discover" })).toBeVisible();
  await expect(page.getByRole("menuitemradio", { name: "Deep Dive" })).toBeVisible();
});
