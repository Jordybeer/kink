import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

const MOBILE = { width: 390, height: 844 } as const;

test("profielhero zet identiteit voorop en houdt profielmetadata visueel rustig", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [{
    ...PROFILE_ALEX,
    fetLifeUsername: "alex",
    bdsmtestUrl: "https://bdsmtest.org/r/example",
    privateNote: "Alleen lokaal bewaarde context.",
  }]);

  const hero = page.getByTestId("profile-hero");
  await expect(hero).toBeVisible();

  const avatar = hero.getByRole("button", { name: "Profielfoto uploaden" });
  const name = hero.getByText("Alex", { exact: true });
  const trust = hero.getByRole("button", { name: /Bekijk bron en toestemming/ });
  const info = hero.getByRole("button", { name: "Profielinfo" });

  const [avatarBox, nameBox, trustBox, infoBox] = await Promise.all([
    avatar.boundingBox(),
    name.boundingBox(),
    trust.boundingBox(),
    info.boundingBox(),
  ]);

  expect(avatarBox).not.toBeNull();
  expect(nameBox).not.toBeNull();
  expect(trustBox).not.toBeNull();
  expect(infoBox).not.toBeNull();
  expect(avatarBox!.width).toBeGreaterThanOrEqual(64);
  expect(avatarBox!.height).toBeGreaterThanOrEqual(64);
  expect(Number.parseFloat(await name.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(31);
  expect(trustBox!.height).toBeGreaterThanOrEqual(44);
  expect(infoBox!.height).toBeGreaterThanOrEqual(44);

  for (const control of [trust, info]) {
    const chrome = await control.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        borderTopWidth: style.borderTopWidth,
      };
    });
    expect(chrome.background).toBe("rgba(0, 0, 0, 0)");
    expect(chrome.borderTopWidth).toBe("0px");
  }

  const linkedProfiles = hero.getByLabel("Gekoppelde profielen");
  await expect(linkedProfiles.getByRole("link")).toHaveCount(2);
  await expect(hero.getByText("Alleen lokaal bewaarde context.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)).toBe(false);
});
