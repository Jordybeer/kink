import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

test("scene separates PDF export, draft save and consent lock into distinct actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(
    page,
    `/scene?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}`,
    [PROFILE_ALEX, PROFILE_SAM],
  );

  const pdf = page.getByRole("button", { name: "Exporteer scène als PDF" });
  const save = page.getByRole("button", { name: "Opslaan" });
  const lock = page.getByRole("button", { name: "Afspraken vastzetten" });

  await expect(pdf).toBeVisible();
  await expect(pdf).toBeDisabled();
  await expect(save).toBeDisabled();
  await expect(lock).toBeDisabled();
  await expect(page.getByRole("button", { name: "Plannen", exact: true })).toHaveCount(0);

  await page.getByPlaceholder("Eigen item…").fill("Check-in");
  await page.getByRole("button", { name: "Item toevoegen" }).click();

  await expect(pdf).toBeEnabled();
  await expect(save).toBeEnabled();
  await expect(lock).toBeEnabled();
});
