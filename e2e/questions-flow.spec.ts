import { expect, test } from "@playwright/test";
import { KINKS } from "@/lib/kinks";
import type { Profile } from "@/types";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

const SAFETY_COPY = "Spreek een tastbaar non-verbaal stopsignaal af en behoud omgevingsbewustzijn voor alarmen, verkeer en andere gevaren.";
const CUCKOLDING_ESSENCE = "Een afgesproken scenario waarin jij weet of ziet dat je partner seks heeft met een instemmende derde.";

function profileWithQuestions(id: string, name: string, kinkIds: string[]): Profile {
  const unanswered = new Set(kinkIds);
  return {
    ...PROFILE_ALEX,
    id,
    name,
    customKinks: [],
    questionnaireSetup: { mode: "deepDive", interests: [], version: 2 },
    entries: Object.fromEntries(
      KINKS.filter((kink) => !unanswered.has(kink.id)).map((kink) => [kink.id, { status: "maybe" as const, score: null, comment: "" }]),
    ),
  };
}

function profileWithOnlyQuestion(id: string, name: string, kinkId: string): Profile {
  return profileWithQuestions(id, name, [kinkId]);
}

const SAFETY_PROFILE = profileWithOnlyQuestion("pw-safety-003", "Safety", "sound_deprivation_give");
const CUCKOLDING_PROFILE = profileWithOnlyQuestion("pw-cuckolding-004", "Cuckolding", "cuckolding");
const SIMPLE_PROFILE = profileWithOnlyQuestion("pw-simple-005", "Simple", "orgasm_control");
const SELECTION_PROFILE = profileWithQuestions("pw-selection-006", "Selection", ["spanking_hand_give", "spanking_hand_receive"]);
const LONG_TITLE_PROFILE = profileWithOnlyQuestion("pw-long-title-007", "Long title", "spanking_implement_give");

async function stableControlGeometry(page: import("@playwright/test").Page) {
  const card = page.locator('[data-tour="kink-card"]');
  const names = [/Heel graag/i, /^Ja/, /Misschien/, /Voor hen/, /Harde grens/, /Eerst vragen/, /Eerste keer/, /Later/];
  return Promise.all(names.map(async (name) => {
    const box = await card.getByRole("button", { name }).boundingBox();
    expect(box).not.toBeNull();
    return { y: box!.y, height: box!.height };
  }));
}

async function statusHintRightEdges(page: import("@playwright/test").Page) {
  return page.locator("[data-status-hint]").evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().right));
}

function expectSameGeometry(before: { y: number; height: number }[], after: { y: number; height: number }[]) {
  expect(after).toHaveLength(before.length);
  for (let index = 0; index < before.length; index += 1) {
    expect(Math.abs(after[index].y - before[index].y)).toBeLessThanOrEqual(1);
    expect(Math.abs(after[index].height - before[index].height)).toBeLessThanOrEqual(1);
  }
}

function expectAlignedRightEdges(edges: number[]) {
  expect(edges).toHaveLength(5);
  expect(Math.max(...edges) - Math.min(...edges)).toBeLessThanOrEqual(1);
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

test("questions route locks the document while sheets keep their own scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${CUCKOLDING_PROFILE.id}/questions`, [CUCKOLDING_PROFILE]);

  const locked = await page.evaluate(() => ({
    rootOverflow: document.documentElement.style.overflow,
    rootOverscroll: document.documentElement.style.overscrollBehavior,
    rootHeight: document.documentElement.style.height,
    bodyOverflow: document.body.style.overflow,
    bodyOverscroll: document.body.style.overscrollBehavior,
    bodyPosition: document.body.style.position,
    bodyInset: document.body.style.inset,
  }));
  expect(locked).toEqual({
    rootOverflow: "hidden",
    rootOverscroll: "none",
    rootHeight: "100%",
    bodyOverflow: "hidden",
    bodyOverscroll: "none",
    bodyPosition: "fixed",
    bodyInset: "0px",
  });

  await page.evaluate(() => window.scrollTo(0, 240));
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  const card = page.locator('[data-tour="kink-card"]');
  await card.getByRole("button", { name: /Info & uitleg/ }).click();
  const dialog = page.getByRole("dialog", { name: "Info en uitleg bij Cuckolding" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("touch-action", "auto");
  const sheetContent = dialog.locator(":scope > div").first();
  await expect(sheetContent).toHaveCSS("overflow-y", "auto");
  await dialog.getByRole("button", { name: "Sluit" }).click();

  await page.getByRole("link", { name: "Terug" }).click();
  await expect(page).toHaveURL(new RegExp(`/profile/${CUCKOLDING_PROFILE.id}$`));
  expect(await page.evaluate(() => ({
    rootOverflow: document.documentElement.style.overflow,
    rootHeight: document.documentElement.style.height,
    bodyOverflow: document.body.style.overflow,
    bodyPosition: document.body.style.position,
  }))).toEqual({ rootOverflow: "", rootHeight: "", bodyOverflow: "", bodyPosition: "" });
});

test("questionnaire width stays intimate in portrait and grows on landscape and tablet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${SELECTION_PROFILE.id}/questions`, [SELECTION_PROFILE]);
  const card = page.locator('[data-tour="kink-card"]');

  const portrait = await card.boundingBox();
  expect(portrait).not.toBeNull();
  expect(portrait!.width).toBeLessThanOrEqual(370);

  await page.setViewportSize({ width: 844, height: 390 });
  const landscape = await card.boundingBox();
  expect(landscape).not.toBeNull();
  expect(landscape!.width).toBeGreaterThanOrEqual(700);

  await page.setViewportSize({ width: 1024, height: 768 });
  const tablet = await card.boundingBox();
  expect(tablet).not.toBeNull();
  expect(tablet!.width).toBeGreaterThanOrEqual(820);
  expect(tablet!.width).toBeLessThanOrEqual(900);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
});

test("answered question persists across a reload without document-width overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}/questions`, [PROFILE_ALEX]);
  const nav = page.getByLabel("Hoofdnavigatie");
  const cardTitle = page.locator('[data-tour="kink-card"] h2');
  const firstQuestion = await cardTitle.innerText();
  await page.getByRole("button", { name: /Heel graag/i }).click();
  await expect(cardTitle).not.toHaveText(firstQuestion);
  await expect(nav).toContainText("Vragenlijst · Dynamic");
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("questions-screen")).toBeVisible();
  await expect(cardTitle).not.toHaveText(firstQuestion);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
});

test("question change keeps a stable visual shell without a full-content fade", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}/questions`, [PROFILE_ALEX]);
  const card = page.locator('[data-tour="kink-card"]');
  const content = card.getByTestId("question-content");
  const title = card.locator("h2");
  const firstQuestion = await title.innerText();
  const progressFill = page.getByTestId("questions-top-progress-fill");
  await expect(content).toHaveCSS("opacity", "1");
  await expect(progressFill).toHaveCSS("transition-duration", "0s");
  await content.evaluate((node) => { (window as typeof window & { __questionContentNode?: Element }).__questionContentNode = node; });
  await card.getByRole("button", { name: /Heel graag/i }).click();
  await page.waitForTimeout(40);
  await expect(content).toHaveCSS("opacity", "1");
  await expect(title).not.toHaveText(firstQuestion);
  expect(await content.evaluate((node) => (window as typeof window & { __questionContentNode?: Element }).__questionContentNode === node)).toBe(true);
});

test("questionnaire keeps repeated controls geometrically fixed across dynamic content", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}/questions`, [PROFILE_ALEX]);
  const card = page.locator('[data-tour="kink-card"]');
  const title = card.getByTestId("question-title");
  const firstTitle = await title.innerText();
  const before = await stableControlGeometry(page);
  const cardBefore = await card.boundingBox();
  const essenceBefore = await card.getByTestId("question-essence").boundingBox();
  expect(cardBefore).not.toBeNull();
  expect(essenceBefore).not.toBeNull();
  expect(essenceBefore!.height).toBeLessThanOrEqual(49);

  await card.getByRole("button", { name: /Heel graag/i }).click();
  await expect(title).not.toHaveText(firstTitle);
  const after = await stableControlGeometry(page);
  const cardAfter = await card.boundingBox();
  expect(cardAfter).not.toBeNull();
  expect(Math.abs(cardAfter!.height - cardBefore!.height)).toBeLessThanOrEqual(1);
  expectSameGeometry(before, after);
});

test("long questionnaire titles fit their fixed slot without borrowing from agreements", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${LONG_TITLE_PROFILE.id}/questions`, [LONG_TITLE_PROFILE]);
  const card = page.locator('[data-tour="kink-card"]');
  const title = card.getByTestId("question-title");
  const titleSlot = card.getByTestId("question-title-slot");
  await expect(title).toHaveText("Spanking a partner (with an implement)");
  const titleMetrics = await title.evaluate((node) => ({ clientHeight: node.clientHeight, scrollHeight: node.scrollHeight }));
  const slotBox = await titleSlot.boundingBox();
  const agreementsBox = await card.getByTestId("question-agreements-label").boundingBox();
  expect(slotBox && agreementsBox).toBeTruthy();
  expect(titleMetrics.scrollHeight).toBeLessThanOrEqual(titleMetrics.clientHeight + 1);
  expect(slotBox!.y + slotBox!.height).toBeLessThan(agreementsBox!.y);
});

test("cuckolding keeps the exact visible essence when depth opens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${CUCKOLDING_PROFILE.id}/questions`, [CUCKOLDING_PROFILE]);
  const card = page.locator('[data-tour="kink-card"]');
  await expect(card.getByRole("heading", { name: "Cuckolding" })).toBeVisible();
  await expect(card.getByTestId("question-essence")).toHaveText(CUCKOLDING_ESSENCE);
  const details = card.getByRole("button", { name: /Info & uitleg/ });
  await expect(details).toBeVisible();
  const before = await stableControlGeometry(page);

  await details.click();
  const dialog = page.getByRole("dialog", { name: "Info en uitleg bij Cuckolding" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("question-detail-essence")).toHaveText(CUCKOLDING_ESSENCE);
  await expect(dialog).toContainText("De specifieke cuckolding-dynamiek wordt daarbij expliciet benoemd.");
  await expect(dialog).toContainText("Cuckolding / hotwifing");
  await dialog.getByRole("button", { name: "Sluit" }).click();
  await expect(dialog).toBeHidden();
  await expect(card.getByRole("heading", { name: "Cuckolding" })).toBeVisible();
  expectSameGeometry(before, await stableControlGeometry(page));
});

test("simple questionnaire copy does not manufacture an info disclosure", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${SIMPLE_PROFILE.id}/questions`, [SIMPLE_PROFILE]);
  const card = page.locator('[data-tour="kink-card"]');
  await expect(card.getByRole("heading", { name: "Orgasm control / permission" })).toBeVisible();
  await expect(card.getByTestId("question-info-disclosure")).toHaveCount(0);
});

test("category explainer teaches context without changing answers", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${CUCKOLDING_PROFILE.id}/questions`, [CUCKOLDING_PROFILE]);
  const card = page.locator('[data-tour="kink-card"]');
  const before = await stableControlGeometry(page);
  await card.getByTestId("question-category-meta").click();
  const dialog = page.getByRole("dialog", { name: /Over / });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("vult niets voor je in");
  await dialog.getByRole("button", { name: "Begrepen" }).click();
  expectSameGeometry(before, await stableControlGeometry(page));
});

test("answer hints share one right edge and selection never steals their space", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${SELECTION_PROFILE.id}/questions`, [SELECTION_PROFILE]);
  const card = page.locator('[data-tour="kink-card"]');
  const beforeGeometry = await stableControlGeometry(page);
  const beforeEdges = await statusHintRightEdges(page);
  expectAlignedRightEdges(beforeEdges);

  const yesButton = card.getByRole("button", { name: /Heel graag/i });
  await expect(yesButton).toHaveClass(/active:scale-\[0\.994\]/);
  const idleBackground = await yesButton.evaluate((node) => getComputedStyle(node).backgroundColor);
  const idleShadow = await yesButton.evaluate((node) => getComputedStyle(node).boxShadow);
  await yesButton.click();
  await page.waitForTimeout(40);
  const selectedIndicator = card.locator('[data-status-indicator="yes"]');
  await expect(selectedIndicator.locator("svg")).toBeVisible();
  expect(await yesButton.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(idleBackground);
  expect(await yesButton.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe(idleShadow);
  const afterEdges = await statusHintRightEdges(page);
  expectAlignedRightEdges(afterEdges);
  for (let index = 0; index < beforeEdges.length; index += 1) {
    expect(Math.abs(beforeEdges[index] - afterEdges[index])).toBeLessThanOrEqual(1);
  }
  expectSameGeometry(beforeGeometry, await stableControlGeometry(page));
});

test("agreements keep breathing room around their inline optional label", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${CUCKOLDING_PROFILE.id}/questions`, [CUCKOLDING_PROFILE]);
  const card = page.locator('[data-tour="kink-card"]');
  const section = card.getByTestId("question-agreements");
  const label = card.getByTestId("question-agreements-label");
  const firstButton = card.getByRole("button", { name: "Eerst vragen" });
  await expect(label).toHaveText("Afspraken · optioneel");

  const sectionBox = await section.boundingBox();
  const labelBox = await label.boundingBox();
  const buttonBox = await firstButton.boundingBox();
  expect(sectionBox && labelBox && buttonBox).toBeTruthy();
  expect(labelBox!.y - sectionBox!.y).toBeGreaterThanOrEqual(8);
  expect(buttonBox!.y - (labelBox!.y + labelBox!.height)).toBeGreaterThanOrEqual(6);
  expect(sectionBox!.y + sectionBox!.height - (buttonBox!.y + buttonBox!.height)).toBeGreaterThanOrEqual(6);
});

test("question card keeps all primary controls visible with unclipped copy", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${CUCKOLDING_PROFILE.id}/questions`, [CUCKOLDING_PROFILE]);
  const card = page.locator('[data-tour="kink-card"]');
  await expect(card).toBeVisible();
  await expect(card.getByTestId("question-category-meta")).toBeVisible();
  const title = card.getByTestId("question-title");
  const essence = card.getByTestId("question-essence");
  await expect(title).toBeVisible();
  await expect(essence).toBeVisible();
  await expect(card.getByTestId("question-info-disclosure")).toBeVisible();
  const curious = card.getByRole("button", { name: "Markeer als nieuwsgierig" });
  await expect(curious).toBeVisible();
  await expect(card.getByRole("button", { name: "Antwoord privé maken" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Eerst vragen" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Eerste keer" })).toBeVisible();
  await expect(card.getByTestId("question-agreements-label")).toHaveText("Afspraken · optioneel");
  await expect(card.getByTestId("question-progress")).toBeVisible();
  await expect(card.getByRole("group", { name: "Status kiezen" }).locator("button")).toHaveCount(5);

  const cardBox = await card.boundingBox();
  const topControlBox = await curious.boundingBox();
  const footerBox = await card.getByTestId("question-progress").boundingBox();
  const laterBox = await card.getByRole("button", { name: /Later/ }).boundingBox();
  expect(cardBox && topControlBox && footerBox && laterBox).toBeTruthy();
  const topBreathing = topControlBox!.y - cardBox!.y;
  const bottomBreathing = cardBox!.y + cardBox!.height - Math.max(footerBox!.y + footerBox!.height, laterBox!.y + laterBox!.height);
  expect(topBreathing).toBeGreaterThanOrEqual(12);
  expect(bottomBreathing).toBeGreaterThanOrEqual(12);
  expect(Math.abs(topBreathing - bottomBreathing)).toBeLessThanOrEqual(8);
  expect(laterBox!.y + laterBox!.height).toBeLessThanOrEqual(await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight) + 1);
  expect(await card.evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
  expect(await essence.evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);

  const titleMetrics = await title.evaluate((node) => {
    const style = getComputedStyle(node);
    return { fontSize: Number.parseFloat(style.fontSize), lineHeight: Number.parseFloat(style.lineHeight), clientHeight: node.clientHeight, scrollHeight: node.scrollHeight };
  });
  expect(titleMetrics.lineHeight / titleMetrics.fontSize).toBeGreaterThanOrEqual(1.18);
  expect(titleMetrics.scrollHeight).toBeLessThanOrEqual(titleMetrics.clientHeight + 1);
});

test("safety guidance keeps its essential stop signal visible before the sheet opens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${SAFETY_PROFILE.id}/questions`, [SAFETY_PROFILE]);
  const card = page.locator('[data-tour="kink-card"]');
  await expect(card.getByRole("heading", { name: "Restricting a partner’s hearing" })).toBeVisible();
  await expect(card.getByTestId("question-essence")).toContainText("tastbaar stopsignaal");
  await expect(card.getByText(SAFETY_COPY, { exact: true })).toHaveCount(0);
  const disclosure = card.getByTestId("safety-disclosure");
  await expect(disclosure).toBeVisible();
  await disclosure.click();
  const dialog = page.getByRole("dialog", { name: "Veiligheid bij Restricting a partner’s hearing" });
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
  await expect.poll(async () => {
    const box = await dialog.boundingBox();
    return box ? box.y + box.height : Number.POSITIVE_INFINITY;
  }).toBeLessThanOrEqual(visibleHeight + 1);
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