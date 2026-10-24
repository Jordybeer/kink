import { expect, test, type Locator, type Page } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo, seedProfiles } from "./fixtures";
import type { SceneRecord } from "@/types";

async function bodyFor(page: Page, trigger: Locator) {
  const id = await trigger.getAttribute("aria-controls");
  expect(id).toBeTruthy();
  return page.locator(`[id=${JSON.stringify(id)}]`);
}

async function timing(body: Locator) {
  return body.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      properties: style.transitionProperty.split(",").map((v) => v.trim()),
      durations: style.transitionDuration.split(",").map((v) => Number.parseFloat(v)),
      easing: style.transitionTimingFunction,
    };
  });
}

async function addSceneItem(page: Page) {
  await seedAndGo(page, `/scene?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}`, [PROFILE_ALEX, PROFILE_SAM]);
  await page.getByLabel("Eigen item").fill("Start rustig");
  await page.getByRole("button", { name: "Item toevoegen" }).click();
  const row = page.locator(".scene-item-reorder").first();
  const trigger = row.locator("button[aria-controls]");
  return { row, trigger, body: await bodyFor(page, trigger) };
}

test("Scene disclosure has zero closed footprint and excludes controls as soon as it closes", async ({ page }) => {
  const { row, trigger, body } = await addSceneItem(page);
  await expect(body).toHaveAttribute("aria-hidden", "true");
  expect(await body.evaluate((element) => (element as HTMLElement).inert)).toBe(true);
  expect(await body.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThanOrEqual(1);
  const note = row.getByRole("textbox", { name: "Notitie bij Start rustig", includeHidden: true });
  await note.evaluate((element) => (element as HTMLElement).focus());
  await expect(note).not.toBeFocused();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(body).toHaveAttribute("aria-hidden", "false");
  await expect(note).toBeVisible();
  await expect.poll(() => body.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(20);
  // Inspect the first DOM commit, while closing motion may still be running.
  const atClose = await trigger.evaluate((element) => new Promise<{ hidden: string | null; inert: boolean }>((resolve) => {
    const observer = new MutationObserver(() => {
      if (element.getAttribute("aria-expanded") !== "false") return;
      const body = document.getElementById(element.getAttribute("aria-controls")!)!;
      observer.disconnect();
      resolve({ hidden: body.getAttribute("aria-hidden"), inert: body.inert });
    });
    observer.observe(element, { attributes: true, attributeFilter: ["aria-expanded"] });
    (element as HTMLButtonElement).click();
  }));
  expect(atClose).toEqual({ hidden: "true", inert: true });
  await expect.poll(() => body.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThanOrEqual(1);
  await trigger.focus();
  await page.keyboard.press("Tab");
  expect(await body.evaluate((element) => element.contains(document.activeElement))).toBe(false);
});

test("Scene reversals retain input and use the original timing with live Reduced Motion", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const { row, trigger, body } = await addSceneItem(page);
  await expect.poll(async () => (await timing(body)).durations).toEqual([0.22, 0.19]);
  expect((await timing(body)).properties).toEqual(["grid-template-rows", "opacity"]);
  expect((await timing(body)).easing).toContain("cubic-bezier(0.16, 1, 0.3, 1)");
  await trigger.click();
  const note = row.getByRole("textbox", { name: "Notitie bij Start rustig" });
  await note.fill("Rustig beginnen en samen afstemmen");
  // Reverse each transition on the next animation frame, well before 220ms.
  await trigger.evaluate(async (element) => {
    for (let index = 0; index < 4; index++) {
      (element as HTMLButtonElement).click();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  });
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(note).toHaveValue("Rustig beginnen en samen afstemmen");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(async () => (await timing(body)).durations.every((value) => value === 0)).toBe(true);
  await trigger.click();
  await expect(body).toHaveAttribute("aria-hidden", "true");
  expect(await body.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThanOrEqual(1);
  await trigger.click();
  await expect(note).toHaveValue("Rustig beginnen en samen afstemmen");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(async () => (await timing(body)).durations).toEqual([0.22, 0.19]);
  await page.screenshot({ path: `screenshots/theme-rehearsal/settings-motion/${testInfo.project.name}/scene.png`, fullPage: true });
});

const scene: SceneRecord = {
  id: "disclosure-scene", title: "Een rustig moment", profileAId: PROFILE_ALEX.id, profileBId: PROFILE_SAM.id,
  profileAName: "Alex", profileBName: "Sam", status: "draft", createdAt: 1700000002000, updatedAt: 1700000002000,
  items: [{ id: "disclosure-item", name: "Start rustig", intensity: "zacht", duration: "5 min", note: "Samen afstemmen", fromKink: false }],
};

async function seedScene(page: Page, value: SceneRecord, url: string) {
  await seedProfiles(page, [PROFILE_ALEX, PROFILE_SAM]);
  await page.evaluate((scene) => {
    const store = JSON.parse(localStorage.getItem("kink-profiles")!);
    store.state.scenes = [scene];
    localStorage.setItem("kink-profiles", JSON.stringify(store));
  }, value);
  await page.goto(url);
}

test("locked Scene details render open immediately and remain visible", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { initialLockedDisclosure?: { opacity: string; hidden: string | null; height: number; animations: number } };
    new MutationObserver(() => {
      const body = document.getElementById("scene-item-details-disclosure-item");
      if (!body || state.initialLockedDisclosure) return;
      state.initialLockedDisclosure = {
        opacity: getComputedStyle(body).opacity,
        hidden: body.getAttribute("aria-hidden"),
        height: body.getBoundingClientRect().height,
        animations: body.getAnimations().length,
      };
    }).observe(document, { childList: true, subtree: true });
  });
  await seedScene(page, { ...scene, consentLockedAt: 1700000002000 }, `/scene?id=${scene.id}`);
  const trigger = page.locator(".scene-item-reorder button[aria-controls]");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const body = await bodyFor(page, trigger);
  await expect(body).toHaveAttribute("aria-hidden", "false");
  expect(await body.evaluate((element) => (element as HTMLElement).inert)).toBe(false);
  await expect(page.getByRole("textbox", { name: "Notitie bij Start rustig" })).toHaveValue("Samen afstemmen");
  expect(await body.evaluate((element) => element.getAnimations().length)).toBe(0);
  const initial = await page.evaluate(() => (window as unknown as { initialLockedDisclosure: { opacity: string; hidden: string | null; height: number; animations: number } }).initialLockedDisclosure);
  expect(initial.opacity).toBe("1");
  expect(initial.hidden).toBe("false");
  expect(initial.height).toBeGreaterThan(20);
  expect(initial.animations).toBe(0);
  // aria-disabled on the locked row intentionally disables descendant controls.
  // Read-only details are already open; never force an editing interaction.
  await expect(trigger).toBeDisabled();
  const row = page.locator(".scene-item-reorder");
  await expect(row).toHaveAttribute("aria-disabled", "true");
  await expect(row.getByRole("button", { name: "Zacht", exact: true })).toBeDisabled();
  await expect(row.getByRole("textbox", { name: "Notitie bij Start rustig" })).toHaveAttribute("readonly", "");
  await expect(row.getByRole("button", { name: /verwijderen|Naar .* verplaatsen/ })).toHaveCount(0);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(body).toHaveCSS("opacity", "1");
});

test("consent technical help is keyboard operable while the main agreement stays visible", async ({ page }) => {
  await seedScene(page, scene, `/scenes/view?id=${scene.id}`);
  const trigger = page.getByRole("button", { name: "Technische details", exact: true });
  await expect(trigger).toBeVisible();
  const body = await bodyFor(page, trigger);
  await expect(body).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("button", { name: "Afspraken nu vastzetten" })).toBeVisible();
  const size = await trigger.boundingBox();
  expect(size!.height).toBeGreaterThanOrEqual(44);
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(body.getByText(/Dit vervangt geen gesprek/)).toBeVisible();
  await page.keyboard.press("Space");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(body).toHaveAttribute("aria-hidden", "true");
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("button", { name: "Afspraken nu vastzetten" })).toBeVisible();
});
