import { expect, test } from "@playwright/test";
import { seedAndGo } from "./fixtures";

test("a genuine follow-up paints only its editorial phrase without moving the answers", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/hot/questions/follow-up", []);
  const answers = page.getByRole("group", { name: "Status kiezen" });
  const mark = page.locator("[data-follow-up-emphasis]");
  const yes = answers.getByRole("button", { name: /Heel graag/ });
  await expect(yes).toBeVisible();
  await expect(mark).toHaveCount(0);
  const before = await yes.boundingBox();
  await yes.click();
  await expect(page.getByText("Vervolgvraag", { exact: true })).toBeVisible();
  await expect(mark).toHaveCount(2);
  await expect(mark.first()).toHaveText("afgesproken");
  await expect(mark.last()).toHaveText("titels,");
  const after = await yes.boundingBox();
  expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await mark.first().evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  await yes.click();
  await expect(mark).toHaveCount(0);
});

test("a hard boundary does not trigger the continuation emphasis", async ({ page }) => {
  await seedAndGo(page, "/hot/questions/follow-up", []);
  await page.getByRole("group", { name: "Status kiezen" }).getByRole("button", { name: /Harde grens/ }).click();
  await expect(page.getByTestId("question-title")).not.toHaveText(/D\/s/);
  await expect(page.locator("[data-follow-up-emphasis]")).toHaveCount(0);
});
