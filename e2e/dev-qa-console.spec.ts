import { expect, test } from "@playwright/test";

test("dev QA console imports a flat kink fixture into a local profile", async ({ page }) => {
  await page.goto("/qa?testtools=1");

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

test("dev QA console stays locally locked without explicit testtools activation", async ({ page }) => {
  await page.goto("/qa?testtools=0");

  await expect(page.getByRole("heading", { name: "QA is vergrendeld" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Testtools activeren" })).toBeVisible();
});
