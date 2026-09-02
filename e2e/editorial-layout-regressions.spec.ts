import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

const MOBILE = { width: 390, height: 844 } as const;

test.describe("Editorial spacing regressions", () => {
  test("wide editorial pages keep a calmer mobile gutter without horizontal overflow", async ({ page }) => {
    await page.setViewportSize(MOBILE);

    for (const route of ["/about", "/security"] as const) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const main = page.locator("main").first();
      await expect(main).toBeVisible();
      await expect.poll(() => main.evaluate((element) => getComputedStyle(element).paddingLeft)).toBe("20px");
      expect(await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)).toBe(false);
    }
  });

  test("contract editor centers only its masthead and gives expanded copy real breathing room", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await seedAndGo(page, "/contract?a=pw-alex-001&b=pw-sam-002", [PROFILE_ALEX, PROFILE_SAM]);

    const main = page.locator("main.contract-print");
    await expect.poll(() => main.evaluate((element) => getComputedStyle(element).paddingLeft)).toBe("20px");

    const heading = page.getByRole("heading", { name: /Alex.*Sam/ });
    const box = await heading.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs((box!.x + box!.width / 2) - MOBILE.width / 2)).toBeLessThan(6);

    await page.getByRole("button", { name: "Lees meer" }).click();
    const preamble = page.getByTestId("contract-preamble");
    await expect(preamble.locator("p:visible")).toHaveCount(4);
    expect(await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)).toBe(false);
  });

  test("Home overflow utility keeps a 44px target with deliberate top and right gutters", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await seedAndGo(page, "/", [PROFILE_ALEX, PROFILE_SAM]);

    const more = page.getByTestId("home-topnav-more");
    const box = await more.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs(MOBILE.width - (box!.x + box!.width) - 20)).toBeLessThan(2);
    expect(box!.y).toBeGreaterThanOrEqual(3);
    expect(box!.y).toBeLessThanOrEqual(5);

    for (const label of ["Nieuw profiel", "Scan profiel"] as const) {
      const title = page.getByText(label, { exact: true });
      await expect.poll(() => title.evaluate((element) => getComputedStyle(element).whiteSpace)).toBe("nowrap");
    }
    expect(await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)).toBe(false);
  });
});
