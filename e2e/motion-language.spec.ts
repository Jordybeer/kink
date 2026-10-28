import { expect, test, type Locator } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

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
  await page.setViewportSize({ width: 375, height: 844 });
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
  await page.setViewportSize({ width: 375, height: 844 });
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}/questions`, [PROFILE_ALEX]);

  const progress = page.getByTestId("questions-top-progress-fill");
  await expect(progress).toBeVisible();
  const choices = page.getByRole("group", { name: "Status kiezen" });
  await expect(choices).toBeVisible();
  const choice = choices.getByRole("button").first();
  const marker = choices.locator("[data-status-indicator]").first();
  expect((await transition(marker)).property).not.toContain("transform");

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

test("settings choices and switches respond immediately without moving under reduced motion", async ({ page }) => {
  await seedAndGo(page, "/", [PROFILE_ALEX]);
  await page.getByRole("button", { name: "Instellingen" }).click();
  const settings = page.getByRole("dialog", { name: "Instellingen" });
  const backup = settings.getByRole("button", { name: /Back-up maken/ });
  expect((await transition(backup)).duration).toContain(0.14);
  const light = settings.getByRole("radio", { name: "Licht", exact: true });
  await light.check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const lightSurface = light.locator("xpath=following-sibling::span");
  expect((await transition(lightSurface)).duration).toContain(0.19);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect((await transition(backup)).duration.every((d) => d === 0)).toBe(true);
  expect((await transition(lightSurface)).duration.every((d) => d === 0)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(settings).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Instellingen" })).toBeFocused();
});

test("ambient motion pauses while the document is hidden and resumes without remounting", async ({ page }) => {
  await seedAndGo(page, "/", [PROFILE_ALEX]);
  const orb = page.locator(".ks-ambient-orb-top");
  await expect(orb).toHaveCSS("animation-play-state", "running");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(orb).toHaveCSS("animation-play-state", "paused");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(orb).toHaveCSS("animation-play-state", "running");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(orb).toHaveCSS("animation-name", "none");
  await expect(page.getByRole("link", { name: "Alex Dominant openen" })).toBeVisible();
});


test("scene reorder keeps the focused control and aftercare honours disabled and reduced states", async ({ page }) => {
  await seedAndGo(page, `/scene?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}`, [PROFILE_ALEX, PROFILE_SAM]);
  for (const name of ["Start rustig", "Samen afronden"]) {
    await page.getByLabel("Eigen item").fill(name);
    await page.getByRole("button", { name: "Item toevoegen" }).click();
  }
  const rows = page.locator(".scene-item-reorder");
  // Framer owns the positional transform; CSS must not tween its projection frames.
  await expect(rows.first()).toHaveCSS("transition-duration", "0s");
  await rows.first().getByRole("button", { name: "Details", exact: true }).click();
  const move = rows.first().getByRole("button", { name: "Naar beneden verplaatsen" });
  await move.focus();
  await page.keyboard.press("Enter");
  await expect(rows.last()).toContainText("Start rustig");
  await expect(rows.last().getByRole("button", { name: "Naar boven verplaatsen" })).toBeFocused();
  await expect(rows.last()).toHaveCSS("transform", "none");
  await page.getByRole("button", { name: "Scène inplannen" }).click();
  await page.getByRole("button", { name: "Scène afronden" }).click();
  const sheet = page.getByRole("dialog", { name: "Aftercare check-in" });
  const save = sheet.getByRole("button", { name: "Opslaan", exact: true });
  await expect(save).toBeDisabled();
  const box = await save.boundingBox();
  if (!box) throw new Error("Missing aftercare save button");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(save).toHaveCSS("transform", "none");
  await page.mouse.up();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const choice = sheet.getByRole("button", { name: "Geweldig" });
  await choice.click();
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  await expect(choice).toHaveCSS("transform", "none");
  await expect(save).toBeEnabled();
  await expect(save).toHaveCSS("transition-duration", /^(0s)(, 0s)*$/);
});

test("relationship ornament pauses offscreen while contract help traps and restores keyboard focus", async ({ page }) => {
  await seedAndGo(page, `/contract?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}`, [PROFILE_ALEX, PROFILE_SAM]);
  const thread = page.locator(".ks-relation-thread").first();
  await thread.scrollIntoViewIfNeeded();
  await expect(thread).toHaveCSS("animation-play-state", "running");
  const why = page.getByRole("button", { name: "Waarom een echte naam toevoegen?", exact: true });
  await why.scrollIntoViewIfNeeded();
  await expect(thread).toHaveCSS("animation-play-state", "paused");
  await why.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Waarom echte namen toevoegen" });
  await expect(dialog).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Sluiten" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Sluiten" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(why).toBeFocused();
});

test("quick sheet keeps finite backdrop opacity through interruption, live reduced motion and numeric dragging", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/intimacy", [PROFILE_ALEX, PROFILE_SAM]);
  await page.evaluate(() => {
    const state = window as unknown as { sheetOpacityWrites: string[] };
    state.sheetOpacityWrites = [];
    Object.defineProperty(CSSStyleDeclaration.prototype, "opacity", {
      configurable: true,
      get() { return this.getPropertyValue("opacity"); },
      set(value) { state.sheetOpacityWrites.push(String(value)); this.setProperty("opacity", String(value)); },
    });
  });
  const trigger = page.getByRole("button", { name: "Moment plannen", exact: true }).first();
  const sheet = page.getByRole("dialog", { name: "Intiem moment plannen", exact: true });
  const scrollBefore = await page.evaluate(() => window.scrollY);
  for (let index = 0; index < 3; index++) {
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(sheet).toBeFocused();
    if (index === 1) await page.emulateMedia({ reducedMotion: "reduce" });
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    // Reopen during exit rather than waiting for the sheet to unmount.
    await page.keyboard.press("Enter");
    await expect(sheet).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
  }
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(scrollBefore, 0);
  const writes = await page.evaluate(() => (window as unknown as { sheetOpacityWrites: string[] }).sheetOpacityWrites);
  expect(writes.length).toBeGreaterThan(0);
  expect(writes.every((value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1)).toBe(true);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(`/scene?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}`);
  const addKinks = page.getByRole("button", { name: "Kinks toevoegen", exact: true });
  await addKinks.click();
  const draggable = page.getByRole("dialog", { name: "Kinks toevoegen", exact: true });
  await expect(draggable).toBeFocused();
  const handle = draggable.getByRole("heading", { name: "Toevoegen aan setlist", exact: true });
  await expect.poll(() => draggable.evaluate((element) => Math.abs(element.getBoundingClientRect().bottom - window.innerHeight))).toBeLessThan(1);
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 65, { steps: 12 });
  const opacity = await page.locator('[aria-hidden="true"].fixed.inset-0 > div').last().evaluate((element) => Number(getComputedStyle(element).opacity));
  expect(opacity).toBeGreaterThan(0);
  expect(opacity).toBeLessThan(1);
  await testInfo.attach("sheet-motion-measurements", {
    body: JSON.stringify({ finiteOpacityWrites: writes.length, numericDragOpacity: opacity, scrollBefore, scrollAfter: await page.evaluate(() => window.scrollY) }),
    contentType: "application/json",
  });
  await page.mouse.up();
  await page.keyboard.press("Escape");
  await expect(draggable).toHaveCount(0);
  await expect(addKinks).toBeFocused();
});
