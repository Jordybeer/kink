import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

const PROFILES = [PROFILE_ALEX, PROFILE_SAM];

test("TopNav keeps Home inset left and content chrome quiet without changing the command contract", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/", PROFILES);

  const homeNav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
  await expect(homeNav).toHaveAttribute("data-top-nav-variant", "home");
  const homeCluster = homeNav.getByTestId("home-topnav-actions");
  await expect(homeCluster).toBeVisible();

  const [homeNavBox, homeClusterBox] = await Promise.all([
    homeNav.boundingBox(),
    homeCluster.boundingBox(),
  ]);
  expect(homeNavBox).not.toBeNull();
  expect(homeClusterBox).not.toBeNull();
  expect(homeNavBox!.height).toBeGreaterThanOrEqual(55);
  expect(homeNavBox!.height).toBeLessThanOrEqual(57);
  expect(homeClusterBox!.width).toBeLessThan(homeNavBox!.width * 0.6);
  expect(homeClusterBox!.x - homeNavBox!.x).toBeGreaterThanOrEqual(20);
  expect(homeClusterBox!.x - homeNavBox!.x).toBeLessThanOrEqual(30);
  expect(homeClusterBox!.y - homeNavBox!.y).toBeGreaterThanOrEqual(3);
  expect(homeClusterBox!.y - homeNavBox!.y).toBeLessThanOrEqual(5);
  expect(homeClusterBox!.y + homeClusterBox!.height).toBeLessThanOrEqual(homeNavBox!.y + homeNavBox!.height + 2);
  await expect.poll(() => homeCluster.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("auto");

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
    position: "sticky",
    backgroundColor: "rgba(0, 0, 0, 0)",
    borderBottomWidth: "0px",
    pointerEvents: "none",
  });

  await homeNav.getByRole("button", { name: "Meer over KinkSync" }).click();
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
  const primaryAction = contentNav.getByRole("button", { name: "Contractverzoek scannen" });
  await expect(back).toBeVisible();
  await expect(primaryAction).toBeVisible();

  const [backBox, primaryActionBox] = await Promise.all([
    back.boundingBox(),
    primaryAction.boundingBox(),
  ]);
  expect(backBox).not.toBeNull();
  expect(primaryActionBox).not.toBeNull();
  for (const box of [backBox!, primaryActionBox!]) {
    expect(box.width).toBeGreaterThanOrEqual(43);
    expect(box.width).toBeLessThanOrEqual(45);
    expect(box.height).toBeGreaterThanOrEqual(43);
    expect(box.height).toBeLessThanOrEqual(45);
  }

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
