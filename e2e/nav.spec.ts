import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

const PROFILES = [PROFILE_ALEX, PROFILE_SAM];

test("hub keeps secondary product info in the shared context menu", async ({ page }) => {
  await seedAndGo(page, "/", PROFILES);
  const nav = page.getByLabel("Hoofdnavigatie");
  await expect(nav).toBeVisible();
  await expect(nav).toHaveAttribute("data-top-nav-variant", "home");
  await expect(nav.getByRole("link", { name: "Ontdek hoe KinkSync werkt" })).toHaveCount(0);
  await expect(nav.getByText("Hoe het werkt", { exact: true })).toHaveCount(0);
  const settings = nav.getByRole("button", { name: "Instellingen openen" });
  await expect(settings).toBeVisible();
  await expect(settings).toContainText("Instellingen");
  await expect(nav.getByRole("link", { name: "Terug" })).toHaveCount(0);
  await expect(nav.getByText("KinkSync", { exact: true })).toHaveCount(0);

  const more = nav.getByRole("button", { name: "Meer over KinkSync" });
  await expect(more).toBeVisible();
  await expect(more).toHaveText("");
  await more.click();

  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Over KinkSync" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Security & privacy" })).toBeVisible();

  await menu.getByRole("menuitem", { name: "Over KinkSync" }).click();
  await expect(page).toHaveURL(/\/about$/);
});

test("subpages show back chevron pointing at the right parent", async ({ page }) => {
  const cases: Array<[string, string]> = [
    ["/compare?a=pw-alex-001&b=pw-sam-002", "/"],
    ["/contract?a=pw-alex-001&b=pw-sam-002", "/compare"],
    ["/profile/pw-alex-001", "/"],
    ["/profile?id=pw-alex-001", "/"],
  ];
  for (const [url, parent] of cases) {
    await seedAndGo(page, url, PROFILES);
    const back = page.getByLabel("Hoofdnavigatie").getByRole("link", { name: "Terug" });
    await expect(back).toHaveAttribute("href", parent);
  }
});

test("profile tab uses the offline-safe shell without changing profile UX", async ({ page }) => {
  await seedAndGo(page, "/profile?id=pw-alex-001", PROFILES);

  await expect(page.getByText("Alex", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Profiel delen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Profiel bewerken" })).toBeVisible();

  const profileTab = page.locator('nav[aria-label="Tabbladen"] a').filter({ hasText: "Profiel" });
  await expect(profileTab).toHaveAttribute("href", "/profile?id=pw-alex-001");
  await expect(profileTab).toHaveAttribute("aria-current", "page");
});

test("contextual actions live in the TopNav as icon-only commands", async ({ page }) => {
  await seedAndGo(page, "/scenes", PROFILES);
  const newScene = page.getByLabel("Hoofdnavigatie").getByRole("button", { name: "Nieuwe scène" });
  await expect(newScene).toBeVisible();
  await expect(newScene).toHaveText("");

  await seedAndGo(page, "/contracts", PROFILES);
  const contractsNav = page.getByLabel("Hoofdnavigatie");
  const scanContract = contractsNav.getByRole("button", { name: "Contractverzoek scannen" });
  await expect(scanContract).toBeVisible();
  await expect(scanContract).toHaveText("");
  await expect(contractsNav.getByRole("button", { name: /Nieuw contract/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Contractverzoek scannen" })).toHaveCount(1);

  await seedAndGo(page, "/compare?a=pw-alex-001&b=pw-sam-002", PROFILES);
  const compareNav = page.getByLabel("Hoofdnavigatie");
  const swap = compareNav.getByRole("button", { name: "Wissel profielen" });
  const contract = compareNav.getByRole("button", { name: "Contract opstellen" });
  await expect(swap).toBeVisible();
  await expect(contract).toBeVisible();
  await expect(contract).toBeEnabled();
  await expect(swap).toHaveText("");
  await expect(contract).toHaveText("");
  await expect(page.getByRole("button", { name: "Wissel profielen" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Contract opstellen" })).toHaveCount(1);

  await seedAndGo(page, "/profile/pw-alex-001", PROFILES);
  const profileNav = page.getByLabel("Hoofdnavigatie");
  const share = profileNav.getByRole("button", { name: "Profiel delen" });
  const edit = profileNav.getByRole("button", { name: "Profiel bewerken" });
  await expect(share).toBeVisible();
  await expect(edit).toBeVisible();
  await expect(share).toHaveText("");
  await expect(edit).toHaveText("");
  await expect(page.getByRole("button", { name: "Profiel delen" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Profiel bewerken" })).toHaveCount(1);
});

test("header stays hidden behind the onboarding curtain", async ({ page }) => {
  await seedAndGo(page, "/", PROFILES, { onboardingComplete: false });
  await expect(page.getByLabel("Hoofdnavigatie")).toHaveCount(0);
});
