import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  CONTRACT_SERIES_ALEX_SAM,
  PROFILE_ALEX,
  PROFILE_SAM,
  seedProfiles,
} from "./fixtures";

const ROUTES = [
  { slug: "home", url: "/" },
  { slug: "about", url: "/about" },
  { slug: "profile", url: `/profile/${PROFILE_ALEX.id}` },
  { slug: "questions", url: `/profile/${PROFILE_ALEX.id}/questions` },
  { slug: "compare", url: `/compare?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}` },
  { slug: "contract", url: `/contract?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}` },
  { slug: "scene", url: `/scene?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}` },
] as const;

const MOTION_SIZE_TOLERANCE_PX = 0.5;
type CriticalRoute = (typeof ROUTES)[number];

async function expectEffectivelyOpaque(locator: Locator) {
  await expect.poll(async () => locator.evaluate((element) => {
    let opacity = 1;
    let current: Element | null = element;
    while (current) {
      const value = Number.parseFloat(getComputedStyle(current).opacity);
      if (Number.isFinite(value)) opacity *= value;
      current = current.parentElement;
    }
    return opacity;
  })).toBeGreaterThan(0.99);
}

async function expectRouteReady(page: Page, route: CriticalRoute) {
  switch (route.slug) {
    case "home": {
      const alexProfile = page.getByRole("link", { name: "Alex Dominant openen" });
      const samProfile = page.getByRole("link", { name: "Sam Submissive openen" });
      await expect(alexProfile).toBeVisible();
      await expect(samProfile).toBeVisible();
      await expect(page.getByRole("link", { name: / openen$/ })).toHaveCount(2);
      await expectEffectivelyOpaque(alexProfile);
      await expectEffectivelyOpaque(samProfile);
      break;
    }
    case "about":
      await expect(page.getByRole("heading", { name: "Jouw voorkeuren. Jouw toestel. Jouw woorden." })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Drie regels sturen het hele product" })).toBeVisible();
      await expect(page.getByText("Geen KinkSync-account", { exact: true })).toBeVisible();
      await expect(page.getByText(/op iOS kunnen Safari en de geïnstalleerde Home Screen-app aparte opslagcontexten zijn/i)).toBeVisible();
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
      await expect(page.getByTestId("compare-results-filter")).toBeVisible();
      await expect(page.getByTestId("compare-categories-filter")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Wat valt op tussen jullie" })).toBeVisible();
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

async function expectVisualViewportContract(page: Page) {
  await expect.poll(async () => page.evaluate(() => {
    const rendered = Number.parseFloat(
      document.documentElement.style.getPropertyValue("--visual-viewport-height"),
    );
    const visible = Math.round(window.visualViewport?.height ?? window.innerHeight);
    return Number.isFinite(rendered) ? Math.abs(rendered - visible) : Number.POSITIVE_INFINITY;
  })).toBeLessThanOrEqual(1);
}

async function expectStatusExplainerStartsAtTop(page: Page) {
  const helpTrigger = page
    .getByLabel("Hoofdnavigatie")
    .getByRole("button", { name: "Uitleg antwoordkeuzes" });
  await expect(helpTrigger).toBeVisible();
  await helpTrigger.click();

  const dialog = page.getByRole("dialog", { name: "Uitleg keuzes" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Heel graag", { exact: true })).toBeVisible();

  await expect.poll(async () => dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
    return Math.max(0, -rect.top, rect.bottom - visibleHeight);
  })).toBeLessThanOrEqual(1);

  const scrollTop = await dialog.evaluate((element) =>
    element.querySelector<HTMLElement>(".overflow-y-auto")?.scrollTop ?? -1,
  );
  expect(scrollTop).toBeLessThanOrEqual(1);

  await dialog.getByRole("button", { name: "Sluit" }).click();
  await expect(dialog).toBeHidden();
}

async function boxSize(target: Locator) {
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error("Expected interactive target to have a bounding box");
  return { width: box.width, height: box.height };
}

async function holdPress(page: Page, target: Locator) {
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
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
    await expectVisualViewportContract(page);
    if (route.slug === "questions") await expectStatusExplainerStartsAtTop(page);
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

test("iPhone tactile motion remains present normally and collapses with reduced motion", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("iphone-"), "Motion feel gate is iPhone/WebKit-specific");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const begin = page.getByRole("button", { name: "Begin", exact: true });
  await expect(begin).toBeVisible();

  const normalSize = await boxSize(begin);
  await holdPress(page, begin);
  await expect.poll(async () => {
    const held = await boxSize(begin);
    return Math.max(normalSize.width - held.width, normalSize.height - held.height);
  }).toBeGreaterThan(MOTION_SIZE_TOLERANCE_PX);
  await page.screenshot({
    path: `test-results/device-screenshots/${testInfo.project.name}/motion-normal-pressed.png`,
  });
  await page.mouse.up();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const reducedBegin = page.getByRole("button", { name: "Begin", exact: true });
  await expect(reducedBegin).toBeVisible();

  const reducedSize = await boxSize(reducedBegin);
  await holdPress(page, reducedBegin);
  await expect.poll(async () => {
    const held = await boxSize(reducedBegin);
    return Math.max(
      Math.abs(held.width - reducedSize.width),
      Math.abs(held.height - reducedSize.height),
    );
  }).toBeLessThanOrEqual(MOTION_SIZE_TOLERANCE_PX);
  await page.screenshot({
    path: `test-results/device-screenshots/${testInfo.project.name}/motion-reduced-pressed.png`,
  });
  await page.mouse.up();
});
