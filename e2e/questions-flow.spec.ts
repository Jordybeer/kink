import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

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

  const cardTitle = page.locator('[data-tour="kink-card"] h3');
  const firstQuestion = await cardTitle.innerText();
  await page.getByRole("button", { name: /Heel graag/i }).click();
  await expect(cardTitle).not.toHaveText(firstQuestion);

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("questions-screen")).toBeVisible();
  await expect(cardTitle).not.toHaveText(firstQuestion);

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasHorizontalOverflow).toBe(false);
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
