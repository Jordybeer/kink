import { expect, test } from "@playwright/test";

test("about opent de publieke security- en privacypagina", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/about");

  const details = page.getByText("Technische verdieping");
  await details.click();

  const link = page.getByRole("link", { name: "Security & privacy" });
  await expect(link).toHaveAttribute("href", "/security");
  await link.click();

  await expect(page).toHaveURL(/\/security$/);
  await expect(page.getByRole("heading", { name: "Security & privacy", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Local-first by design" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Een probleem melden" })).toBeVisible();
  await expect(page.getByRole("link", { name: "security@jordy.dev" })).toHaveAttribute("href", "mailto:security@jordy.dev");
});
