import { expect, test } from "@playwright/test";
import { KINKS } from "../lib/kinks";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

test("topic editor separates the primary answer from optional details without forcing a wizard", async ({ page }, testInfo) => {
  const candidate = KINKS.find((kink) => kink.description && kink.safetyNote)
    ?? KINKS.find((kink) => kink.description);
  expect(candidate).toBeTruthy();

  const profile = {
    ...PROFILE_ALEX,
    entries: {
      [candidate!.id]: {
        status: "yes" as const,
        comment: "",
        tags: ["vraag eerst", "scène specifiek"],
        curious: true,
        privateResponse: true,
      },
    },
  };

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAndGo(page, "/profile/pw-alex-001", [profile]);

  await page.getByRole("button", { name: /Onderwerpen beheren/ }).click();
  await page.getByPlaceholder("Zoek in de volledige catalogus…").fill(candidate!.name);

  const result = page.locator('button[aria-label$=", bewerken"]').filter({ hasText: candidate!.name }).first();
  await expect(result).toBeVisible();
  await result.click();

  const dialog = page.getByRole("dialog", { name: `${candidate!.name} bewerken` });
  await expect(dialog).toHaveAttribute("data-sheet-variant", "surface");
  await expect(dialog.getByRole("heading", { name: "Onderwerp bewerken" })).toBeVisible();
  const steps = dialog.getByRole("navigation", { name: "Onderwerpstappen" });
  await expect(steps).toBeVisible();
  const answerStep = steps.getByRole("button", { name: /Stap 1 van 2: Antwoord/ });
  const detailsStep = steps.getByRole("button", { name: /Stap 2 van 2: Details/ });
  await expect(answerStep).toHaveAttribute("aria-current", "step");
  await expect(answerStep.getByText("Antwoord", { exact: true })).toBeVisible();
  await expect(detailsStep.getByText("Details", { exact: true })).toBeVisible();
  await expect(detailsStep.getByText("optioneel", { exact: true })).toBeVisible();
  await expect(detailsStep).toHaveAccessibleDescription("optioneel");
  for (const control of [answerStep, detailsStep]) {
    const box = await control.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  }

  const body = dialog.getByTestId("kink-edit-scroll-body");
  const done = dialog.getByRole("button", { name: "Klaar" });
  await expect(done).toBeVisible();
  await expect(dialog.getByTestId("sheet-footer")).toHaveCount(0);

  await expect(dialog.getByRole("heading", { name: candidate!.name })).toBeVisible();
  await expect(dialog.getByText(candidate!.description!, { exact: true })).toBeVisible();
  if (candidate!.safetyNote) await expect(dialog.getByText(candidate!.safetyNote, { exact: true })).toBeVisible();

  const statusGroup = dialog.getByRole("group", { name: "Status kiezen" });
  await expect(statusGroup.getByRole("button")).toHaveCount(5);
  await expect(statusGroup.getByRole("button", { name: /Heel graag/ })).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByRole("heading", { name: "Afspraken" })).toHaveCount(0);
  await expect(dialog.getByRole("heading", { name: "Zichtbaarheid" })).toHaveCount(0);
  await expect(dialog.getByRole("heading", { name: "Context" })).toHaveCount(0);

  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await body.evaluate((node) => { node.scrollTop = 0; });
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.screenshot({
      path: `screenshots/theme-rehearsal/${testInfo.project.name}/topic-editor-${theme}-answer.png`,
      fullPage: false,
    });

    await dialog.getByRole("button", { name: "Stap 2 van 2: Details" }).click();
    await expect(dialog.getByRole("button", { name: "Stap 2 van 2: Details, huidig" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Stap 1 van 2: Antwoord, voltooid" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Details" })).toBeFocused();
    await expect(done).toBeVisible();
    await expect(detailsStep).toHaveAttribute("aria-current", "step");
    await expect(dialog.getByText(candidate!.name, { exact: false }).first()).toBeVisible();
    await expect(statusGroup).toHaveCount(0);
    await expect(dialog.getByRole("heading", { name: "Afspraken" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Zichtbaarheid" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Context" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Eerst vragen" })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByRole("button", { name: "Antwoord niet langer privé maken" })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByRole("button", { name: "Nieuwsgierig" })).toHaveAttribute("aria-pressed", "true");

    await page.screenshot({
      path: `screenshots/theme-rehearsal/${testInfo.project.name}/topic-editor-${theme}-details.png`,
      fullPage: false,
    });

    await dialog.getByRole("button", { name: "Stap 1 van 2: Antwoord" }).click();
    await expect(dialog.getByRole("button", { name: "Stap 1 van 2: Antwoord, huidig" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: candidate!.name })).toBeFocused();
  }

  await expect.poll(() => body.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);

  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expect.poll(() => body.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await expect.poll(() => dialog.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  const header = dialog.getByTestId("kink-edit-header");
  await expect.poll(() => header.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  const headingBox = (await dialog.getByRole("heading", { name: "Onderwerp bewerken" }).boundingBox())!;
  const doneBox = (await done.boundingBox())!;
  expect(headingBox.y + headingBox.height).toBeLessThanOrEqual(doneBox.y);
  for (const [control, label, number] of [[answerStep, "Antwoord", "1"], [detailsStep, "Details", "2"]] as const) {
    const controlBox = (await control.boundingBox())!;
    const numberBox = (await control.getByText(number, { exact: true }).boundingBox())!;
    const labelBox = (await control.getByText(label, { exact: true }).boundingBox())!;
    expect(controlBox.x).toBeGreaterThanOrEqual(0);
    expect(controlBox.x + controlBox.width).toBeLessThanOrEqual(320);
    expect(labelBox.x).toBeGreaterThanOrEqual(numberBox.x + numberBox.width);
    expect(controlBox.height).toBeGreaterThanOrEqual(44);
    const labelLines = await control.getByText(label, { exact: true }).evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getClientRects().length;
    });
    expect(labelLines).toBe(1);
  }
  const scrollBodyBox = (await body.boundingBox())!;
  expect(scrollBodyBox.height).toBeGreaterThanOrEqual(200);
  await expect(done).toBeVisible();
  await page.screenshot({
    path: `screenshots/theme-rehearsal/${testInfo.project.name}/topic-editor-320-text-200.png`,
    fullPage: false,
  });
  await page.evaluate(() => { document.documentElement.style.removeProperty("font-size"); });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  const maybe = statusGroup.getByRole("button", { name: /^Misschien\b/ });
  const willing = statusGroup.getByRole("button", { name: /^Ja\b/ });
  await maybe.click();
  await willing.click();
  await expect(willing).toHaveAttribute("aria-pressed", "true");
  await expect(maybe).toHaveAttribute("aria-pressed", "false");

  await done.click();
  await expect(dialog).toBeHidden();
  await expect(result).toBeFocused();
});
