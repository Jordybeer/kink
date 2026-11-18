import { test, expect } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";
import type { Profile } from "@/types";

const nameA = "Alex met volledige alias " + "Langenaam".repeat(8);
const nameB = "Sam met volledige alias " + "Ononderbroken".repeat(6);
const topic = "Een eigen onderwerp met volledige betekenis " + "Onderwerp".repeat(7);
const profiles: Profile[] = [
  { ...PROFILE_ALEX, name: nameA, customKinks: [{ id: "readable-limit", name: topic }], entries: {
    "readable-limit": { status: "hard_no", comment: "" },
    pegging_give: { status: "yes", comment: "", desire: 4 },
  } },
  { ...PROFILE_SAM, name: nameB, customKinks: [], entries: { pegging_receive: { status: "willing", comment: "", desire: 3 } } },
];

for (const theme of ["dark", "light"] as const) {
  for (const textSize of [100, 200]) {
    test(`contract complete aliases fit 320px at ${textSize}% in ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 320, height: 844 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await seedAndGo(page, `/contract?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}`, profiles);
      await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}%`; }, textSize);
      await page.evaluate(async () => { await document.fonts.ready; });
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      expect(await page.locator("html").evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBe(16 * textSize / 100);
      const row = page.locator("[data-contract-topic]").filter({ hasText: topic });
      await expect(row.getByText(topic, { exact: true })).toBeVisible();
      const answers = row.locator("[data-contract-answer]");
      await expect(answers.nth(0).locator("dt")).toHaveText(nameA);
      await expect(answers.nth(1).locator("dt")).toHaveText(nameB);
      await expect(answers.nth(0).locator("dd")).toContainText("Harde grens");
      await expect(row).not.toContainText("Verlangen:");
      await expect(answers.nth(1).locator("dd")).toContainText("geen antwoord");
      await expect(row.getByText(`Eigen onderwerp van ${nameA}`, { exact: true })).toBeVisible();
      const directional = page.locator("[data-contract-topic]").filter({ hasText: "Pegging — geven ↔ ontvangen" });
      await expect(directional.getByText("Pegging — geven ↔ ontvangen", { exact: true })).toBeVisible();
      const directionalAnswers = directional.locator("[data-contract-answer]");
      await expect(directionalAnswers.nth(0).locator("dt")).toHaveText(nameA);
      await expect(directionalAnswers.nth(1).locator("dt")).toHaveText(nameB);
      await expect(directionalAnswers.nth(0).locator("dd")).toContainText("Heel graag");
      await expect(directionalAnswers.nth(0).locator("dd")).toContainText("Verlangen: 4/5");
      await expect(directionalAnswers.nth(1).locator("dd")).toContainText("Ja");
      await expect(directionalAnswers.nth(1).locator("dd")).toContainText("Verlangen: 3/5");
      await row.getByRole("button", { name: `Notitie toevoegen bij ${topic}`, exact: true }).click();
      await row.getByPlaceholder(`Notitie van ${nameA}`, { exact: true }).fill("Een afspraak " + "x".repeat(120));
      await expect(row).toContainText("Ingevulde notities worden onderdeel van deze contractversie en komen ook in de PDF.");
      const layout = await page.locator(".contract-print").evaluate((root) => {
        const overflow: string[] = [];
        for (const node of root.querySelectorAll<HTMLElement>("h1, p, dt, dd, [data-contract-topic], label, input, textarea, button")) {
          const rect = node.getBoundingClientRect();
          if (!rect.width || !rect.height) continue;
          if (rect.left < -1 || rect.right > innerWidth + 1 || (!node.matches("input, textarea") && node.scrollWidth > node.clientWidth + 1)) {
            overflow.push(`${node.tagName}: ${node.textContent?.slice(0, 60)}`);
          }
        }
        return { overflow, documentWidth: document.documentElement.scrollWidth, viewport: innerWidth };
      });
      expect(layout.overflow).toEqual([]);
      expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport + 1);
      await row.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/contract-long-alias-${theme}-320-text-${textSize}.png`, fullPage: true });
    });
  }
}
