import { expect, test } from "@playwright/test";

test("dev QA console activates persistently and imports a flat kink fixture", async ({ page }) => {
  await page.goto("/qa");

  await expect(page.getByRole("heading", { name: "QA is vergrendeld" })).toBeVisible();
  await page.getByRole("button", { name: "Testtools activeren" }).click();
  await expect(page.getByRole("heading", { name: "QA-lab" })).toBeVisible();
  await expect(page).toHaveURL(/\/qa$/);

  await page.reload();
  await expect(page.getByRole("heading", { name: "QA-lab" })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: "Mara-kinksync.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify([
      { id: "spanking_hand_give", status: "WILLING", conditions: [] },
      { id: "rope_bondage_receive", status: "YES", conditions: ["trusted setup"] },
      { id: "removed_fixture_id", status: "MAYBE", conditions: [] },
    ])),
  });

  await expect(page.getByText(/2 van 3 antwoorden klaar om te importeren/)).toBeVisible();
  await expect(page.getByLabel("Naam")).toHaveValue("Mara");
  await expect(page.getByLabel("Rol")).toHaveValue("Testprofiel");

  await page.getByRole("button", { name: "Lokaal testprofiel maken" }).click();
  await expect(page.getByText("Testprofiel aangemaakt.")).toBeVisible();
  await expect(page.getByText("Lokale profielen op dit toestel: 1.")).toBeVisible();
});

test("explicit dev testtools link remains visible while also persisting the mode", async ({ page }) => {
  await page.goto("/qa?testtools=1");

  await expect(page.getByRole("heading", { name: "QA-lab" })).toBeVisible();
  await expect(page).toHaveURL(/\/qa\?testtools=1$/);

  await page.goto("/qa");
  await expect(page.getByRole("heading", { name: "QA-lab" })).toBeVisible();

  await page.getByRole("button", { name: "Testmodus op dit toestel uitschakelen" }).click();
  await expect(page.getByRole("heading", { name: "QA is vergrendeld" })).toBeVisible();
});
