import { test, expect } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";
import type { Profile } from "@/types";

const a: Profile = { ...PROFILE_ALEX, customKinks: [
  { id: "public-limit", name: "Zichtbare eigen grens" },
  { id: "private-limit", name: "Geheime eigen grens" },
], entries: {
  "public-limit": { status: "hard_no", comment: "Privénotitie" },
  "private-limit": { status: "hard_no", privateResponse: true, comment: "Geheime notitie" },
  praise_kink: { status: "yes", comment: "" },
  wax_play: { status: "yes", comment: "" },
} };
const b: Profile = { ...PROFILE_SAM, customKinks: [], entries: {
  praise_kink: { status: "yes", comment: "" },
  wax_play: { status: "maybe", comment: "" },
} };

test("public unpaired hard boundary remains visible through result, category and discussed filters", async ({ page }, testInfo) => {
  await seedAndGo(page, `/compare?a=${a.id}&b=${b.id}`, [a, b]);
  const limits = page.getByRole("region", { name: "Harde grenzen met één zichtbaar antwoord" });
  const checkSafety = async () => {
    await expect(limits.getByText("Zichtbare eigen grens", { exact: true })).toBeVisible();
    await expect(limits).toContainText("Alex");
    await expect(limits).toContainText("Harde grens");
    await expect(limits).toContainText("Sam: geen zichtbaar antwoord.");
    await expect(limits.locator("details")).toHaveCount(0);
    await expect(page.getByText(/Geheime eigen grens|Geheime notitie|Privénotitie/)).toHaveCount(0);
  };
  await checkSafety();
  const rows = page.locator(".compare-kink-row");
  const shared = page.locator('.compare-kink-row[data-fact-kind="shared"]');
  const discuss = page.locator('.compare-kink-row[data-fact-kind="discuss"]');
  await expect(rows).toHaveCount(2);
  await expect(shared).toHaveCount(1);
  await expect(discuss).toHaveCount(1);
  await expect(shared.getByRole("button", { name: /als besproken markeren/ })).toHaveCount(0);
  const markDiscussed = discuss.getByRole("button", { name: /als besproken markeren/ });
  await markDiscussed.click();
  await expect(discuss.getByRole("button", { name: /als niet besproken markeren/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Verberg besproken/ }).click();
  await expect(rows).toHaveCount(1);
  await expect(shared).toBeVisible();
  await expect(discuss).toHaveCount(0);
  await checkSafety();
  await page.getByRole("button", { name: /Toon alles/ }).click();
  await expect(rows).toHaveCount(2);
  await expect(discuss).toBeVisible();
  await checkSafety();
  await page.getByTestId("compare-results-filter").click();
  const results = page.getByRole("dialog", { name: "Resultaten filteren" });
  await results.getByRole("button", { name: /Zelfde interesse/ }).click();
  await results.getByRole("button", { name: "Klaar", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(shared).toBeVisible();
  await expect(discuss).toHaveCount(0);
  await checkSafety();
  await page.getByTestId("compare-categories-filter").click();
  const categories = page.getByRole("dialog", { name: "Categorieën filteren" });
  await categories.locator("button[aria-pressed]").filter({ hasNotText: "Alle categorieën" }).first().click();
  await categories.getByRole("button", { name: "Klaar", exact: true }).click();
  await checkSafety();
  await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/compare-visible-unpaired-boundary-filtered.png`, fullPage: true });
});
