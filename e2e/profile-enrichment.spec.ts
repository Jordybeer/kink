import { expect, test, type Page } from "@playwright/test";
import { buildStore, PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

const IOS_URI_ENCODED_COPY_ALL = "https://www.bdsmtest.org/r/qXBN9QWw%0A%0A100%25%20Little%0A93%25%20Switch%0A78%25%20Rope%20bunny%0A0%25%20Primal%20(Prey)";

async function openSources(page: Page) {
  const trigger = page.getByRole("button", { name: "Profiel bewerken" });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Profiel bewerken" });
  await expect(dialog).toBeVisible();
  const sources = dialog.getByRole("button", { name: /Gekoppelde bronnen/ });
  await expect(sources).toBeVisible();
  await sources.click();
  await expect(dialog.getByTestId("profile-edit-sources-panel")).toBeVisible();
  return { trigger, dialog };
}

async function saveFromSources(dialog: ReturnType<Page["getByRole"]>) {
  await dialog.getByRole("button", { name: /Volgende/ }).click();
  await expect(dialog.getByTestId("profile-edit-questionnaire-step")).toBeVisible();
  await dialog.getByRole("button", { name: "Opslaan" }).click();
}

test.describe("Gekoppelde bronnen in profielbewerking", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndGo(page, "/profile/pw-alex-001", [PROFILE_ALEX, PROFILE_SAM], { profileTourComplete: true });
  });

  test("blijft onderdeel van dezelfde edit-sheet en houdt de mobiele geometrie stabiel", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const { trigger, dialog } = await openSources(page);

    await expect(page.getByRole("dialog", { name: "Profielinfo" })).toHaveCount(0);
    const header = dialog.getByTestId("profile-edit-header");
    const scrollBody = dialog.getByTestId("profile-edit-scroll-body");
    const footer = dialog.getByTestId("profile-edit-footer");

    await expect.poll(async () => dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
      return Math.max(0, -rect.top, rect.bottom - visibleHeight);
    })).toBeLessThanOrEqual(1);

    await scrollBody.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    const headerBox = await header.boundingBox();
    const bodyBox = await scrollBody.boundingBox();
    const footerBox = await footer.boundingBox();
    const visibleHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
    expect(headerBox).not.toBeNull();
    expect(bodyBox).not.toBeNull();
    expect(footerBox).not.toBeNull();
    expect(headerBox!.y + headerBox!.height).toBeLessThanOrEqual(bodyBox!.y + 1);
    expect(bodyBox!.y + bodyBox!.height).toBeLessThanOrEqual(footerBox!.y + 1);
    expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(visibleHeight + 1);

    await dialog.getByRole("button", { name: /Identiteit/ }).click();
    await expect(dialog.getByTestId("profile-edit-identity-step")).toBeVisible();
    await dialog.getByRole("button", { name: "Profiel bewerken sluiten" }).click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("labelt bronvelden en brengt een verborgen validatiefout terug in beeld", async ({ page }) => {
    const { dialog } = await openSources(page);
    const fetLife = dialog.getByLabel("FetLife", { exact: true });
    const bdsmtest = dialog.getByLabel("BDSMTest-resultaten", { exact: true });

    await expect(fetLife).toBeVisible();
    await expect(bdsmtest).toBeVisible();
    await fetLife.fill("https://fetlife.com/alex");
    await expect(fetLife).toHaveAttribute("aria-invalid", "true");

    await dialog.getByRole("button", { name: /Identiteit/ }).click();
    const next = dialog.getByRole("button", { name: /Volgende/ });
    await expect(next).toBeEnabled();
    await next.click();

    await expect(dialog.getByTestId("profile-edit-sources-panel")).toBeVisible();
    await expect(fetLife).toBeFocused();
    await expect(fetLife).toHaveAccessibleDescription(/zonder volledige link/i);
  });

  test("splitst de URI-encoded iOS Copy all lokaal in een canonical link en resultaten", async ({ page }) => {
    const { dialog } = await openSources(page);
    const paste = dialog.getByPlaceholder("Plak hier de resultaatlink en resultaten");
    await paste.fill(IOS_URI_ENCODED_COPY_ALL);

    await expect(dialog.getByText("Resultaatlink gevonden")).toBeVisible();
    await expect(dialog.getByText("4 resultaten gevonden")).toBeVisible();
    await saveFromSources(dialog);

    const bdsmLink = page.getByRole("link", { name: "Open het opgeslagen BDSMTest-resultaat" });
    await expect(bdsmLink).toHaveAttribute("href", "https://bdsmtest.org/r/qXBN9QWw");
    await page.getByRole("button", { name: "Bekijk alle 4 BDSMTest-resultaten" }).click();
    const scoresDialog = page.getByRole("dialog", { name: "Alle BDSMTest-resultaten" });
    await expect(scoresDialog.getByText("Little", { exact: true })).toBeVisible();

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem("kink-profiles");
      return raw ? JSON.parse(raw).state.profiles.find((profile: { id: string }) => profile.id === "pw-alex-001") : null;
    });
    expect(stored.bdsmtestUrl).toBe("https://bdsmtest.org/r/qXBN9QWw");
    expect(stored.bdsmtestScores).toEqual([
      { role: "Little", pct: 100 },
      { role: "Switch", pct: 93 },
      { role: "Rope bunny", pct: 78 },
      { role: "Primal (Prey)", pct: 0 },
    ]);
  });

  test("behoudt een legacy BDSMTest-link ook zonder lokaal opgeslagen scores", async ({ page }) => {
    const legacy = {
      ...PROFILE_ALEX,
      bdsmtestUrl: "https://bdsmtest.org/r/legacyResult",
      bdsmtestScores: undefined,
    };
    await seedAndGo(page, "/profile/pw-alex-001", [legacy, PROFILE_SAM], { profileTourComplete: true });

    const link = page.getByRole("link", { name: "Open het opgeslagen BDSMTest-resultaat" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "https://bdsmtest.org/r/legacyResult");
    await expect(page.getByText("Resultaatlink gekoppeld", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Bekijk alle .* BDSMTest-resultaten/ })).toHaveCount(0);
  });

  test("weigert een look-alike URL zonder bestaande data te overschrijven", async ({ page }) => {
    const existing = {
      ...PROFILE_ALEX,
      bdsmtestUrl: "https://bdsmtest.org/r/safeResult",
      bdsmtestScores: [{ role: "Switch", pct: 88 }],
    };
    await page.evaluate((stored) => localStorage.setItem("kink-profiles", JSON.stringify(stored)), buildStore([existing, PROFILE_SAM]));
    await page.goto("/profile/pw-alex-001");
    await page.waitForLoadState("networkidle");

    const { dialog } = await openSources(page);
    await dialog.getByPlaceholder("Plak hier de resultaatlink en resultaten").fill(
      "https://bdsmtest.org.evil.example/r/steal\n100% Little",
    );
    await expect(dialog.getByText("De resultaatlink lijkt niet van bdsmtest.org te komen.")).toBeVisible();
    const next = dialog.getByRole("button", { name: /Volgende/ });
    await expect(next).toBeEnabled();
    await next.click();
    await expect(dialog.getByPlaceholder("Plak hier de resultaatlink en resultaten")).toBeFocused();

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem("kink-profiles");
      return raw ? JSON.parse(raw).state.profiles.find((profile: { id: string }) => profile.id === "pw-alex-001") : null;
    });
    expect(stored.bdsmtestUrl).toBe("https://bdsmtest.org/r/safeResult");
    expect(stored.bdsmtestScores).toEqual([{ role: "Switch", pct: 88 }]);
  });

  test("weigert een te grote paste zonder een geldige prefix stil af te kappen", async ({ page }) => {
    const { dialog } = await openSources(page);
    const paste = dialog.getByPlaceholder("Plak hier de resultaatlink en resultaten");
    const validPrefix = "https://bdsmtest.org/r/oversized\n100% Little\n";

    await paste.click();
    await page.keyboard.insertText(validPrefix + "x".repeat(20_000));

    await expect(dialog.getByText("Deze plaktekst is te groot om veilig te verwerken.")).toBeVisible();
    await expect.poll(async () => (await paste.inputValue()).length).toBe(16_385);
    const next = dialog.getByRole("button", { name: /Volgende/ });
    await expect(next).toBeEnabled();
    await next.click();
    await expect(paste).toBeFocused();
  });

  test("houdt relatiestatus en FetLife op beide Switch-perspectieven maar BDSMTest op het gekozen perspectief", async ({ page }) => {
    const dominant = {
      ...PROFILE_ALEX,
      personGroupId: "switch-owner",
      perspective: "dominant" as const,
      role: "Dominant",
    };
    const submissive = {
      ...PROFILE_ALEX,
      id: "pw-alex-sub",
      personGroupId: "switch-owner",
      perspective: "submissive" as const,
      role: "Submissive",
      entries: {},
    };
    await page.evaluate((stored) => localStorage.setItem("kink-profiles", JSON.stringify(stored)), buildStore([dominant, submissive]));
    await page.goto("/profile/pw-alex-001");
    await page.waitForLoadState("networkidle");

    const trigger = page.getByRole("button", { name: "Profiel bewerken" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Profiel bewerken" });
    await dialog.getByLabel(/Relatiestatus/).selectOption("Getrouwd");
    await dialog.getByRole("button", { name: /Gekoppelde bronnen/ }).click();
    await dialog.getByPlaceholder("Gebruikersnaam").fill("alexOnFet");
    await dialog.getByPlaceholder("Plak hier de resultaatlink en resultaten").fill(
      "https://bdsmtest.org/r/switchResult\n100% Switch",
    );
    await saveFromSources(dialog);

    const profiles = await page.evaluate(() => {
      const raw = localStorage.getItem("kink-profiles");
      return raw ? JSON.parse(raw).state.profiles : [];
    });
    const savedDominant = profiles.find((profile: { id: string }) => profile.id === "pw-alex-001");
    const savedSubmissive = profiles.find((profile: { id: string }) => profile.id === "pw-alex-sub");
    expect(savedDominant.relationshipStatus).toBe("Getrouwd");
    expect(savedSubmissive.relationshipStatus).toBe("Getrouwd");
    expect(savedDominant.fetLifeUsername).toBe("alexOnFet");
    expect(savedSubmissive.fetLifeUsername).toBe("alexOnFet");
    expect(savedDominant.bdsmtestUrl).toBe("https://bdsmtest.org/r/switchResult");
    expect(savedSubmissive.bdsmtestUrl).toBeUndefined();
  });

  test("toont geen bewerkflow op een gedeeld profiel", async ({ page }) => {
    const shared = { ...PROFILE_SAM, id: "shared-sam", isImported: true, origin: "shared" as const };
    await seedAndGo(page, "/profile/shared-sam", [shared], { profileTourComplete: true });
    await expect(page.getByRole("button", { name: "Profiel bewerken" })).toHaveCount(0);
  });
});
