import { expect, test } from "@playwright/test";
import { KINKS } from "@/lib/kinks";
import type { Profile } from "@/types";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

const PROFILE: Profile = {
  ...PROFILE_ALEX,
  id: "pw-profile-closeout",
  name: "Profile closeout",
  questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
};

const EMPTY_PROFILE: Profile = {
  ...PROFILE,
  id: "pw-profile-empty-catalog",
  name: "Empty catalog",
  entries: {},
};

const DENSE_PROFILE: Profile = {
  ...PROFILE,
  id: "pw-profile-dense-share",
  name: "Dense share",
  entries: Object.fromEntries(
    KINKS.map((kink) => [kink.id, { status: "maybe" as const, score: null, comment: "" }]),
  ),
};

const PROFILE_WITH_BDSMTEST: Profile = {
  ...PROFILE,
  id: "pw-profile-bdsmtest",
  name: "BDSMTest profile",
  bdsmtestScores: [
    { role: "Dominant", pct: 92 },
    { role: "Rigger", pct: 78 },
    { role: "Sadist", pct: 65 },
  ],
};

const PROFILE_WITH_MIXED_STATUSES: Profile = {
  ...EMPTY_PROFILE,
  id: "pw-profile-equal-status-pills",
  name: "Equal status pills",
  entries: Object.fromEntries(
    (["yes", "willing", "maybe", "no", "hard_no"] as const).map((status, index) => [
      KINKS[index].id,
      { status, score: null, comment: "" },
    ]),
  ),
};

test("profile keeps the read-view quiet and exposes search/filter only through Onderwerpen beheren", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${PROFILE.id}`, [PROFILE]);

  await expect(page.getByTestId("profile-catalog-controls")).toHaveCount(0);
  await expect(page.getByPlaceholder("Zoek in de volledige catalogus…")).toHaveCount(0);
  const manage = page.getByRole("button", { name: /Onderwerpen beheren/ });
  await expect(manage).toBeVisible();
  const manageBox = await manage.boundingBox();
  expect(manageBox).not.toBeNull();
  expect(manageBox!.height).toBeGreaterThanOrEqual(44);
  await expect(page.getByRole("button", { name: "Wat betekenen deze keuzes?" })).toHaveCount(0);

  await manage.click();
  await expect(page.getByTestId("profile-catalog-controls")).toBeVisible();
  const search = page.getByRole("textbox", { name: "Volledige catalogus doorzoeken" });
  await expect(search).toBeVisible();
  const categories = page.getByRole("button", { name: "Alle categorieën" });
  await expect(categories).toBeVisible();
  for (const control of [search, categories]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  await search.fill("spanking");
  await expect(page.getByText(/spanking/i).first()).toBeVisible();
  await search.fill("");

  await expect.poll(() => page.getByTestId("profile-category-header").first().evaluate((element) =>
    getComputedStyle(element).top,
  )).toBe("56px");

  const jumpButton = page.getByRole("button", { name: /Andere categorie kiezen; nu/ }).first();
  const jumpBox = await jumpButton.boundingBox();
  expect(jumpBox).not.toBeNull();
  expect(jumpBox!.width).toBeGreaterThanOrEqual(44);
  expect(jumpBox!.height).toBeGreaterThanOrEqual(44);
  await jumpButton.click();
  const categoryDialog = page.getByRole("dialog", { name: "Categorie kiezen" });
  await expect(categoryDialog).toBeVisible();
  await categoryDialog.getByRole("button", { name: /Impact Play/ }).click();
  await expect(categoryDialog).not.toBeVisible();
  await expect(page.locator('button[aria-controls="category-impact-content"]')).toHaveAttribute("aria-expanded", "true");
});

test("empty profile keeps the full catalog available behind the explicit manager", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${EMPTY_PROFILE.id}`, [EMPTY_PROFILE]);

  await expect(page.getByTestId("profile-catalog-controls")).toHaveCount(0);
  await page.getByRole("button", { name: /Onderwerpen beheren/ }).click();
  await expect(page.getByTestId("profile-catalog-controls")).toBeVisible();
  const search = page.getByPlaceholder("Zoek in de volledige catalogus…");
  await expect(search).toBeVisible();
  await search.fill("spanking");
  await expect(page.locator('button[aria-label*="spanking" i][aria-label*=", bewerken"]').first()).toBeVisible();
});

test("profile completion card avoids coverage jargon and percentage metrics", async ({ page }) => {
  await seedAndGo(page, `/profile/${DENSE_PROFILE.id}`, [DENSE_PROFILE]);

  const continueCard = page.getByRole("link", { name: /Verder ontdekken/ });
  await expect(continueCard).toBeVisible();
  await expect(continueCard).toContainText("Je eerste ronde is afgerond.");
  await expect(continueCard).not.toContainText(/brede dekking/i);
  await expect(continueCard).not.toContainText(/100%/);
});

test("BDSMTest stays readable below the profile hero in read-view and catalog manager", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${PROFILE_WITH_BDSMTEST.id}`, [PROFILE_WITH_BDSMTEST]);

  const summary = page.getByTestId("bdsmtest-summary");
  const profileSummary = page.getByTestId("profile-summary");
  const lastCategory = page.getByRole("heading", { name: "Sensation Play" });
  await expect(profileSummary).toBeVisible();
  await expect(summary).toBeVisible();
  await expect(profileSummary.getByTestId("bdsmtest-summary")).toBeVisible();
  await expect(lastCategory).toBeVisible();
  expect(await lastCategory.evaluate((heading, selector) => {
    const target = document.querySelector(selector);
    return Boolean(target && (target.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING));
  }, '[data-testid="bdsmtest-summary"]')).toBe(true);

  const disclosure = summary.getByRole("button", { name: /Bekijk alle 3/ });
  const disclosureBox = await disclosure.boundingBox();
  expect(disclosureBox).not.toBeNull();
  expect(disclosureBox!.height).toBeGreaterThanOrEqual(44);
  await expect.poll(() => summary.getByText("Dominant", { exact: true }).evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize),
  )).toBeGreaterThanOrEqual(12);

  await page.getByRole("button", { name: /Onderwerpen beheren/ }).click();
  await expect(summary).toBeVisible();
});

test("profile catalog manager gives every kink status pill the same width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${PROFILE_WITH_MIXED_STATUSES.id}`, [PROFILE_WITH_MIXED_STATUSES]);

  await page.getByRole("button", { name: /Onderwerpen beheren/ }).click();
  const widths = await page.getByTestId("kink-status-pill").evaluateAll((elements) =>
    [...new Set(elements.map((element) => getComputedStyle(element).width))],
  );
  expect(widths).toEqual(["120px"]);
});

test("dense profile share keeps a fixed header and scrolls inside the iPhone visual viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${DENSE_PROFILE.id}`, [DENSE_PROFILE]);

  await page.getByRole("button", { name: "Profiel delen" }).click();
  const dialog = page.getByRole("dialog", { name: "Profiel delen" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("profile-share-qr")).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByText(/Profiel QR \d+ van \d+/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Profiel delen sluiten" })).toBeVisible();

  await page.evaluate(() => {
    document.documentElement.style.setProperty("--visual-viewport-height", "420px");
    document.documentElement.style.setProperty("--visual-viewport-offset-top", "80px");
  });

  const viewportFrame = page.getByTestId("sheet-visual-viewport");
  const sheet = dialog.getByTestId("profile-share-sheet");
  const header = dialog.getByTestId("profile-share-header");
  const scrollBody = dialog.getByTestId("profile-share-scroll-body");
  await expect.poll(() => viewportFrame.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: Math.round(rect.top), height: Math.round(rect.height) };
  })).toEqual({ top: 80, height: 420 });

  const headerBefore = await header.boundingBox();
  await scrollBody.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect.poll(() => scrollBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const headerAfter = await header.boundingBox();
  expect(headerBefore).not.toBeNull();
  expect(headerAfter!.y).toBeCloseTo(headerBefore!.y, 0);

  await expect(dialog.getByRole("button", { name: "Kopieer volledige link" })).toBeVisible();
  await expect.poll(() => sheet.evaluate((element) => {
    const frame = element.parentElement?.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return frame ? Math.max(0, frame.top - rect.top, rect.bottom - frame.bottom) : Number.POSITIVE_INFINITY;
  })).toBeLessThanOrEqual(1);
});
