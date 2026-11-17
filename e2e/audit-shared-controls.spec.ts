import { expect, test, type Locator, type Page } from "@playwright/test";
import { buildStore, PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

const profiles = [PROFILE_ALEX, PROFILE_SAM];
const pair = `a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}`;
const longAlias = "Alex" + "langealias".repeat(16);

async function expectFit(dialog: Locator, page: Page) {
  await expect.poll(async () => {
    const box = await dialog.boundingBox();
    const viewport = page.viewportSize()!;
    return Boolean(box && box.x >= 0 && box.y >= 0 &&
      box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1 &&
      await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth + 1));
  }).toBe(true);
}

async function expectTarget(control: Locator) {
  const box = (await control.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
}

async function expectTrap(dialog: Locator, page: Page) {
  await expect(dialog).toBeFocused();
  const buttons = dialog.getByRole("button");
  await page.keyboard.press("Shift+Tab");
  await expect(buttons.last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(buttons.first()).toBeFocused();
}

async function ink(canvas: Locator) {
  return canvas.evaluate((node: HTMLCanvasElement) => {
    const data = node.getContext("2d")!.getImageData(0, 0, node.width, node.height).data;
    return data.some((value, index) => index % 4 === 3 && value > 0);
  });
}

test("signature Sheet traps focus, preserves ink, clears and fits short enlarged viewports", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/contract?${pair}`, [{ ...PROFILE_ALEX, name: longAlias }, PROFILE_SAM]);
  const trigger = page.getByRole("button", { name: `Handtekeningveld openen voor ${longAlias}`, exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: `Handtekening zetten voor ${longAlias}`, exact: true });
  await expectTrap(dialog, page);
  const canvas = dialog.locator("canvas");
  await expect(canvas).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  expect(await canvas.evaluate((node: HTMLCanvasElement) => node.width)).toBeGreaterThan(0);
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 20, box.y + 130, { steps: 12 });
  await page.mouse.up();
  await expect(dialog).toBeVisible();
  expect(await ink(canvas)).toBe(true);
  await dialog.getByRole("button", { name: "Klaar", exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(await ink(trigger.locator("canvas"))).toBe(true);
  await trigger.click();
  await expect(dialog).toBeFocused();
  expect(await ink(canvas)).toBe(true);
  await page.setViewportSize({ width: 640, height: 360 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expectFit(dialog, page);
  await expect(dialog.getByTestId("sheet-scroll-body")).toHaveCount(1);
  await expectTarget(dialog.getByRole("button", { name: "Handtekening sluiten", exact: true }));
  await expect(dialog.getByTestId("sheet-footer")).toBeInViewport();
  await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/audit-signature-short.png` });
  await page.setViewportSize({ width: 320, height: 667 });
  await expectFit(dialog, page);
  await expect(dialog.getByRole("heading", { name: "Handtekening", exact: true })).toBeInViewport();
  await expect(dialog.getByRole("button", { name: "Handtekening sluiten", exact: true })).toBeInViewport();
  await expect(dialog.getByTestId("sheet-footer")).toBeInViewport();
  const body = dialog.getByTestId("sheet-scroll-body");
  expect((await body.boundingBox())!.height).toBeGreaterThan(44);
  await expect(body.getByText(longAlias, { exact: true })).toBeVisible();
  expect(await body.getByText(longAlias, { exact: true }).evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await body.evaluate((node) => { node.scrollTop = node.scrollHeight; });
  await expect(canvas).toBeInViewport();
  await dialog.getByRole("button", { name: "Wis", exact: true }).click();
  expect(await ink(canvas)).toBe(false);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  expect(await ink(trigger.locator("canvas"))).toBe(false);
});

test("time Sheet uses 44px choices, explicit confirmation, focus return and a short single-scroll frame", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await seedAndGo(page, `/scene?${pair}`, profiles);
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  const trigger = page.getByLabel("Tijd", { exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Starttijd", exact: true });
  await expectTrap(dialog, page);
  await expectFit(dialog, page);
  const hours = dialog.getByRole("group", { name: "Uur", exact: true }).getByRole("button");
  const minutes = dialog.getByRole("group", { name: "Minuten", exact: true }).getByRole("button");
  await expect(hours).toHaveCount(24);
  await expect(minutes).toHaveCount(4);
  for (const control of [...await hours.all(), ...await minutes.all()]) await expectTarget(control);
  await expect(dialog.getByTestId("sheet-scroll-body")).toHaveCount(1);
  await expect(dialog.getByTestId("sheet-footer")).toBeInViewport();
  await dialog.getByRole("button", { name: "21", exact: true }).click();
  await dialog.getByRole("button", { name: ":45", exact: true }).click();
  await expect(trigger).not.toHaveText("21:45");
  await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/audit-time-short.png` });
  await dialog.getByRole("button", { name: "Bevestigen", exact: true }).click();
  await expect(trigger).toHaveText("21:45");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "22", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveText("21:45");
});

test("contracts tabs link panels and move selection with arrows, Home and End", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 667 });
  await seedAndGo(page, "/contracts", profiles);
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  const tabs = page.getByRole("tablist", { name: "Contractstatus" });
  for (const tab of await tabs.getByRole("tab").all()) {
    await expectTarget(tab);
    expect(await tab.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    expect(await tab.evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const box = node.getBoundingClientRect();
      return Array.from(range.getClientRects()).every((rect) => rect.left >= box.left - 1 && rect.right <= box.right + 1);
    })).toBe(true);
  }
  await tabs.getByRole("tab", { name: "Actief", exact: true }).focus();
  for (const [key, name] of [["ArrowRight", "Gepauzeerd"], ["ArrowRight", "Archief"], ["ArrowRight", "Actief"], ["ArrowLeft", "Archief"], ["Home", "Actief"], ["End", "Archief"]]) {
    await page.keyboard.press(key);
    const active = tabs.getByRole("tab", { name, exact: true });
    await expect(active).toBeFocused();
    await expect(active).toHaveAttribute("aria-selected", "true");
    await expect(active).toHaveAttribute("tabindex", "0");
    await expect(tabs.locator('[tabindex="-1"]')).toHaveCount(2);
    const panel = page.getByRole("tabpanel", { name, exact: true });
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("id", (await active.getAttribute("aria-controls"))!);
    await expect(panel).toHaveAttribute("aria-labelledby", (await active.getAttribute("id"))!);
  }
  await page.keyboard.press("Tab");
  await expect(page.getByRole("tabpanel", { name: "Archief", exact: true })).toBeFocused();
});

test("quick sharing is centered and bounded on desktop, with a static readable QR error", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.toDataURL = () => { throw new Error("QR rendering unavailable for test"); };
  });
  const profile = { ...PROFILE_ALEX, name: longAlias };
  await seedAndGo(page, `/profile?id=${profile.id}`, [profile]);
  await page.getByLabel("Hoofdnavigatie").getByRole("button", { name: "Meer acties" }).click();
  await page.getByRole("menuitem", { name: "Profiel delen" }).click();
  const dialog = page.getByRole("dialog", { name: "Profiel delen", exact: true });
  await expect(dialog).toBeFocused();
  const error = dialog.getByRole("alert");
  await expect(error).toHaveText("QR-code kon niet worden opgebouwd.");
  await expect(error).toHaveAttribute("aria-busy", "false");
  await expect(error).toHaveCSS("animation-name", "none");
  await expect(dialog.getByLabel("QR-code laden…")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Kopieer volledige link" })).toBeEnabled();
  const box = (await dialog.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(512);
  expect(box.x + box.width / 2).toBeCloseTo(640, 0);
  await expectFit(dialog, page);
  const scrollBody = dialog.getByTestId("profile-share-scroll-body");
  await expect(dialog.locator("[data-sheet-scroll-owner]")).toHaveCount(0);
  const name = scrollBody.getByText(profile.name, { exact: false });
  expect(await name.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await expectTarget(dialog.getByRole("button", { name: "Profiel delen sluiten" }));
  await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/audit-share-desktop.png` });
  await page.setViewportSize({ width: 320, height: 667 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expectFit(dialog, page);
  await expect(dialog.getByRole("button", { name: "Profiel delen sluiten" })).toBeInViewport();
  expect((await scrollBody.boundingBox())!.height).toBeGreaterThan(44);
  expect(await name.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await error.scrollIntoViewIfNeeded();
  await expect(error).toBeInViewport();
  await expect(error).toHaveCSS("animation-name", "none");
  expect(await error.evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
});

test("long-name quick actions and linked deletion scroll at 320px/200% without content drag dismissal", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 667 });
  await seedAndGo(page, "/", profiles.map((profile) => ({ ...profile, name: longAlias, personGroupId: "audit-linked-person" })));
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  const trigger = page.getByRole("button", { name: `Meer acties voor ${longAlias}`, exact: true }).first();
  await trigger.click();
  const actions = page.getByRole("dialog", { name: `Acties voor ${longAlias}`, exact: true });
  await expectFit(actions, page);
  const scrollBody = actions.locator("[data-sheet-scroll-owner]");
  await expect(scrollBody).toHaveCount(1);
  expect(await scrollBody.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
  const name = actions.getByRole("heading", { name: longAlias, exact: true });
  const nameBox = (await name.boundingBox())!;
  await page.mouse.move(nameBox.x + 10, nameBox.y + 20);
  await page.mouse.down();
  await page.mouse.move(nameBox.x + 10, nameBox.y + 140, { steps: 10 });
  await page.mouse.up();
  await expect(actions).toBeVisible();
  await scrollBody.hover();
  await page.mouse.wheel(0, 400);
  await expect.poll(() => scrollBody.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await expect(actions).toBeVisible();
  const cancel = actions.getByRole("button", { name: "Annuleren", exact: true });
  await cancel.scrollIntoViewIfNeeded();
  await expect(cancel).toBeInViewport();
  await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/audit-quick-actions-enlarged.png` });
  await scrollBody.evaluate((node) => { node.scrollTop = 0; });
  const handle = actions.locator("[data-sheet-handle]");
  await handle.scrollIntoViewIfNeeded();
  const handleBox = (await handle.boundingBox())!;
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 + 120, { steps: 12 });
  await page.mouse.up();
  await expect(actions).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await actions.getByRole("button", { name: "Profiel verwijderen", exact: true }).click();
  const deletion = page.getByRole("dialog", { name: "Gekoppeld profiel verwijderen", exact: true });
  await expectFit(deletion, page);
  const deletionBody = deletion.locator("[data-sheet-scroll-owner]");
  await expect(deletionBody).toHaveCount(1);
  expect(await deletionBody.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
  await expect(deletion.getByText(`${longAlias} heeft een dominant en submissief profiel met aparte antwoorden.`, { exact: true })).toBeVisible();
  for (const button of await deletion.getByRole("button").all()) {
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeInViewport();
    await expectTarget(button);
  }
  await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/audit-linked-deletion-enlarged.png` });
  await deletion.getByRole("button", { name: "Annuleren", exact: true }).click();
  await expect(deletion).toBeHidden();
  await expect(page.getByRole("button", { name: `Meer acties voor ${longAlias}`, exact: true })).toHaveCount(2);
});

test("profile filters use compact columns and reflow at 320px with enlarged text", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, `/profile?id=${PROFILE_ALEX.id}`, profiles);
  const filters = page.getByRole("group", { name: "Antwoordstatus" });
  await expect(filters.getByRole("button")).toHaveCount(5);
  expect(await filters.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length)).toBe(2);
  for (const control of await filters.getByRole("button").all()) await expectTarget(control);
  await filters.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/audit-profile-filters.png` });
  await page.setViewportSize({ width: 320, height: 667 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  expect(await filters.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length)).toBe(1);
  expect(await filters.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await page.getByTestId("profile-read-status-maybe").click();
  await expect(page.getByTestId("profile-read-status-maybe")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#profile-read-status-maybe-content")).toContainText("Nog geen openbare antwoorden met deze status.");
  await expect(page.getByTestId("profile-read-hard-limits")).toContainText("Breath restriction / neck pressure");
  await expect(page.getByTestId("profile-hero")).toHaveCSS("animation-name", "none");
});

test("live Reduced Motion stops CSS spinners while AppLock keeps loading status visible", async ({ page }) => {
  const base = buildStore(profiles);
  await page.addInitScript((store) => {
    localStorage.setItem("kink-profiles", JSON.stringify(store));
    Object.defineProperty(navigator.credentials, "get", { configurable: true, value: () => new Promise(() => {}) });
  }, { ...base, state: { ...base.state, appLockEnabled: true, appLockPin: "locked-for-e2e", biometricEnabled: true, biometricCredentialId: "dGVzdA" } });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const loading = page.getByRole("button", { name: "Controleren…", exact: true });
  await expect(loading).toBeVisible();
  const biometricSpinner = loading.locator("svg");
  await expect(biometricSpinner).not.toHaveCSS("animation-name", "none");
  // CSS probe for the shared route spinner, which normally disappears after hydration.
  await page.evaluate(() => {
    const spinner = document.createElement("span");
    spinner.className = "ks-spinner";
    spinner.dataset.testid = "route-spinner-probe";
    document.body.append(spinner);
  });
  const spinner = page.getByTestId("route-spinner-probe");
  await expect(spinner).toHaveCSS("animation-name", "ks-spin");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(biometricSpinner).toHaveCSS("animation-name", "none");
  await expect(spinner).toHaveCSS("animation-name", "none");
  await expect(loading).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(spinner).toHaveCSS("animation-name", "ks-spin");
});
