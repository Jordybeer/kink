import { test, expect, type Browser, type BrowserContext, type Page, type Route } from "@playwright/test";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "./fixtures";
import type { Profile } from "@/types";

// In-memory relay so tests don't need a running Redis instance.
// Shared across host + guest pages via a single Map closure.
function createRelay() {
  const store = new Map<string, string>();
  return async (route: Route) => {
    const url = new URL(route.request().url());
    const parts = url.pathname.split("/").filter(Boolean);
    const code = parts[2];
    const type = parts[3];
    const key = `${code}:${type}`;
    if (route.request().method() === "POST") {
      const bodyText = route.request().postData() ?? "{}";
      const body = JSON.parse(bodyText) as Record<string, unknown>;
      const sdp = body[type] as string | undefined;
      if (sdp) {
        store.set(key, sdp);
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      } else {
        await route.fulfill({ status: 400, body: "" });
      }
    } else {
      const sdp = store.get(key);
      if (sdp) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ [type]: sdp }) });
      } else {
        await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not found" }) });
      }
    }
  };
}

test.describe("live sessie", () => {
  let ctxHost: BrowserContext | undefined;
  let ctxGuest: BrowserContext | undefined;

  test.afterEach(async () => {
    await ctxHost?.close();
    await ctxGuest?.close();
    ctxHost = undefined;
    ctxGuest = undefined;
  });

  async function buildPair(
    browser: Browser,
    hostProfiles: Profile[] = [PROFILE_ALEX],
    guestProfiles: Profile[] = [PROFILE_SAM],
  ) {
    ctxHost = await browser.newContext();
    ctxGuest = await browser.newContext();
    const host = await ctxHost.newPage();
    const guest = await ctxGuest.newPage();
    const relay = createRelay();
    await host.route(/\/api\/relay\//, relay);
    await guest.route(/\/api\/relay\//, relay);
    await seedAndGo(host, "/session", hostProfiles);
    await seedAndGo(guest, "/session", guestProfiles);
    return { host, guest };
  }

  // Zustand persist hydrates asynchronously on first page load, so profileId
  // initialises to "" before profiles are available. Explicitly select index 0
  // after the picker appears to ensure the profile is locked in and the button
  // becomes enabled.
  async function hostStart(host: Page): Promise<string> {
    await host.getByRole("button", { name: "Sessie aanmaken" }).click();
    await expect(host.locator("select")).toBeVisible({ timeout: 5000 });
    await host.locator("select").selectOption({ index: 0 });
    await host.getByRole("button", { name: "Sessie starten →" }).click();
    const codeEl = host.locator(".text-6xl");
    await expect(codeEl).toBeVisible({ timeout: 15000 });
    return (await codeEl.textContent())!.trim();
  }

  async function guestJoin(guest: Page, code: string) {
    await guest.getByRole("button", { name: "Deelnemen met code" }).click();
    await expect(guest.locator("select")).toBeVisible({ timeout: 5000 });
    await guest.locator("select").selectOption({ index: 0 });
    await guest.getByPlaceholder("Bijv. H7K2PQ").fill(code);
    await guest.getByRole("button", { name: "Verbinden →" }).click();
  }

  async function waitLive(host: Page, guest: Page) {
    await expect(host.getByText("Live")).toBeVisible({ timeout: 15000 });
    await expect(guest.getByText("Live")).toBeVisible({ timeout: 15000 });
  }

  test("verbinding tot stand", async ({ browser }) => {
    const { host, guest } = await buildPair(browser);
    const code = await hostStart(host);
    await guestJoin(guest, code);
    await waitLive(host, guest);
  });

  test("STUN-only fallback bij 503", async ({ browser }) => {
    const { host, guest } = await buildPair(browser);
    await host.route("/api/turn", route => route.fulfill({ status: 503, body: "" }));
    await guest.route("/api/turn", route => route.fulfill({ status: 503, body: "" }));
    const code = await hostStart(host);
    await guestJoin(guest, code);
    await waitLive(host, guest);
    await expect(host.locator('p[style*="hard-no"]')).not.toBeVisible({ timeout: 5000 });
    await expect(guest.locator('p[style*="hard-no"]')).not.toBeVisible({ timeout: 5000 });
  });

  test("TURN Cloudflare object-formaat (geen array)", async ({ browser }) => {
    ctxHost = await browser.newContext();
    const page = await ctxHost.newPage();
    const relay = createRelay();
    await page.route(/\/api\/relay\//, relay);
    await page.route("/api/turn", route =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          // Cloudflare geeft één object terug, niet een array
          iceServers: { urls: "turn:test.example.com:3478", username: "u", credential: "p" },
        }),
      }),
    );
    await seedAndGo(page, "/session", [PROFILE_ALEX]);
    await page.getByRole("button", { name: "Sessie aanmaken" }).click();
    await expect(page.locator("select")).toBeVisible({ timeout: 5000 });
    await page.locator("select").selectOption({ index: 0 });
    await page.getByRole("button", { name: "Sessie starten →" }).click();
    // Moet de code tonen zonder GEEN TURN waarschuwing
    await expect(page.locator(".text-6xl")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("⚠ GEEN TURN")).not.toBeVisible();
  });

  test("TURN gelukkig pad", async ({ browser }) => {
    ctxHost = await browser.newContext();
    const page = await ctxHost.newPage();
    const relay = createRelay();
    await page.route(/\/api\/relay\//, relay);
    const requests: string[] = [];
    await page.route("/api/turn", async route => {
      requests.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          iceServers: [{ urls: "turn:test.example.com:3478", username: "u", credential: "p" }],
        }),
      });
    });
    await seedAndGo(page, "/session", [PROFILE_ALEX]);
    await page.getByRole("button", { name: "Sessie aanmaken" }).click();
    await expect(page.locator("select")).toBeVisible({ timeout: 5000 });
    await page.locator("select").selectOption({ index: 0 });
    const turnDone = page.waitForResponse(r => r.url().includes("/api/turn"), { timeout: 10000 });
    await page.getByRole("button", { name: "Sessie starten →" }).click();
    await turnDone;
    expect(requests).toHaveLength(1);
    await expect(page.locator('p[style*="hard-no"]')).not.toBeVisible({ timeout: 5000 });
  });

  test("partner aanwezigheid indicator", async ({ browser }) => {
    const { host, guest } = await buildPair(browser);
    const code = await hostStart(host);
    await guestJoin(guest, code);
    await waitLive(host, guest);

    // Open first category accordion on host then click a status pill
    await host.locator("button").filter({ hasText: "▼" }).first().click();
    await host.locator('button[aria-pressed]').first().click();

    // Guest's " is aan het invullen…" span must become opacity 1
    const activeSpan = guest.locator("span").filter({ hasText: "is aan het invullen" }).first();
    await expect(activeSpan).toHaveCSS("opacity", "1", { timeout: 5000 });
  });

  test("wachtkamer scherm", async ({ browser }) => {
    const { host, guest } = await buildPair(browser);
    const code = await hostStart(host);
    await guestJoin(guest, code);
    await waitLive(host, guest);

    // Open a category on guest so a pill is visible before host submits
    await guest.locator("button").filter({ hasText: "▼" }).first().click();
    const guestPill = guest.locator('button[aria-pressed]').first();
    await expect(guestPill).toBeVisible({ timeout: 5000 });

    // Host submits
    await host.getByRole("button", { name: /Sluit af/ }).click();

    // Host: done_local waiting screen
    await expect(host.locator(".ks-icon-pop")).toBeVisible({ timeout: 5000 });
    await expect(host.locator(".ks-dot-pulse")).toBeVisible({ timeout: 5000 });
    await expect(host.getByText(/Zodra je partner klaar is/)).toBeVisible({ timeout: 5000 });

    // Guest: still in connected phase — pill visible, waiting screen absent
    await expect(guestPill).toBeVisible({ timeout: 5000 });
    await expect(guest.locator(".ks-dot-pulse")).not.toBeVisible({ timeout: 5000 });
  });

  test("onthulling — categorieën en matches", async ({ browser }) => {
    const { host, guest } = await buildPair(browser);
    const code = await hostStart(host);
    await guestJoin(guest, code);
    await waitLive(host, guest);

    await host.getByRole("button", { name: /Sluit af/ }).click();
    await guest.getByRole("button", { name: /Sluit af/ }).click();

    await expect(host.locator("h2").filter({ hasText: /matches/ })).toBeVisible({ timeout: 15000 });
    await expect(guest.locator("h2").filter({ hasText: /matches/ })).toBeVisible({ timeout: 15000 });

    await expect(host.locator("[data-category]").first()).toBeVisible({ timeout: 8000 });
    await expect(host.locator("[data-kink-id]").first()).toBeVisible({ timeout: 8000 });

    // match-pulse is added via setTimeout after reveal — poll up to 8 s
    await host.waitForSelector(".match-pulse", { timeout: 8000 });
  });

  test("nul-matches kaart", async ({ browser }) => {
    test.setTimeout(60000);
    const alexNoMatch: Profile = {
      ...PROFILE_ALEX,
      id: "pw-alex-nomatch",
      entries: Object.fromEntries(
        Object.keys(PROFILE_ALEX.entries).map(k => [k, { status: "hard_no" as const, score: null, comment: "" }]),
      ),
    };
    const samNoMatch: Profile = {
      ...PROFILE_SAM,
      id: "pw-sam-nomatch",
      entries: Object.fromEntries(
        Object.keys(PROFILE_SAM.entries).map(k => [k, { status: "no" as const, score: null, comment: "" }]),
      ),
    };

    const { host, guest } = await buildPair(browser, [alexNoMatch], [samNoMatch]);
    // Skip animation so the zero-state card appears immediately
    await host.emulateMedia({ reducedMotion: "reduce" });
    await guest.emulateMedia({ reducedMotion: "reduce" });
    const code = await hostStart(host);
    await guestJoin(guest, code);
    await waitLive(host, guest);

    await host.getByRole("button", { name: /Sluit af/ }).click();
    await guest.getByRole("button", { name: /Sluit af/ }).click();

    await expect(host.getByRole("heading", { name: /Geen matches/ })).toBeVisible({ timeout: 8000 });
    await expect(guest.getByRole("heading", { name: /Geen matches/ })).toBeVisible({ timeout: 8000 });
  });

  test("prefers-reduced-motion", async ({ browser }) => {
    const { host, guest } = await buildPair(browser);
    const code = await hostStart(host);
    await guestJoin(guest, code);
    await waitLive(host, guest);

    await host.emulateMedia({ reducedMotion: "reduce" });
    await guest.emulateMedia({ reducedMotion: "reduce" });

    // Host submits first — waiting screen appears briefly
    await host.getByRole("button", { name: /Sluit af/ }).click();

    await expect(host.locator(".ks-dot-pulse")).toBeVisible({ timeout: 5000 });
    const animName = await host.locator(".ks-dot-pulse").evaluate(
      el => getComputedStyle(el.querySelector("span")!).animationName,
    );
    expect(animName).toBe("none");

    // Guest submits — both enter revealed
    await guest.getByRole("button", { name: /Sluit af/ }).click();

    await expect(host.locator("h2").filter({ hasText: /matches/ })).toBeVisible({ timeout: 8000 });
    await expect(guest.locator("h2").filter({ hasText: /matches/ })).toBeVisible({ timeout: 8000 });

    // With reduced motion all items revealed at once — first appears quickly
    await expect(host.locator("[data-kink-id].partner-reveal").first()).toBeVisible({ timeout: 2000 });
  });
});
