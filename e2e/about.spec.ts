import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

test("home opens the current KinkSync trust story without crowding the hero", async ({ page }) => {
  await seedAndGo(page, "/", [PROFILE_ALEX, PROFILE_SAM]);
  const link = page.getByRole("link", { name: "Ontdek hoe KinkSync werkt" });
  await expect(link).toHaveAttribute("href", "/about");
  await link.click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: "Jouw voorkeuren. Jouw toestel. Jouw woorden." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Eerlijk over de grenzen" })).toBeVisible();
});
