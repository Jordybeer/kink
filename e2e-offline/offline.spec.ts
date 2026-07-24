import { test, expect } from "@playwright/test";

// Offline capability only exists in a PRODUCTION build — Serwist is disabled in
// dev (next.config.ts: `disable: NODE_ENV !== "production"`). This suite runs
// against `next start` via playwright.offline.config.ts, NOT the dev server.

const STATIC_ROUTES = [
  "/",
  "/scene",
  "/scenes",
  "/compare",
  "/contract",
  "/timeline",
  "/session",
];

async function waitForOfflineCache(page: import("@playwright/test").Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {
    timeout: 20_000,
  });
  await page.waitForFunction(
    () => document.documentElement.dataset.offlineCache === "ready",
    null,
    { timeout: 30_000 },
  );
  await page.waitForLoadState("networkidle");
}

function storedState() {
  const now = Date.now();
  const profile = (id: string, name: string) => ({
    id,
    name,
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: now,
    updatedAt: now,
    entries: {},
  });

  return {
    state: {
      profiles: [profile("profile-a", "Mira"), profile("profile-b", "Noor")],
      contracts: [],
      profileSnapshots: [],
      scenes: [
        {
          id: "scene-a",
          title: "Offline scène",
          profileAId: "profile-a",
          profileBId: "profile-b",
          profileAName: "Mira",
          profileBName: "Noor",
          items: [],
          status: "planned",
          createdAt: now,
          updatedAt: now,
        },
      ],
      onboardingComplete: true,
      profileTourComplete: true,
      installPromptDismissed: true,
      notificationPermissionAsked: true,
      theme: "midnight",
      pinnedProfileId: "profile-a",
      appLockEnabled: false,
      appLockPin: null,
      biometricEnabled: false,
      biometricCredentialId: null,
    },
    version: 15,
  };
}

test("every fixed room works offline without visiting it first", async ({ page, context }) => {
  // Only the home page is visited online. The install + automatic warmup must
  // prepare every other fixed route without a manual page-by-page ritual.
  await page.goto("/", { waitUntil: "networkidle" });
  await waitForOfflineCache(page);

  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await context.setOffline(true);

  for (const route of STATIC_ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    const text = (await page.evaluate(() => document.body.innerText)).trim();
    expect(text.length, `offline ${route} should render content`).toBeGreaterThan(30);
    expect(text, `offline ${route} should not be the offline fallback`).not.toContain("Je bent offline");
  }

  expect(errors, `page errors offline: ${errors.join(" | ")}`).toHaveLength(0);

  await page.goto("/scenes", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("status", { name: "Offline" }).first()).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByRole("status", { name: "Online" }).first()).toBeVisible();
});

test("home compare and profile cards use warmed documents offline", async ({ page, context }) => {
  await page.addInitScript((persisted) => {
    localStorage.setItem("kink-profiles", JSON.stringify(persisted));
  }, storedState());

  await page.goto("/", { waitUntil: "networkidle" });
  await waitForOfflineCache(page);
  await context.setOffline(true);

  // The large home CTA carries profile IDs in its query string. Offline it must
  // preserve those IDs instead of reusing a query-less RSC payload.
  await page.locator('a[href="/compare?a=profile-a&b=profile-b"]').click();
  await expect(page).toHaveURL(/\/compare\?a=profile-a&b=profile-b$/);
  await expect(page.getByText("Je bent offline")).toHaveCount(0);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Profiel Mira openen" }).click();
  await expect(page).toHaveURL(/\/profile\/profile-a$/);
  await expect(page.getByText("Mira").first()).toBeVisible();
  await expect(page.getByText("Profiel niet gevonden")).toHaveCount(0);

  await page.goto("/scenes/scene-a", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Offline scène").first()).toBeVisible();
  await expect(page.getByText("Je bent offline")).toHaveCount(0);
});

test("an ordinary browser tab can open cached pages after going offline", async ({ page, context }) => {
  await page.addInitScript((persisted) => {
    localStorage.setItem("kink-profiles", JSON.stringify(persisted));
  }, storedState());

  await page.goto("/", { waitUntil: "networkidle" });
  await waitForOfflineCache(page);
  await context.setOffline(true);

  const browserTab = await context.newPage();
  await browserTab.goto("/compare?a=profile-a&b=profile-b", {
    waitUntil: "domcontentloaded",
  });
  await expect(browserTab.getByText("Je bent offline")).toHaveCount(0);

  await browserTab.goto("/profile/profile-a", { waitUntil: "domcontentloaded" });
  await expect(browserTab.getByText("Mira").first()).toBeVisible();
  await expect(browserTab.getByText("Profiel niet gevonden")).toHaveCount(0);
});

test("an unknown dynamic route still falls back safely offline", async ({ page, context }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await waitForOfflineCache(page);

  await context.setOffline(true);
  await page.goto("/scenes/never-cached-" + Date.now(), {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("Je bent offline")).toBeVisible();
});
