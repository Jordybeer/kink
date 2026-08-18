import { expect, test } from "@playwright/test";

test("about opens the public technical security reference", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/about");

  const link = page.getByRole("link", { name: "Security & privacy" });
  await expect(link).toHaveAttribute("href", "/security");
  await link.click();

  await expect(page).toHaveURL(/\/security$/);
  const heading = page.getByRole("heading", { name: "Security & privacy", level: 1 });
  const eyebrow = page.getByTestId("security-eyebrow");
  await expect(heading).toBeVisible();
  await expect(page.getByRole("heading", { name: "Local-first betekent browseropslag, geen beveiligde enclave" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "ECDSA P-256 over canonieke payloads" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Een security- of privacyprobleem melden" })).toBeVisible();

  await expect(page.getByText("kink-profiles", { exact: true })).toBeVisible();
  await expect(page.getByText("kink-contract-series", { exact: true })).toBeVisible();
  await expect(page.getByText("AES-GCM 256-bit", { exact: true })).toBeVisible();
  await expect(page.getByText("PBKDF2 + SHA-256", { exact: true })).toBeVisible();
  await expect(page.getByText("310.000", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("16 random bytes", { exact: true })).toBeVisible();
  await expect(page.getByText("12 random bytes", { exact: true })).toBeVisible();
  await expect(page.getByText("6.000.000 tekens", { exact: true })).toBeVisible();
  await expect(page.getByText("4.000.000 bytes", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "security@jordy.dev" })).toHaveAttribute("href", "mailto:security@jordy.dev");
  await expect(page.getByRole("navigation", { name: "Tabbladen" })).toHaveCount(0);

  const [eyebrowBox, headingBox] = await Promise.all([eyebrow.boundingBox(), heading.boundingBox()]);
  expect(eyebrowBox).not.toBeNull();
  expect(headingBox).not.toBeNull();
  expect(headingBox!.y - (eyebrowBox!.y + eyebrowBox!.height)).toBeGreaterThanOrEqual(8);
});
