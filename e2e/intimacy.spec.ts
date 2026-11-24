import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

const SHARED_SAM = { ...PROFILE_SAM, isImported: true, origin: "shared" as const };

test.describe("Intimiteitsagenda", () => {
  test("verplaatst tabselectie en focus samen met pijlen, Home en End", async ({ page }) => {
    await seedAndGo(page, "/intimacy", [PROFILE_ALEX, PROFILE_SAM]);
    const tabs = page.getByRole("tablist", { name: "Intimiteitsagenda" });
    const planned = tabs.getByRole("tab", { name: "Gepland", exact: true });
    const logbook = tabs.getByRole("tab", { name: "Logboek", exact: true });
    await planned.focus();

    for (const [key, target, other, label] of [
      ["ArrowRight", logbook, planned, "Logboek"],
      ["ArrowRight", planned, logbook, "Gepland"],
      ["ArrowLeft", logbook, planned, "Logboek"],
      ["Home", planned, logbook, "Gepland"],
      ["End", logbook, planned, "Logboek"],
    ] as const) {
      await page.keyboard.press(key);
      await expect(target).toBeFocused();
      await expect(target).toHaveAttribute("aria-selected", "true");
      await expect(target).toHaveAttribute("tabindex", "0");
      await expect(other).toHaveAttribute("aria-selected", "false");
      await expect(other).toHaveAttribute("tabindex", "-1");
      const panel = page.getByRole("tabpanel", { name: label, exact: true });
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute("id", (await target.getAttribute("aria-controls"))!);
      await expect(panel).toHaveAttribute("aria-labelledby", (await target.getAttribute("id"))!);
    }

    await page.keyboard.press("Tab");
    await expect(page.getByRole("tabpanel", { name: "Logboek", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(logbook).toBeFocused();
  });

  test("plant, corrigeert en houdt een lokaal moment bij op mobiel", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAndGo(page, "/intimacy", [PROFILE_ALEX, PROFILE_SAM]);

    await expect(page.getByText("Ruimte maken voor intimiteit")).toBeVisible();
    await expect(page.getByText(/geen toestemming/)).toBeVisible();
    await expect(page.getByText("“Dominant on the streets. Submissive in the sheets.”")).toBeVisible();
    await expect(page.getByLabel("Tabbladen")).toHaveCount(0);
    await page.getByRole("button", { name: "Moment plannen" }).first().click();

    const planner = page.getByRole("region", { name: "Moment plannen", exact: true });
    await expect(planner).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "Gepland" }).getByRole("region", { name: "Moment plannen" })).toBeVisible();
    await expect(planner.getByRole("heading")).toBeFocused();
    // A smaller iPhone cannot reliably display two native date/time inputs side by side.
    await page.setViewportSize({ width: 320, height: 667 });
    await expect.poll(() => planner.getByTestId("planner-date-time").evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
    )).toBe(1);
    await expect(planner.getByLabel("Datum")).toBeVisible();
    await expect(planner.getByLabel("Tijd")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await page.setViewportSize({ width: 390, height: 844 });
    const viewportWidth = page.viewportSize()!.width;
    const plannerBox = await planner.boundingBox();
    expect(plannerBox?.x).toBeGreaterThanOrEqual(0);
    expect((plannerBox?.x ?? 0) + (plannerBox?.width ?? 0)).toBeLessThanOrEqual(viewportWidth + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewportWidth);
    await page.screenshot({ path: `screenshots/theme-rehearsal/agenda/${testInfo.project.name}/intimacy-planner-390.png`, fullPage: false });
    await planner.getByLabel("Datum").fill("2026-08-30");
    await planner.getByLabel("Tijd").fill("20:30");
    await planner.getByText("Meer opties", { exact: true }).click();
    await planner.getByLabel("Titel (optioneel)").fill("Date night");
    await planner.getByRole("button", { name: "Plan moment" }).click();

    await expect(page.getByText("Date night", { exact: true })).toBeVisible();
    await expect(page.getByText(/30 aug.*20:30/)).toBeVisible();

    const moment = page.getByRole("article", { name: "Date night", exact: true });
    const trigger = moment.getByRole("button", { name: "Bijhouden", exact: true });
    await trigger.click();
    const logEditor = page.getByRole("dialog", { name: "Moment bijhouden" });
    await expect(logEditor.getByRole("heading", { name: "Date night" })).toBeFocused();
    await logEditor.getByRole("button", { name: "Terug naar agenda" }).click();
    await expect(trigger).toBeFocused();
    await trigger.click();

    const privateNote = logEditor.getByLabel("Privénotitie");
    const save = logEditor.getByRole("button", { name: "Bewaar in logboek" });
    await expect(privateNote).toBeVisible();
    await expect(logEditor.getByLabel("Datum", { exact: true })).toHaveCount(0);
    await privateNote.fill("Een dag later was fijner");
    // Simulate the visual viewport left by a short mobile keyboard without
    // changing the layout viewport. Both writing and saving must stay reachable.
    await page.setViewportSize({ width: 320, height: 667 });
    await page.evaluate(() => {
      const viewport = window.visualViewport!;
      Object.defineProperties(viewport, {
        height: { configurable: true, get: () => 314 },
        offsetTop: { configurable: true, get: () => 20 },
      });
      viewport.dispatchEvent(new Event("resize"));
    });
    const saveBox = (await save.boundingBox())!;
    const noteBox = (await privateNote.boundingBox())!;
    expect(saveBox.y + saveBox.height).toBeLessThanOrEqual(334);
    expect(noteBox.y + noteBox.height).toBeLessThanOrEqual(saveBox.y);
    expect(await save.evaluate((button) => {
      const { x, y, width, height } = button.getBoundingClientRect();
      return button.contains(document.elementFromPoint(x + width / 2, y + height / 2));
    })).toBe(true);
    await logEditor.getByRole("button", { name: "Details", exact: true }).click();
    await logEditor.getByLabel("Datum", { exact: true }).fill("2026-08-31");
    await logEditor.getByRole("button", { name: "Naar notitie", exact: true }).click();
    await expect(privateNote).toHaveValue("Een dag later was fijner");
    await save.click();

    const logbook = page.getByLabel("Logboek");
    await expect(page.getByRole("tab", { name: "Logboek" })).toHaveAttribute("aria-selected", "true");
    await expect(logbook.getByRole("article", { name: "Date night", exact: true })).toBeFocused();
    await expect(logbook.getByText("Date night", { exact: true })).toBeVisible();
    await expect(logbook.getByText("Een dag later was fijner", { exact: true })).toBeVisible();
    await expect(logbook.getByText(/31 aug/)).toBeVisible();

    const persisted = await page.evaluate(() => localStorage.getItem("kinksync-intimacy"));
    expect(persisted).toContain("Date night");
    expect(persisted).toContain("Een dag later was fijner");
    expect(persisted).toContain('"status":"completed"');
  });

  test("gebruikt Mijn partner als rustige standaard voor een nieuw moment", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kinksync-my-partner-profile", "pw-sam-002");
    });
    await seedAndGo(page, "/intimacy", [PROFILE_ALEX, SHARED_SAM]);

    await page.getByRole("button", { name: "Moment plannen" }).first().click();
    const planner = page.getByRole("region", { name: "Moment plannen", exact: true });
    await expect(planner).toBeVisible();
    await planner.getByText("Meer opties", { exact: true }).click();
    await expect(planner.getByRole("button", { name: /Met wie.*Sam/ })).toBeVisible();
  });
});
