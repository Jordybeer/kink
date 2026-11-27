import { expect, test } from "@playwright/test";
import { seedAndGo } from "./fixtures";
const path = "/hotter/journey/self/conversation";

test("explicit answer opens real follow-up; context flags remain topic scoped", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, path, []);
  const deck = page.locator(".journey-conversation");
  await expect(deck).toHaveAttribute("data-topic", "dominance_submission");
  const original = await page.evaluate(() => localStorage.getItem("kink-profiles"));
  await deck.getByRole("button", { name: "Privé", exact: true }).click();
  await deck.getByRole("button", { name: "Eerst vragen", exact: true }).click();
  await deck.getByRole("group", { name: "Jouw antwoord" }).getByRole("button", { name: /Heel graag/ }).click();
  await expect(deck).toHaveAttribute("data-topic", "titels_aanspreekvormen");
  await expect(deck).toHaveAttribute("data-relation", "followup");
  await expect(deck.getByRole("button", { name: "Privé", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(deck.getByRole("button", { name: "Eerst vragen", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(deck.locator(".journey-answer[aria-pressed=true]")).toHaveCount(0);
  await deck.getByRole("button", { name: "Voor nu klaar" }).click();
  await expect(page.getByRole("heading", { name: "Mijn perspectief" })).toBeVisible();
  await expect(page.getByText("Privéantwoord", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Verder ontdekken" }).click();
  await expect(deck).toHaveAttribute("data-topic", "titels_aanspreekvormen");
  expect(await page.evaluate(() => localStorage.getItem("kink-profiles"))).toBe(original);
});

test("hard boundary breaks topic, and deferral does not answer", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAndGo(page, path, []);
  const deck = page.locator(".journey-conversation");
  await deck.getByRole("group", { name: "Jouw antwoord" }).getByRole("button", { name: /Harde grens/ }).click();
  await expect(deck).not.toHaveAttribute("data-topic", "dominance_submission");
  await expect(deck).not.toHaveAttribute("data-topic", "titels_aanspreekvormen");
  await expect(deck).toHaveAttribute("data-relation", "new");
  const deferred = await deck.getAttribute("data-topic");
  await deck.getByRole("button", { name: "Later", exact: true }).click();
  await expect(deck).not.toHaveAttribute("data-topic", deferred!);
  await deck.getByRole("button", { name: "Voor nu klaar" }).click();
  await expect(page.getByRole("heading", { name: "Voor later" })).toBeVisible();
  expect(await page.locator(".journey-world").evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
});

test("conversation resumes after visiting another experience", async ({ page }) => {
  await seedAndGo(page, path, []);
  const deck = page.locator(".journey-conversation");
  await deck.getByRole("button", { name: "Nieuwsgierig", exact: true }).click();
  await page.getByRole("navigation", { name: "Ervaringen" }).getByRole("link", { name: "Elkaar" }).click();
  await page.getByRole("navigation", { name: "Ervaringen" }).getByRole("link", { name: "Jezelf" }).click();
  await expect(deck).toHaveAttribute("data-topic", "dominance_submission");
  await expect(deck.getByRole("button", { name: "Nieuwsgierig", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(deck.getByRole("button", { name: "Nieuwsgierig", exact: true })).toHaveAttribute("aria-pressed", "false");
});
