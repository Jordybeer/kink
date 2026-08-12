import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

const PROFILES = [PROFILE_ALEX, PROFILE_SAM];

test("hub shows utility actions, no back chevron", async ({ page }) => {
  await seedAndGo(page, "/", PROFILES);
  const nav = page.getByLabel("Hoofdnavigatie");
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("button", { name: "Instellingen openen" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Terug" })).toHaveCount(0);
});

test("subpages show back chevron pointing at the right parent", async ({ page }) => {
  const cases: Array<[string, string]> = [
    ["/compare?a=pw-alex-001&b=pw-sam-002", "/"],
    ["/contract?a=pw-alex-001&b=pw-sam-002", "/compare"],
    ["/profile/pw-alex-001", "/"],
  ];
  for (const [url, parent] of cases) {
    await seedAndGo(page, url, PROFILES);
    const back = page.getByLabel("Hoofdnavigatie").getByRole("link", { name: "Terug" });
    await expect(back).toHaveAttribute("href", parent);
  }
});

test("contextual actions live in the TopNav", async ({ page }) => {
  await seedAndGo(page, "/scenes", PROFILES);
  await expect(page.getByLabel("Hoofdnavigatie").getByRole("button", { name: "Nieuwe scène" })).toBeVisible();

  await seedAndGo(page, "/compare?a=pw-alex-001&b=pw-sam-002", PROFILES);
  const compareNav = page.getByLabel("Hoofdnavigatie");
  await expect(compareNav.getByRole("button", { name: "Wissel profielen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Wissel profielen" })).toHaveCount(1);

  await seedAndGo(page, "/profile/pw-alex-001", PROFILES);
  const profileNav = page.getByLabel("Hoofdnavigatie");
  await expect(profileNav.getByRole("button", { name: "Profiel delen" })).toBeVisible();
  await expect(profileNav.getByRole("button", { name: "Profiel bewerken" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Profiel delen" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Profiel bewerken" })).toHaveCount(1);
});

test("header stays hidden behind the onboarding curtain", async ({ page }) => {
  await seedAndGo(page, "/", PROFILES, { onboardingComplete: false });
  await expect(page.getByLabel("Hoofdnavigatie")).toHaveCount(0);
});
