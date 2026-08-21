import { expect, test } from "@playwright/test";
import { buildStore, PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";

const IOS_URI_ENCODED_COPY_ALL = "https://www.bdsmtest.org/r/qXBN9QWw%0A%0A100%25%20Little%0A93%25%20Switch%0A78%25%20Rope%20bunny%0A0%25%20Primal%20(Prey)";

test.describe("Profiel aanvullen", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndGo(page, "/profile/pw-alex-001", [PROFILE_ALEX, PROFILE_SAM], { profileTourComplete: true });
  });

  test("opent als centered dialog en houdt focus binnen de modal", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Profiel aanvullen" });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Profiel aanvullen" });
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
      return Math.max(0, -rect.top, rect.bottom - visibleHeight);
    })).toBeLessThanOrEqual(1);

    await page.evaluate(() => {
      document.documentElement.style.setProperty("--visual-viewport-height", "420px");
      document.documentElement.style.setProperty("--visual-viewport-offset-top", "80px");
    });

    const viewportFrame = page.getByTestId("profile-enrichment-viewport");
    const header = dialog.getByTestId("profile-enrichment-header");
    const scrollBody = dialog.getByTestId("profile-enrichment-scroll-body");
    const footer = dialog.getByTestId("profile-enrichment-footer");
    const before = await Promise.all([header.boundingBox(), footer.boundingBox()]);
    await scrollBody.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    const after = await Promise.all([header.boundingBox(), footer.boundingBox()]);

    expect(before[0]).not.toBeNull();
    expect(before[1]).not.toBeNull();
    expect(after[0]!.y).toBeCloseTo(before[0]!.y, 0);
    expect(after[1]!.y).toBeCloseTo(before[1]!.y, 0);
    await expect.poll(() => viewportFrame.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { top: Math.round(rect.top), height: Math.round(rect.height) };
    })).toEqual({ top: 80, height: 420 });
    await expect.poll(() => dialog.evaluate((element) => {
      const frame = element.parentElement?.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      return frame ? Math.max(0, frame.top - rect.top, rect.bottom - frame.bottom) : Number.POSITIVE_INFINITY;
    })).toBeLessThanOrEqual(1);

    await dialog.getByRole("button", { name: "Annuleer" }).click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => ({
      rootOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
    }))).toEqual({ rootOverflow: "", bodyOverflow: "", bodyPosition: "" });
  });

  test("splitst de URI-encoded iOS Copy all lokaal in een canonical link en resultaten", async ({ page }) => {
    await page.getByRole("button", { name: "Profiel aanvullen" }).click();
    const dialog = page.getByRole("dialog", { name: "Profiel aanvullen" });
    const paste = dialog.getByPlaceholder("Plak hier de resultaatlink en resultaten");
    await paste.fill(IOS_URI_ENCODED_COPY_ALL);

    await expect(dialog.getByText("Resultaatlink gevonden")).toBeVisible();
    await expect(dialog.getByText("4 resultaten gevonden")).toBeVisible();
    await dialog.getByRole("button", { name: "Opslaan" }).click();

    const bdsmLink = page.getByRole("link", { name: "Open het opgeslagen BDSMTest-resultaat" });
    await expect(bdsmLink).toHaveAttribute("href", "https://bdsmtest.org/r/qXBN9QWw");
    await expect(page.getByText("Little", { exact: true }).first()).toBeVisible();

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

  test("weigert een look-alike URL zonder bestaande data te overschrijven", async ({ page }) => {
    const existing = {
      ...PROFILE_ALEX,
      bdsmtestUrl: "https://bdsmtest.org/r/safeResult",
      bdsmtestScores: [{ role: "Switch", pct: 88 }],
    };
    await page.evaluate((stored) => localStorage.setItem("kink-profiles", JSON.stringify(stored)), buildStore([existing, PROFILE_SAM]));
    await page.goto("/profile/pw-alex-001");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Profiel aanvullen" }).click();
    const dialog = page.getByRole("dialog", { name: "Profiel aanvullen" });
    await dialog.getByPlaceholder("Plak hier de resultaatlink en resultaten").fill(
      "https://bdsmtest.org.evil.example/r/steal\n100% Little",
    );
    await expect(dialog.getByText("De resultaatlink lijkt niet van bdsmtest.org te komen.")).toBeVisible();
    await dialog.getByRole("button", { name: "Opslaan" }).click();
    await expect(dialog).toBeVisible();

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem("kink-profiles");
      return raw ? JSON.parse(raw).state.profiles.find((profile: { id: string }) => profile.id === "pw-alex-001") : null;
    });
    expect(stored.bdsmtestUrl).toBe("https://bdsmtest.org/r/safeResult");
    expect(stored.bdsmtestScores).toEqual([{ role: "Switch", pct: 88 }]);
  });

  test("houdt FetLife op beide Switch-perspectieven maar BDSMTest op het gekozen perspectief", async ({ page }) => {
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

    await page.getByRole("button", { name: "Profiel aanvullen" }).click();
    const dialog = page.getByRole("dialog", { name: "Profiel aanvullen" });
    await dialog.getByPlaceholder("Gebruikersnaam").fill("alexOnFet");
    await dialog.getByPlaceholder("Plak hier de resultaatlink en resultaten").fill(
      "https://bdsmtest.org/r/switchResult\n100% Switch",
    );
    await dialog.getByRole("button", { name: "Opslaan" }).click();

    const profiles = await page.evaluate(() => {
      const raw = localStorage.getItem("kink-profiles");
      return raw ? JSON.parse(raw).state.profiles : [];
    });
    const savedDominant = profiles.find((profile: { id: string }) => profile.id === "pw-alex-001");
    const savedSubmissive = profiles.find((profile: { id: string }) => profile.id === "pw-alex-sub");
    expect(savedDominant.fetLifeUsername).toBe("alexOnFet");
    expect(savedSubmissive.fetLifeUsername).toBe("alexOnFet");
    expect(savedDominant.bdsmtestUrl).toBe("https://bdsmtest.org/r/switchResult");
    expect(savedSubmissive.bdsmtestUrl).toBeUndefined();
  });

  test("toont de enrichment actie niet op een gedeeld profiel", async ({ page }) => {
    const shared = { ...PROFILE_SAM, id: "shared-sam", isImported: true, origin: "shared" as const };
    await seedAndGo(page, "/profile/shared-sam", [shared], { profileTourComplete: true });
    await expect(page.getByRole("button", { name: "Profiel aanvullen" })).toHaveCount(0);
  });
});
