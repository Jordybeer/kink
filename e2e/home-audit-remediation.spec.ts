import { expect, test } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

const SHARED_SAM = {
  ...PROFILE_SAM,
  origin: "shared" as const,
  isImported: true,
};

test("lege Home houdt de onzichtbare backup-file-input uit de Tab-volgorde", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/", [], { onboardingComplete: true, profileTourComplete: true });

  const restore = page.getByRole("button", { name: /Backup herstellen/ });
  const fileInput = page.getByLabel("Kies een backupbestand");
  await restore.focus();
  await page.keyboard.press("Tab");
  await expect(fileInput).not.toBeFocused();

  const chooserPromise = page.waitForEvent("filechooser");
  await restore.click();
  const chooser = await chooserPromise;
  expect(chooser.isMultiple()).toBe(false);
});

test("gedeeld profiel kan lokaal verwijderd worden zonder eigen bewerkacties", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/", [PROFILE_ALEX, SHARED_SAM]);

  await page.getByRole("button", { name: "Meer acties voor Sam" }).click();
  const actions = page.getByRole("dialog", { name: "Acties voor Sam" });
  await expect(actions.getByRole("link", { name: "Profiel bewerken" })).toHaveCount(0);
  await expect(actions.getByRole("button", { name: /Markeer als mijn profiel/ })).toHaveCount(0);
  await actions.getByRole("button", { name: "Gedeeld profiel verwijderen" }).click();

  const confirm = page.getByRole("dialog", { name: "Profiel verwijderen" });
  await expect(confirm).toContainText("Bestaande contracten en scènes blijven bestaan.");
  await confirm.getByRole("button", { name: "Verwijder voor altijd" }).click();

  await expect(page.getByRole("link", { name: "Sam Submissive openen" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Alex Dominant openen" })).toBeVisible();
});

test("gekoppeld gedeeld profiel kan per perspectief worden verwijderd", async ({ page }) => {
  const dominant = {
    ...SHARED_SAM,
    id: "shared-sam-dominant",
    personGroupId: "sam-pair",
    role: "Dominant",
  };
  const submissive = {
    ...SHARED_SAM,
    id: "shared-sam-submissive",
    personGroupId: "sam-pair",
    role: "Submissive",
  };

  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndGo(page, "/", [PROFILE_ALEX, dominant, submissive]);

  await page.getByRole("button", { name: "Meer acties voor Sam" }).first().click();
  await page.getByRole("dialog", { name: "Acties voor Sam" })
    .getByRole("button", { name: "Gedeeld profiel verwijderen" }).click();

  const confirm = page.getByRole("dialog", { name: "Gekoppeld profiel verwijderen" });
  await expect(confirm).toContainText("Bestaande contracten en scènes blijven bestaan.");
  await confirm.getByRole("button", { name: "Alleen Dominant verwijderen" }).click();

  await expect(page.getByRole("link", { name: "Sam Dominant openen" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sam Submissive openen" })).toBeVisible();
});
