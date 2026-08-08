import { expect, test } from "@playwright/test";
import {
  CONTRACT_SERIES_ALEX_SAM,
  PROFILE_ALEX,
  PROFILE_SAM,
  seedProfiles,
} from "./fixtures";

const ROUTES = [
  { slug: "home", url: "/" },
  { slug: "profile", url: `/profile/${PROFILE_ALEX.id}` },
  { slug: "compare", url: `/compare?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}` },
  { slug: "contract", url: `/contract?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}` },
  { slug: "scene", url: `/scene?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}` },
] as const;

test("critical mobile flow stays readable and inside the viewport", async ({ page }, testInfo) => {
  await seedProfiles(page, [PROFILE_ALEX, PROFILE_SAM], {
    contractSeries: [CONTRACT_SERIES_ALEX_SAM],
    pinnedProfileId: PROFILE_ALEX.id,
  });

  for (const route of ROUTES) {
    await page.goto(route.url);
    await page.waitForLoadState("networkidle");

    const layout = await page.evaluate(() => ({
      bodyWidth: document.body.scrollWidth,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      textLength: document.body.innerText.trim().length,
    }));

    expect(
      Math.max(layout.bodyWidth, layout.documentWidth),
      `${route.slug} overflows the ${testInfo.project.name} viewport`,
    ).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.textLength, `${route.slug} rendered an empty page`).toBeGreaterThan(30);

    await page.screenshot({
      path: `test-results/device-screenshots/${testInfo.project.name}/${route.slug}.png`,
      fullPage: true,
    });
  }
});
