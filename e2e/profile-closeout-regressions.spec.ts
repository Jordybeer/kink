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

test("profile keeps catalog search and category filtering available from Overview without duplicate answer help", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${PROFILE.id}`, [PROFILE]);

  await expect(page.getByRole("button", { name: "Overzicht" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("profile-catalog-controls")).toBeVisible();
  await expect(page.getByPlaceholder("Zoek in je profiel…")).toBeVisible();
  await expect(page.getByRole("button", { name: "Wat betekenen deze keuzes?" })).toHaveCount(0);
  await expect(page.getByText(/\d+ beoordeeld/, { exact: false })).toHaveCount(0);

  const search = page.getByPlaceholder("Zoek in je profiel…");
  await search.fill("spanking");
  await expect(page.getByText(/spanking/i).first()).toBeVisible();
  await search.fill("");

  await page.getByRole("button", { name: "Bewerken" }).click();
  await expect(page.getByPlaceholder("Zoek in de volledige catalogus…")).toBeVisible();
  await expect(page.getByTestId("profile-catalog-controls")).toBeVisible();
});

test("profile completion card avoids coverage jargon and percentage metrics", async ({ page }) => {
  const complete: Profile = {
    ...PROFILE,
    id: "pw-profile-complete",
    entries: Object.fromEntries(
      KINKS.map((kink) => [kink.id, { status: "maybe" as const, score: null, comment: "" }]),
    ),
  };
  await seedAndGo(page, `/profile/${complete.id}`, [complete]);

  const continueCard = page.getByRole("link", { name: /Verder ontdekken/ });
  await expect(continueCard).toBeVisible();
  await expect(continueCard).toContainText("Je eerste ronde is afgerond.");
  await expect(continueCard).not.toContainText(/brede dekking/i);
  await expect(continueCard).not.toContainText(/100%/);
});

test("normal profile share keeps its primary controls inside an iPhone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${PROFILE.id}`, [PROFILE]);

  await page.getByRole("button", { name: "Profiel delen" }).click();
  const dialog = page.getByRole("dialog", { name: "Profiel delen" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("profile-share-qr")).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByRole("button", { name: "Kopieer volledige link" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Sluit" })).toBeVisible();

  const sheet = dialog.getByTestId("profile-share-sheet");
  const dimensions = await sheet.evaluate((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
  }));
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.clientHeight + 2);
});
