import { expect, test, type Page } from "@playwright/test";
import {
  CONTRACT_SERIES_ALEX_SAM,
  PROFILE_ALEX,
  PROFILE_SAM,
  seedProfiles,
} from "./fixtures";

const ROUTES = [
  { slug: "home", url: "/" },
  { slug: "profile", url: `/profile/${PROFILE_ALEX.id}` },
  { slug: "questions", url: `/profile/${PROFILE_ALEX.id}/questions` },
  { slug: "compare", url: `/compare?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}` },
  { slug: "contract", url: `/contract?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}` },
  { slug: "scene", url: `/scene?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}` },
] as const;

type CriticalRoute = (typeof ROUTES)[number];

async function expectRouteReady(page: Page, route: CriticalRoute) {
  switch (route.slug) {
    case "home":
      await expect(page.getByRole("link", { name: "Alex Dominant openen" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Sam Submissive openen" })).toBeVisible();
      await expect(page.getByRole("link", { name: / openen$/ })).toHaveCount(2);
      break;
    case "profile":
      await expect(page.getByRole("heading", { name: "Alex", exact: true }).first()).toBeVisible();
      await expect(page.getByRole("tab", { name: "Overzicht" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Bewerken" })).toBeVisible();
      await expect(page.getByRole("link", { name: /Verder invullen|Verder ontdekken|Start met vragen/i }).first()).toBeVisible();
      break;
    case "questions": {
      await expect(page.getByTestId("questions-screen")).toBeVisible();
      const statusGroup = page.getByRole("group", { name: "Status kiezen" });
      await expect(statusGroup).toBeVisible();
      await expect(statusGroup.getByRole("button")).toHaveCount(5);
      await expect(page.locator('[data-tour="kink-card"] h3')).toHaveCount(1);
      break;
    }
    case "compare":
      await expect(page.getByRole("heading", { name: "Profielen vergelijken" })).toBeVisible();
      await expect(page.getByRole("img", { name: /^Verdeling:/ })).toBeVisible();
      await expect.poll(() => page.locator('section[id^="cat-"]').count()).toBeGreaterThan(0);
      break;
    case "contract":
      await expect(page.getByRole("heading", { name: "Teken het contract" })).toBeVisible();
      await expect(page.getByText("Gedeelde verlangens", { exact: true })).toBeVisible();
      await expect(page.getByText("Zachte grenzen", { exact: true })).toBeVisible();
      await expect(page.getByText("Harde grenzen", { exact: true })).toBeVisible();
      break;
    case "scene":
      await expect(page.getByRole("button", { name: "Kinks toevoegen" })).toBeVisible();
      await expect(page.getByText("Lege setlist", { exact: true })).toBeVisible();
      await expect(page.getByText("Alex & Sam", { exact: true })).toBeVisible();
      break;
  }
}

test("critical launch routes hydrate with their real content inside the viewport", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedProfiles(page, [PROFILE_ALEX, PROFILE_SAM], {
    contractSeries: [CONTRACT_SERIES_ALEX_SAM],
    pinnedProfileId: PROFILE_ALEX.id,
  });

  for (const route of ROUTES) {
    await page.goto(route.url);
    await page.waitForLoadState("networkidle");
    await expectRouteReady(page, route);
    await page.evaluate(async () => { await document.fonts.ready; });

    const layout = await page.evaluate(() => ({
      bodyWidth: document.body.scrollWidth,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));

    expect(
      Math.max(layout.bodyWidth, layout.documentWidth),
      `${route.slug} overflows the ${testInfo.project.name} viewport`,
    ).toBeLessThanOrEqual(layout.viewportWidth + 1);

    await page.screenshot({
      path: `test-results/device-screenshots/${testInfo.project.name}/${route.slug}.png`,
      fullPage: true,
    });
  }
});
