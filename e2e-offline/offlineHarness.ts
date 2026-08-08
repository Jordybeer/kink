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
  // `setOffline(true)` tells the page the network is gagged; aborting
  // Service Worker-owned requests keeps NetworkFirst on the same short leash,
  // so it cannot sneak back to the test server behind the emulation.
  await context.route(NETWORK_PATTERN, blockServiceWorkerNetwork);
  await context.setOffline(true);
}

export async function goOnline(context: BrowserContext) {
  await context.setOffline(false);
  await context.unroute(NETWORK_PATTERN, blockServiceWorkerNetwork);
}
