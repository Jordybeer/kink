import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

const WITH_BDSMTEST = {
  ...PROFILE_ALEX,
  bdsmtestUrl: "https://bdsmtest.org/r/privacy-check",
  bdsmtestScores: [
    { role: "Switch", pct: 88 },
    { role: "Rigger", pct: 72 },
  ],
};

test.describe("profiel delen — optionele externe data", () => {
  test("BDSMTest blijft standaard lokaal en vereist expliciete opt-in", async ({ page }) => {
    await seedAndGo(page, "/profile/pw-alex-001", [WITH_BDSMTEST], { profileTourComplete: true });

    await page.getByRole("button", { name: "Profiel delen" }).click();
    const dialog = page.getByRole("dialog", { name: "Profiel delen" });
    const bdsmtest = dialog.getByLabel("BDSMTest-resultaten meesturen");
    const bdsmtestToggle = dialog.getByText("BDSMTest-resultaten meesturen", { exact: true });

    await expect(bdsmtest).toBeVisible();
    await expect(bdsmtest).not.toBeChecked();
    await expect(dialog.getByText(/BDSMTest blijft op dit toestel/i)).toBeVisible();

    await bdsmtestToggle.click();
    await expect(bdsmtest).toBeChecked();
    await expect(dialog.getByText(/BDSMTest wordt alleen voor deze deelactie meegestuurd/i)).toBeVisible();

    await bdsmtestToggle.click();
    await expect(bdsmtest).not.toBeChecked();
    await expect(dialog.getByText(/BDSMTest blijft op dit toestel/i)).toBeVisible();
  });
});
