import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

test.describe("Phase groom — review fixes (mobile)", () => {
  test("ProfileSnapshotPanel: save CTA → confirmation → CTA returns", async ({ page }) => {
    await seedAndGo(page, "/profile/pw-alex-001", [PROFILE_ALEX, PROFILE_SAM]);

    const saveBtn = page.getByRole("button", { name: "Sla dit moment op" });
    await expect(saveBtn).toBeVisible();
    await saveBtn.scrollIntoViewIfNeeded();
    await saveBtn.dispatchEvent("click");

    await expect(page.getByText("✓ Moment opgeslagen")).toBeVisible();

    // Confirmation lives for ~1.6s, then the CTA should return
    await expect(saveBtn).toBeVisible({ timeout: 3000 });

    const snapshots = await page.evaluate(() => {
      const raw = localStorage.getItem("kink-profiles");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { state?: { profileSnapshots?: unknown[] } };
      return parsed.state?.profileSnapshots ?? [];
    });
    expect(snapshots.length).toBe(1);
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
