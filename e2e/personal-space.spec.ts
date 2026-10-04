import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

test("personal space connects Ik, Samen and Momenten to real profile data", async ({ page }) => {
  await seedAndGo(page, "/space", [PROFILE_ALEX, PROFILE_SAM], { pinnedProfileId: PROFILE_ALEX.id });

  await expect(page.getByRole("heading", { name: PROFILE_ALEX.name })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Tabbladen" }).getByRole("link", { name: "Ik" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("navigation", { name: "Tabbladen" }).getByRole("link", { name: "Samen" }).click();
  await expect(page).toHaveURL(/\/together/);
  await expect(page.getByText("Alex × Sam")).toBeVisible();

  await page.getByRole("link", { name: /Interesses naast elkaar/ }).click();
  await expect(page).toHaveURL(/\/compare\?a=pw-alex-001&b=pw-sam-002/);
  await expect(page.getByRole("link", { name: "Terug" })).toHaveAttribute(
    "href",
    "/together?a=pw-alex-001&b=pw-sam-002",
  );

  await page.getByRole("navigation", { name: "Tabbladen" }).getByRole("link", { name: "Momenten" }).click();
  await expect(page).toHaveURL(/\/moments/);
  await expect(page.getByRole("heading", { name: "Van idee naar afspraak" })).toBeVisible();
});

test("existing profiles enter Ik while explicit profile management stays available", async ({ page }) => {
  await seedAndGo(page, "/", [PROFILE_ALEX, PROFILE_SAM], { pinnedProfileId: PROFILE_ALEX.id });
  await expect(page).toHaveURL(/\/space$/);

  await page.goto("/?profiles=1");
  await expect(page).toHaveURL(/\?profiles=1$/);
  await expect(page.getByText("Mijn profielen")).toBeVisible();
});
