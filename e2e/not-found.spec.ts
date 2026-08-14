import { test, expect } from "@playwright/test";

// Keep this deliberately tiny: a 404 must remain a safe escape hatch, not
// another navigation surface to maintain.
test("unknown route lands on the KinkSync 404", async ({ page }) => {
  await page.goto("/this-route-is-not-collared");

  await expect(page.getByRole("heading", { name: /heeft zich laten meeslepen/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /terug naar home/i })).toHaveAttribute("href", "/");
  await expect(page.getByText(/lokale profielen en antwoorden zijn niet weg/i)).toBeVisible();
});
