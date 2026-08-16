import { expect, test } from "@playwright/test";
import { KINKS } from "@/lib/kinks";
import type { Profile } from "@/types";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

function deepDiveWithOnlyOneQuestion(id: string, kinkId: string): Profile {
  return {
    ...PROFILE_ALEX,
    id,
    name: "Closeout private",
    customKinks: [],
    questionnaireSetup: { mode: "deepDive", interests: [], version: 2 },
    entries: Object.fromEntries(
      KINKS.filter((kink) => kink.id !== kinkId).map((kink) => [kink.id, { status: "maybe" as const, score: null, comment: "" }]),
    ),
  };
}

function completedDynamicProfile(id: string): Profile {
  return {
    ...PROFILE_ALEX,
    id,
    name: "Closeout complete",
    customKinks: [],
    questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    entries: Object.fromEntries(
      KINKS.map((kink) => [kink.id, { status: "maybe" as const, score: null, comment: "" }]),
    ),
  };
}

const PRIVATE_PROFILE = deepDiveWithOnlyOneQuestion("pw-closeout-private", "orgasm_control");
const COMPLETE_PROFILE = completedDynamicProfile("pw-closeout-complete");

test("privacy and curious stay independent when the top-right utilities are tapped", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${PRIVATE_PROFILE.id}/questions`, [PRIVATE_PROFILE]);

  const curious = page.getByTestId("question-curious");
  const privateAnswer = page.getByTestId("question-private");

  await expect(curious).toHaveAttribute("aria-pressed", "false");
  await expect(privateAnswer).toHaveAttribute("aria-pressed", "false");

  await privateAnswer.click();
  await expect(privateAnswer).toHaveAttribute("aria-pressed", "true");
  await expect(curious).toHaveAttribute("aria-pressed", "false");

  await curious.click();
  await expect(curious).toHaveAttribute("aria-pressed", "true");
  await expect(privateAnswer).toHaveAttribute("aria-pressed", "true");

  await privateAnswer.click();
  await expect(privateAnswer).toHaveAttribute("aria-pressed", "false");
  await expect(curious).toHaveAttribute("aria-pressed", "true");
});

test("dynamic completion is an exit-first state without an ambiguous assessed count", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${COMPLETE_PROFILE.id}/questions`, [COMPLETE_PROFILE]);

  const complete = page.getByTestId("questions-complete");
  await expect(complete.getByRole("heading", { name: "Je eerste ronde is klaar." })).toBeVisible();
  await expect(complete.getByRole("link", { name: "Terug naar profiel" })).toBeVisible();
  await expect(complete.getByRole("button", { name: "Verder ontdekken" })).toBeVisible();
  await expect(complete).not.toContainText(/\d+\s*\/\s*\d+\s*beoordeeld/i);

  await complete.getByRole("button", { name: "Verder ontdekken" }).click();
  await expect(page.getByTestId("questions-complete-next-options").getByRole("button", { name: "Discover" })).toBeVisible();
  await expect(page.getByTestId("questions-complete-next-options").getByRole("button", { name: "Deep Dive" })).toBeVisible();
});

test("short landscape keeps the question card inside its locked stage", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await seedAndGo(page, `/profile/${PRIVATE_PROFILE.id}/questions`, [PRIVATE_PROFILE]);

  const screen = await page.getByTestId("questions-screen").boundingBox();
  const card = await page.locator('[data-tour="kink-card"]').boundingBox();
  expect(screen).not.toBeNull();
  expect(card).not.toBeNull();
  expect(card!.x).toBeGreaterThanOrEqual(screen!.x - 1);
  expect(card!.x + card!.width).toBeLessThanOrEqual(screen!.x + screen!.width + 1);
  expect(card!.y).toBeGreaterThanOrEqual(screen!.y - 1);
  expect(card!.y + card!.height).toBeLessThanOrEqual(screen!.y + screen!.height + 1);

  const detail = page.getByTestId("question-info-disclosure");
  if (await detail.count()) {
    const box = await detail.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(48);
  }
});
