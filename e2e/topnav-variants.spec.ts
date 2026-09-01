import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

const PROFILES = [PROFILE_ALEX, PROFILE_SAM];

test("TopNav keeps Home branded, centered and accessible while content chrome stays quiet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/", PROFILES);

  const homeNav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
  await expect(homeNav).toHaveAttribute("data-top-nav-variant", "home");
  const homeActions = homeNav.getByTestId("home-topnav-actions");
  const homeMore = homeNav.getByRole("button", { name: "Meer opties" });
  const homeIdentity = page.locator("[data-home-identity]");
  const homeWordmark = homeIdentity.locator("[data-home-nav-wordmark]");
  await expect(homeNav.getByRole("button", { name: "Instellingen openen" })).toHaveCount(0);
  await expect(homeActions).toBeVisible();
  await expect(homeMore).toBeVisible();
  await expect(homeWordmark).toHaveText("KinkSync");

  const [homeNavBox, homeIdentityBox, homeActionsBox, homeMoreBox, homeWordmarkBox] = await Promise.all([
    homeNav.boundingBox(),
    homeIdentity.boundingBox(),
    homeActions.boundingBox(),
    homeMore.boundingBox(),
    homeWordmark.boundingBox(),
  ]);
  expect(homeNavBox).not.toBeNull();
  expect(homeIdentityBox).not.toBeNull();
  expect(homeActionsBox).not.toBeNull();
  expect(homeMoreBox).not.toBeNull();
  expect(homeWordmarkBox).not.toBeNull();
  expect(homeNavBox!.height).toBeGreaterThanOrEqual(55);
  expect(homeNavBox!.height).toBeLessThanOrEqual(57);
  expect(homeNavBox!.x + homeNavBox!.width - (homeMoreBox!.x + homeMoreBox!.width)).toBeGreaterThanOrEqual(15);
  expect(homeNavBox!.x + homeNavBox!.width - (homeMoreBox!.x + homeMoreBox!.width)).toBeLessThanOrEqual(17);
  expect(homeIdentityBox!.y).toBeGreaterThanOrEqual(homeNavBox!.y + homeNavBox!.height);
  expect(Math.abs(
    homeWordmarkBox!.x + homeWordmarkBox!.width / 2
      - (homeIdentityBox!.x + homeIdentityBox!.width / 2),
  )).toBeLessThanOrEqual(1);
  expect(homeMoreBox!.width).toBeGreaterThanOrEqual(43);
  expect(homeMoreBox!.height).toBeGreaterThanOrEqual(43);
  expect(homeMoreBox!.y - homeNavBox!.y).toBeGreaterThanOrEqual(3);
  expect(homeMoreBox!.y - homeNavBox!.y).toBeLessThanOrEqual(6);
  expect(homeMoreBox!.y + homeMoreBox!.height).toBeLessThanOrEqual(homeNavBox!.y + homeNavBox!.height + 2);
  await expect.poll(() => homeActions.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("auto");

  const homeHeader = await homeNav.evaluate((element) => {
    const header = element.parentElement;
    if (!header) return null;
    const style = getComputedStyle(header);
    return {
      position: style.position,
      backgroundColor: style.backgroundColor,
      borderBottomWidth: style.borderBottomWidth,
      pointerEvents: style.pointerEvents,
    };
  });
  expect(homeHeader).toEqual({
    position: "static",
    backgroundColor: "rgba(0, 0, 0, 0)",
    borderBottomWidth: "0px",
    pointerEvents: "none",
  });

  await homeMore.click();
  const homeMenu = page.getByRole("menu");
  await expect(homeMenu).toBeVisible();
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

  const [backBox, primaryActionBox] = await Promise.all([
    back.boundingBox(),
    primaryAction.boundingBox(),
  ]);
  expect(backBox).not.toBeNull();
  expect(primaryActionBox).not.toBeNull();
  expect(backBox!.width).toBeGreaterThanOrEqual(43);
  expect(backBox!.width).toBeLessThanOrEqual(45);
  expect(backBox!.height).toBeGreaterThanOrEqual(43);
  expect(backBox!.height).toBeLessThanOrEqual(45);
  expect(primaryActionBox!.width).toBeGreaterThanOrEqual(72);
  expect(primaryActionBox!.width).toBeLessThanOrEqual(110);
  expect(primaryActionBox!.height).toBeGreaterThanOrEqual(43);
  expect(primaryActionBox!.height).toBeLessThanOrEqual(45);

  const contentGeometry = await contentRow.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      radius: Number.parseFloat(style.borderTopLeftRadius),
      borderWidth: style.borderTopWidth,
      height: element.getBoundingClientRect().height,
      pointerEvents: style.pointerEvents,
      backgroundColor: style.backgroundColor,
    };
  });
  expect(contentGeometry.radius).toBeLessThanOrEqual(1);
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
      pointerEvents: style.pointerEvents,
    };
  });
  expect(contentHeader).toEqual({
    position: "sticky",
    borderBottomWidth: "0px",
    pointerEvents: "none",
  });
});
