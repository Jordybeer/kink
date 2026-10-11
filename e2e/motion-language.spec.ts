import { expect, test, type Locator } from "@playwright/test";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

async function transition(locator: Locator) {
  return locator.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      property: styles.transitionProperty.split(",").map((value) => value.trim()),
      duration: styles.transitionDuration.split(",").map((value) => Number.parseFloat(value)),
    };
  });
}

test("Home profile actions have scene-like tactile timing and become still with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/", [PROFILE_ALEX]);

  const open = page.getByRole("link", { name: "Alex Dominant openen" });
  await expect(open).toBeVisible();

  const ordinary = await transition(open);
  expect(ordinary.property).toContain("transform");
  expect(ordinary.duration.some((duration) => duration > 0)).toBe(true);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(async () => (await transition(open)).duration.every((duration) => duration === 0)).toBe(true);
});

test("questionnaire progress and answer selection share the scene motion contract", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}/questions`, [PROFILE_ALEX]);

  const progress = page.getByTestId("questions-top-progress-fill");
  await expect(progress).toBeVisible();
  const choices = page.getByRole("group", { name: "Status kiezen" });
  await expect(choices).toBeVisible();
  const choice = choices.getByRole("button").first();

  expect((await transition(progress)).property).toContain("width");
  expect((await transition(progress)).duration[0]).toBeCloseTo(0.3, 2);
  expect((await transition(choice)).property).toContain("transform");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(async () => (await transition(progress)).duration.every((duration) => duration === 0)).toBe(true);
  await expect.poll(async () => (await transition(choice)).duration.every((duration) => duration === 0)).toBe(true);
  const progressbar = page.getByRole("progressbar", { name: "Voortgang vragenlijst" });
  const before = Number(await progressbar.getAttribute("aria-valuenow"));
  await choice.click();
  await expect.poll(async () => Number(await progressbar.getAttribute("aria-valuenow"))).toBeGreaterThan(before);
});
