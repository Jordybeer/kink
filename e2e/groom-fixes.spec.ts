import { test, expect } from "@playwright/test";
import {
  CONTRACT_SERIES_ALEX_SAM,
  PROFILE_ALEX,
  PROFILE_SAM,
  seedAndGo,
} from "./fixtures";

test.describe("Phase groom — review fixes (mobile)", () => {
  test("ProfileSnapshotPanel: only meaningful public automatic status changes surface", async ({ page }) => {
    await seedAndGo(page, "/profile/pw-alex-001", [PROFILE_ALEX, PROFILE_SAM]);

    await expect(page.getByRole("button", { name: "Sla dit moment op" })).toHaveCount(0);
    await expect(page.getByTestId("profile-history-panel")).toHaveCount(0);

    await page.evaluate(() => {
      const raw = localStorage.getItem("kink-profiles");
      if (!raw) throw new Error("KinkSync store ontbreekt");
      const parsed = JSON.parse(raw) as {
        state: {
          profiles: Array<{
            id: string;
            entries: Record<string, { status?: string | null; privateResponse?: boolean; [key: string]: unknown }>;
            customKinks?: Array<{ id: string; name: string }>;
          }>;
          profileSnapshots: unknown[];
        };
      };
      const profile = parsed.state.profiles.find((candidate) => candidate.id === "pw-alex-001");
      if (!profile) throw new Error("Testprofiel ontbreekt");

      const latestEntries = structuredClone(profile.entries);
      const olderEntries = structuredClone(profile.entries);
      const previousSpanking = olderEntries.spanking_hand_give ?? {};
      olderEntries.spanking_hand_give = {
        ...previousSpanking,
        status: "maybe",
      };
      const previousChoking = olderEntries.choking ?? {};
      olderEntries.choking = {
        ...previousChoking,
        status: "yes",
      };
      profile.entries.choking = {
        ...(profile.entries.choking ?? {}),
        privateResponse: true,
      };

      const counts = { yes: 0, willing: 0, maybe: 0, no: 0, hard_no: 0 };
      parsed.state.profileSnapshots = [
        {
          id: "profile-moment-older",
          profileId: profile.id,
          date: 1700000000000,
          entries: olderEntries,
          customKinks: profile.customKinks ?? [],
          counts,
        },
        {
          id: "profile-moment-latest",
          profileId: profile.id,
          date: 1700086400000,
          entries: latestEntries,
          customKinks: profile.customKinks ?? [],
          counts,
        },
      ];
      localStorage.setItem("kink-profiles", JSON.stringify(parsed));
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    const history = page.getByTestId("profile-history-panel");
    await expect(history).toBeVisible();
    await expect(history).toContainText("Spanking");
    await expect(history).toContainText("Misschien");
    await expect(history).toContainText("Heel graag");
    await expect(history).not.toContainText("Choking");
    await expect(page.getByRole("button", { name: "Sla dit moment op" })).toHaveCount(0);
  });

  test("legacy timeline pair opens the current contract history", async ({ page }) => {
    await seedAndGo(
      page,
      "/timeline?a=pw-alex-001&b=pw-sam-002",
      [PROFILE_ALEX, PROFILE_SAM],
      { contractSeries: [CONTRACT_SERIES_ALEX_SAM] },
    );

    await expect(page).toHaveURL(/\/contracts\/pw-contract-series-alex-sam\/history$/);
    await expect(page.getByText("Contractgeschiedenis", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("tablist")).toHaveCount(0);
  });

  test("DiscussedToggle: hidden until a kink is marked besproken", async ({ page }) => {
    await seedAndGo(page, "/compare?a=pw-alex-001&b=pw-sam-002", [PROFILE_ALEX, PROFILE_SAM]);

    // No kink marked discussed yet → toggle must not render
    await expect(page.getByRole("button", { name: /Verberg besproken|Toon alles/ })).toHaveCount(0);

    // Tap the "als besproken markeren" button on the first kink we see
    const markBtn = page
      .locator("button[aria-label*='als besproken markeren']")
      .first();
    await markBtn.scrollIntoViewIfNeeded();
    await markBtn.dispatchEvent("click");

    const toggle = page.getByRole("button", { name: /Verberg besproken \(\d+\)|Toon alles \(\d+\)/ });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText(/Verberg besproken \(1\)|Toon alles \(1\)/);
  });
});
