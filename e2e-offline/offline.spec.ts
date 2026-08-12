import { test, expect } from "@playwright/test";
import { goOffline, goOnline } from "./offlineHarness";

// Offline capability only exists in a PRODUCTION build — Serwist is disabled in
// dev (next.config.ts: `disable: NODE_ENV !== "production"`). This suite runs
// against `next start` via playwright.offline.config.ts, NOT the dev server.

const STATIC_ROUTES = [
  { url: "/" },
  { url: "/profile", shellMarker: "Profiel niet gevonden" },
  { url: "/scene" },
  { url: "/scenes" },
  { url: "/scenes/view", shellMarker: "Scène niet gevonden" },
  { url: "/compare" },
  { url: "/contract" },
  { url: "/contracts" },
  { url: "/timeline" },
  { url: "/about" },
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

async function seedStore(page: import("@playwright/test").Page) {
  await page.addInitScript((persisted) => {
    if (localStorage.getItem("kink-profiles")) return;
    localStorage.setItem("kink-profiles", JSON.stringify(persisted));
  }, storedState());
}

test("background work never sends local record ids to the origin", async ({ page }) => {
  await seedStore(page);
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));

  await page.goto("/", { waitUntil: "networkidle" });
  await waitForOfflineCache(page);

  // Next.js only starts automatic Link prefetching when a link becomes visible.
  // Exercise every home link carrying a seeded local id without clicking it.
  const privateLinks = page.locator(
    'a[href*="profile-a"]:visible, a[href*="profile-b"]:visible, a[href*="scene-a"]:visible',
  );
  expect(await privateLinks.count(), "expected visible links carrying seeded local ids").toBeGreaterThan(0);
  for (let index = 0; index < await privateLinks.count(); index += 1) {
    await privateLinks.nth(index).scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(500);

  const leakedRequests = requestedUrls.filter((url) =>
    ["profile-a", "profile-b", "scene-a"].some((id) => url.includes(id)),
  );
  expect(leakedRequests, `background requests exposed local ids: ${leakedRequests.join(" | ")}`).toEqual([]);
});

test("every fixed room works offline without visiting it first", async ({ page, context }) => {
  // Only the home page is visited online. The install + automatic warmup must
  // prepare every other fixed route without a manual page-by-page ritual.
  await page.goto("/", { waitUntil: "networkidle" });
  await waitForOfflineCache(page);

  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await goOffline(context);

  for (const route of STATIC_ROUTES) {
    await page.goto(route.url, { waitUntil: "domcontentloaded" });
    const shellMarker = "shellMarker" in route ? route.shellMarker : undefined;
    if (shellMarker) {
      await expect(page.getByText(shellMarker)).toBeVisible({ timeout: 10_000 });
    } else {
      await page.waitForTimeout(300);
    }
    const text = (await page.evaluate(() => document.body.innerText)).trim();
    if (shellMarker) {
      expect(text, `offline ${route.url} should render its fixed shell`).toContain(shellMarker);
    } else {
      expect(text.length, `offline ${route.url} should render content`).toBeGreaterThan(30);
    }
    expect(text, `offline ${route.url} should not be the offline fallback`).not.toContain("Je bent offline");
  }

  expect(errors, `page errors offline: ${errors.join(" | ")}`).toHaveLength(0);

  await page.goto("/scenes", { waitUntil: "domcontentloaded" });
  const offlineStatus = page.getByRole("status", { name: "Offline" }).first();
  await expect(offlineStatus).toBeVisible();

  await goOnline(context);
  await expect(offlineStatus).toHaveCount(0);
});

test("legacy cards fold into the fixed profile and scene shells offline", async ({ page, context }) => {
  await seedStore(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await waitForOfflineCache(page);
  await goOffline(context);

  // The large home CTA carries profile IDs in its query string. Offline it must
  // preserve those IDs instead of reusing a query-less RSC payload.
  await page.locator('a[href="/compare?a=profile-a&b=profile-b"]').click();
  await expect(page).toHaveURL(/\/compare\?a=profile-a&b=profile-b$/);
  await expect(page.getByText("Je bent offline")).toHaveCount(0);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Mira Switch openen" }).click();
  await expect(page).toHaveURL(/\/profile\?id=profile-a$/);
  await expect(page.getByText("Mira").first()).toBeVisible();
  await expect(page.getByText("Profiel niet gevonden")).toHaveCount(0);

  await page.goto("/scenes/view?id=scene-a", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Offline scène").first()).toBeVisible();
  await expect(page.getByText("Je bent offline")).toHaveCount(0);
});

test("a profile born after the network cut opens and reloads immediately", async ({ page, context }) => {
  await seedStore(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await waitForOfflineCache(page);
  await goOffline(context);

  await page.getByRole("button", { name: "Nieuw profiel" }).click();
  await page.getByLabel("Naam of alias").fill("Nova offline");
  await page.getByRole("button", { name: /^Submissive/ }).click();
  await page.getByRole("button", { name: "Verder" }).click();
  await page.getByRole("button", { name: "Start vragen" }).click();

  await expect(page).toHaveURL(/\/profile\/[^/]+\/questions$/);
  await expect(page.getByTestId("questions-screen")).toBeVisible();
  await expect(page.getByText("Je bent offline")).toHaveCount(0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("questions-screen")).toBeVisible();
  await expect(page.getByText("Profiel niet gevonden")).toHaveCount(0);
});

test("a scene born after the network cut opens in a new browser tab", async ({ page, context }) => {
  await seedStore(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await waitForOfflineCache(page);
  await goOffline(context);

  await page.evaluate(() => {
    const raw = localStorage.getItem("kink-profiles");
    if (!raw) throw new Error("seeded store missing");
    const persisted = JSON.parse(raw);
    const now = Date.now();
    persisted.state.scenes.push({
      id: "scene-born-offline",
      title: "Pas offline geboren",
      profileAId: "profile-a",
      profileBId: "profile-b",
      profileAName: "Mira",
      profileBName: "Noor",
      items: [],
      status: "completed",
      createdAt: now,
      updatedAt: now,
    });
    localStorage.setItem("kink-profiles", JSON.stringify(persisted));
  });

  const browserTab = await context.newPage();
  await browserTab.goto("/scenes/view?id=scene-born-offline", {
    waitUntil: "domcontentloaded",
  });
  await expect(browserTab.getByText("Pas offline geboren").first()).toBeVisible();
  await expect(browserTab.getByText("Je bent offline")).toHaveCount(0);
});

test("an ordinary browser tab can open cached pages after going offline", async ({ page, context }) => {
  await seedStore(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await waitForOfflineCache(page);
  await goOffline(context);

  const browserTab = await context.newPage();
  await browserTab.goto("/compare?a=profile-a&b=profile-b", {
    waitUntil: "domcontentloaded",
  });
  await expect(browserTab.getByText("Je bent offline")).toHaveCount(0);

  await browserTab.goto("/profile?id=profile-a", { waitUntil: "domcontentloaded" });
  await expect(browserTab.getByText("Mira").first()).toBeVisible();
  await expect(browserTab.getByText("Profiel niet gevonden")).toHaveCount(0);

  // Old bookmarks remain supported through the fixed offline profile shell.
  await browserTab.goto("/profile/profile-a", { waitUntil: "domcontentloaded" });
  await expect(browserTab.getByText("Mira").first()).toBeVisible();
});

test("unknown routes choose the right safe offline fallback", async ({ page, context }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await waitForOfflineCache(page);

  await goOffline(context);
  await page.goto("/scenes/never-cached-" + Date.now(), {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("Scène niet gevonden")).toBeVisible();
  await expect(page.getByText("Je bent offline")).toHaveCount(0);

  await page.goto("/never-cached-" + Date.now(), {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("Je bent offline")).toBeVisible();
});
