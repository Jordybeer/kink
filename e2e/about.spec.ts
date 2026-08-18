import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

test("home opens a compact human-first KinkSync story", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/", [PROFILE_ALEX, PROFILE_SAM]);

  const link = page.getByRole("link", { name: "Ontdek hoe KinkSync werkt" });
  await expect(link).toHaveAttribute("href", "/about");
  await link.click();

  await expect(page).toHaveURL(/\/about$/);
  const heading = page.getByRole("heading", { name: "Jouw voorkeuren. Jouw toestel. Jouw woorden." });
  const eyebrow = page.getByTestId("about-eyebrow");
  await expect(heading).toBeVisible();
  await expect(page.getByRole("heading", { name: "Eerlijk over wat de app niet kan beslissen" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Security & privacy" })).toHaveAttribute("href", "/security");

  const [eyebrowBox, headingBox] = await Promise.all([eyebrow.boundingBox(), heading.boundingBox()]);
  expect(eyebrowBox).not.toBeNull();
  expect(headingBox).not.toBeNull();
  expect(headingBox!.y - (eyebrowBox!.y + eyebrowBox!.height)).toBeGreaterThanOrEqual(8);

  const promiseBoxes = await page.getByTestId("about-promises").locator(":scope > div").evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width };
    }),
  );
  expect(promiseBoxes).toHaveLength(3);
  expect(Math.max(...promiseBoxes.map((box) => box.y)) - Math.min(...promiseBoxes.map((box) => box.y))).toBeLessThan(1);
  expect(promiseBoxes[1].x).toBeGreaterThan(promiseBoxes[0].x);
  expect(promiseBoxes[2].x).toBeGreaterThan(promiseBoxes[1].x);

  await expect(page.getByText("ECDSA P-256", { exact: false })).toHaveCount(0);
  await expect(page.getByText("PBKDF2", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Tabbladen" })).toHaveCount(0);

  const communityAfterLimits = await page.evaluate(() => {
    const limits = document.querySelector("#limits-title");
    const community = document.querySelector("#community-title");
    if (!limits || !community) return false;
    return Boolean(limits.compareDocumentPosition(community) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(communityAfterLimits).toBe(true);
});
