import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

test("home explains how KinkSync works without crowding the hero", async ({ page }) => {
  await seedAndGo(page, "/", [PROFILE_ALEX, PROFILE_SAM]);
  const link = page.getByRole("link", { name: "Ontdek hoe KinkSync werkt" });
  await expect(link).toHaveAttribute("href", "/about");
  await link.click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: "Hoe KinkSync werkt" })).toBeVisible();
  await expect(page.getByText("Wat cryptografie niet kan bewijzen")).toBeVisible();
});
