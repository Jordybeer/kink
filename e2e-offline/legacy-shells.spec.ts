import { test, expect } from "@playwright/test";
import { goOffline } from "./offlineHarness";

async function waitForOfflineCache(page: import("@playwright/test").Page) {
  await expect.poll(
    () => page.evaluate(() => document.documentElement.dataset.offlineCache),
    { timeout: 20_000 },
  ).toBe("ready");
}

test("legacy profile, timeline and scene urls keep useful fixed-shell fallbacks offline", async ({ page, context }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("kink-profiles")) return;
    localStorage.setItem("kink-profiles", JSON.stringify({
      state: {
        profiles: [],
        contracts: [],
        profileSnapshots: [],
        scenes: [],
        onboardingComplete: true,
        profileTourComplete: true,
        installPromptDismissed: true,
        notificationPermissionAsked: true,
        theme: "midnight",
        pinnedProfileId: null,
        appLockEnabled: false,
        appLockPin: null,
        biometricEnabled: false,
        biometricCredentialId: null,
      },
      version: 15,
    }));
  });

  await page.goto("/", { waitUntil: "networkidle" });
  await waitForOfflineCache(page);
  await goOffline(context);

  await page.evaluate(() => {
    const raw = localStorage.getItem("kink-profiles");
    if (!raw) throw new Error("persisted store missing");
    const persisted = JSON.parse(raw);
    const now = Date.now();

    persisted.state.profiles.push({
      id: "profile-born-offline",
      name: "Legacy Nova",
      role: "submissive",
      experienceLevel: "beginner",
      origin: "own",
      customKinks: [],
      entries: {},
      createdAt: now,
      updatedAt: now,
    });
    persisted.state.scenes.push({
      id: "scene-born-offline",
      title: "Legacy scène",
      profileAId: "profile-born-offline",
      profileBId: "partner",
      profileAName: "Legacy Nova",
      profileBName: "Partner",
      items: [],
      status: "completed",
      createdAt: now,
      updatedAt: now,
    });

    localStorage.setItem("kink-profiles", JSON.stringify(persisted));
  });

  await page.goto("/profile/profile-born-offline", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/\/profile\/profile-born-offline$/);
  await expect(page.getByText("Legacy Nova").first()).toBeVisible();
  await expect(page.getByText("Profiel niet gevonden")).toHaveCount(0);

  await page.goto("/profile/profile-born-offline/questions", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/\/profile\/profile-born-offline\/questions$/);
  await expect(page.getByTestId("questions-screen")).toBeVisible();
  await expect(page.getByText("Profiel niet gevonden")).toHaveCount(0);

  await page.goto("/timeline?a=profile-born-offline&b=partner", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/\/contracts$/);
  await expect(page.getByRole("heading", { name: "Contracten" })).toBeAttached();
  await expect(page.getByText("Je bent offline")).toHaveCount(0);

  await page.goto("/scenes/scene-born-offline", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/\/scenes\/scene-born-offline$/);
  await expect(page.getByText("Legacy scène").first()).toBeVisible();
  await expect(page.getByText("Je bent offline")).toHaveCount(0);
});
