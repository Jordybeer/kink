import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

const PROFILES = [PROFILE_ALEX, PROFILE_SAM];

test("TopNav keeps Home branded and anchored while content chrome stays quiet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/", PROFILES);

  const homeNav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
  await expect(homeNav).toHaveAttribute("data-top-nav-variant", "home");
  const homeActions = homeNav.getByTestId("home-topnav-actions");
  const homeMore = homeNav.getByRole("button", { name: "Meer opties" });
  const homeIdentity = page.locator("[data-home-identity]");
  const homeWordmark = homeIdentity.locator("[data-home-nav-wordmark]");
  await expect(homeActions).toBeVisible();
  await expect(homeMore).toBeVisible();
  await expect(homeWordmark).toHaveText("KinkSync");
  await expect(page.getByRole("link", { name: "Agenda" })).toBeVisible();

  const [homeNavBox, homeMoreBox, homeWordmarkBox] = await Promise.all([
    homeNav.boundingBox(),
    homeMore.boundingBox(),
    homeWordmark.boundingBox(),
  ]);
  expect(homeNavBox).not.toBeNull();
  expect(homeMoreBox).not.toBeNull();
  expect(homeWordmarkBox).not.toBeNull();
  expect(homeMoreBox!.width).toBeGreaterThanOrEqual(43);
  expect(homeMoreBox!.height).toBeGreaterThanOrEqual(43);
  expect(Math.abs(
    homeWordmarkBox!.x + homeWordmarkBox!.width / 2
      - (homeNavBox!.x + homeNavBox!.width / 2),
  )).toBeLessThanOrEqual(1);
  expect(Math.abs(
    homeMoreBox!.y + homeMoreBox!.height / 2
      - (homeWordmarkBox!.y + homeWordmarkBox!.height / 2),
  )).toBeLessThanOrEqual(5);
  expect(homeNavBox!.x + homeNavBox!.width - (homeMoreBox!.x + homeMoreBox!.width)).toBeGreaterThanOrEqual(19);
  expect(homeNavBox!.x + homeNavBox!.width - (homeMoreBox!.x + homeMoreBox!.width)).toBeLessThanOrEqual(21);
  await expect.poll(() => homeActions.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("auto");

  await homeMore.click();
  const homeMenu = page.getByRole("menu");
  await expect(homeMenu).toBeVisible();
  await expect(homeMenu.getByRole("menuitem", { name: "Instellingen" })).toBeVisible();
  await expect(homeMenu.getByRole("menuitem", { name: "Over KinkSync" })).toBeVisible();
  await expect(homeMenu.getByRole("menuitem", { name: "Security & privacy" })).toBeVisible();
  await expect(homeMenu.getByRole("menuitem", { name: "Agenda" })).toHaveCount(0);
  const homeMenuBox = await homeMenu.boundingBox();
  expect(homeMenuBox).not.toBeNull();
  expect(homeMenuBox!.x).toBeGreaterThanOrEqual(0);
  expect(homeMenuBox!.x + homeMenuBox!.width).toBeLessThanOrEqual(391);
  await page.keyboard.press("Escape");
  await expect(homeMenu).toBeHidden();

  // Home grows to the same desktop measure as its PageShell instead of
  // floating inward at the old max-w-2xl width.
  await page.setViewportSize({ width: 1024, height: 900 });
  await seedAndGo(page, "/", PROFILES);
  const desktopHomeNav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
  const desktopMain = page.locator("main");
  const [desktopNavBox, desktopMainBox] = await Promise.all([
    desktopHomeNav.boundingBox(),
    desktopMain.boundingBox(),
  ]);
  expect(desktopNavBox).not.toBeNull();
  expect(desktopMainBox).not.toBeNull();
  expect(Math.abs(desktopNavBox!.x - desktopMainBox!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(desktopNavBox!.width - desktopMainBox!.width)).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/contracts", PROFILES);
  const contentNav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
  await expect(contentNav).toHaveAttribute("data-top-nav-variant", "content");
  const contentRow = contentNav.getByTestId("content-topnav-row");
  await expect(contentRow).toBeVisible();
  const back = contentNav.getByRole("link", { name: "Terug" });
  const primaryAction = contentNav.getByRole("button", { name: "Contract van partner scannen" });
  await expect(back).toBeVisible();
  await expect(primaryAction).toBeVisible();
  await expect(primaryAction).toHaveText("Scan QR");

  const [contentNavBox, backBox, primaryActionBox] = await Promise.all([
    contentNav.boundingBox(),
    back.boundingBox(),
    primaryAction.boundingBox(),
  ]);
  expect(contentNavBox).not.toBeNull();
  expect(backBox).not.toBeNull();
  expect(primaryActionBox).not.toBeNull();
  expect(backBox!.x - contentNavBox!.x).toBeGreaterThanOrEqual(19);
  expect(backBox!.x - contentNavBox!.x).toBeLessThanOrEqual(21);
  expect(backBox!.width).toBeGreaterThanOrEqual(43);
  expect(backBox!.height).toBeGreaterThanOrEqual(43);
  expect(primaryActionBox!.height).toBeGreaterThanOrEqual(43);
  expect(primaryActionBox!.height).toBeLessThanOrEqual(45);

  const contentGeometry = await contentRow.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderWidth: style.borderTopWidth,
      height: element.getBoundingClientRect().height,
      pointerEvents: style.pointerEvents,
      backgroundColor: style.backgroundColor,
    };
  });
  expect(contentGeometry.borderWidth).toBe("0px");
  expect(contentGeometry.height).toBeLessThanOrEqual(57);
  expect(contentGeometry.pointerEvents).toBe("auto");
  expect(contentGeometry.backgroundColor).toBe("rgba(0, 0, 0, 0)");

  const contentHeader = await contentNav.evaluate((element) => {
    const header = element.parentElement;
    if (!header) return null;
    const style = getComputedStyle(header);
    return {
      position: style.position,
      borderBottomWidth: style.borderBottomWidth,
      boxShadow: style.boxShadow,
      pointerEvents: style.pointerEvents,
      backgroundColor: style.backgroundColor,
    };
  });
  expect(contentHeader?.position).toBe("sticky");
  expect(contentHeader?.borderBottomWidth).toBe("0px");
  expect(contentHeader?.boxShadow).toBe("none");
  expect(contentHeader?.pointerEvents).toBe("none");
  expect(contentHeader?.backgroundColor).not.toBe("rgb(7, 6, 11)");
});

test("Home masthead balances the full logo and subtitle stack", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const profiles of [PROFILES, []]) {
    await seedAndGo(page, "/", profiles);
    const nav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
    const wordmark = nav.locator("[data-home-nav-wordmark]");
    const subtitle = page.getByText("Verken grenzen. Samen.", { exact: true });
    const subtitleWrap = page.locator("main > div:first-child");
    const main = page.locator("main");

    await expect(wordmark).toBeVisible();
    await expect(subtitle).toBeVisible();

    const navMetrics = await nav.evaluate((element) => {
      const style = getComputedStyle(element);
      const wordmark = element.querySelector<HTMLElement>("[data-home-nav-wordmark]");
      return {
        paddingTop: parseFloat(style.paddingTop),
        paddingBottom: parseFloat(style.paddingBottom),
        wordmarkSize: wordmark ? parseFloat(getComputedStyle(wordmark).fontSize) : 0,
      };
    });
    const subtitleMetrics = await subtitleWrap.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        paddingTop: parseFloat(style.paddingTop),
        paddingBottom: parseFloat(style.paddingBottom),
      };
    });
    const subtitleSize = await subtitle.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    const mainPaddingTop = await main.evaluate((element) => parseFloat(getComputedStyle(element).paddingTop));

    expect(navMetrics.paddingBottom).toBeLessThanOrEqual(0.5);
    expect(mainPaddingTop).toBeLessThanOrEqual(0.5);
    expect(subtitleMetrics.paddingTop).toBeGreaterThanOrEqual(5);
    expect(Math.abs(navMetrics.paddingTop - subtitleMetrics.paddingBottom)).toBeLessThanOrEqual(0.5);
    expect(navMetrics.wordmarkSize).toBeGreaterThanOrEqual(39.5);
    expect(subtitleSize).toBeGreaterThanOrEqual(13.5);
    expect(subtitleSize).toBeLessThanOrEqual(14.5);
  }
});