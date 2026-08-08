import type { BrowserContext, Route } from "@playwright/test";

const NETWORK_PATTERN = "**/*";

async function blockServiceWorkerNetwork(route: Route) {
  if (route.request().serviceWorker()) {
    await route.abort("internetdisconnected");
    return;
  }
  await route.continue();
}

export async function goOffline(context: BrowserContext) {
  // `setOffline(true)` updates the page-facing network state, while explicitly
  // aborting Service Worker-owned requests guarantees that a NetworkFirst
  // strategy cannot quietly reach the test server behind that emulation.
  await context.route(NETWORK_PATTERN, blockServiceWorkerNetwork);
  await context.setOffline(true);
}

export async function goOnline(context: BrowserContext) {
  await context.setOffline(false);
  await context.unroute(NETWORK_PATTERN, blockServiceWorkerNetwork);
}
