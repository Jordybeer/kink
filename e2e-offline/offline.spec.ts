import { test, expect } from "@playwright/test";

// Offline capability only exists in a PRODUCTION build — Serwist is disabled in
// dev (next.config.ts: `disable: NODE_ENV !== "production"`). This suite runs
// against `next start` via playwright.offline.config.ts, NOT the dev server.

const ROUTES = ["/", "/scene", "/scenes", "/compare", "/contract", "/timeline", "/session"];

test("the playroom stays open with the network in chastity", async ({ page, context }) => {
  // Online: let the service worker collar the page, then warm every route.
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20000 });
  for (const r of ROUTES) await page.goto(r, { waitUntil: "networkidle" });

  // Collect anything that dares to hit the network once we're offline.
  const failed: string[] = [];
  const errors: string[] = [];
  page.on("requestfailed", (r) => failed.push(r.url()));
  page.on("pageerror", (e) => errors.push(e.message));

  // Pull the plug.
  await context.setOffline(true);

  // Every warmed route still renders the real app from cache — no white screen,
  // no "Je bent offline" fallback.
  for (const r of ROUTES) {
    await page.goto(r, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const text = (await page.evaluate(() => document.body.innerText)).trim();
    expect(text.length, `offline ${r} should render content`).toBeGreaterThan(30);
    expect(text, `offline ${r} should not be the offline fallback`).not.toContain("Je bent offline");
  }

  expect(failed, `failed requests offline: ${failed.join(", ")}`).toHaveLength(0);
  expect(errors, `page errors offline: ${errors.join(" | ")}`).toHaveLength(0);
});

test("an uncached route falls back to the safeword page offline", async ({ page, context }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20000 });

  await context.setOffline(true);
  // A route never visited this session, with a cache-busting query so the SW
  // can't have it cached → document fallback to /offline.
  await page.goto("/scenes/never-visited-" + Date.now(), { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Je bent offline")).toBeVisible();
});
