import {
  PROFILE_SHELL_ROUTE,
  SCENE_DETAIL_SHELL_ROUTE,
} from "./localRoutes";

export const STATIC_OFFLINE_ROUTES = [
  "/",
  PROFILE_SHELL_ROUTE,
  "/compare",
  "/contract",
  "/contracts",
  "/scene",
  "/scenes",
  SCENE_DETAIL_SHELL_ROUTE,
  "/about",
  "/timeline",
  "/munch-punch",
  "/munch-punch/join",
] as const;

export function buildOfflineWarmupRoutes(
  profileIds: readonly string[],
  sceneIds: readonly string[],
  extraRoutes: readonly string[] = [],
): string[] {
  return [
    ...STATIC_OFFLINE_ROUTES,
    ...profileIds.map((id) => `/profile/${encodeURIComponent(id)}`),
    ...sceneIds.map((id) => `/scenes/${encodeURIComponent(id)}`),
    ...extraRoutes,
  ].filter((route, index, routes) => routes.indexOf(route) === index);
}

export async function warmOfflineRoutes(routes: readonly string[]): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !navigator.onLine
  ) {
    return false;
  }

  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 10_000)),
  ]);
  if (!registration) return false;

  const worker =
    navigator.serviceWorker.controller ??
    registration.active ??
    registration.waiting;
  if (!worker) return false;

  const uniqueRoutes = [...new Set(routes)];
  if (uniqueRoutes.length === 0) return true;

  const urlsToCache = uniqueRoutes.map((url) => [
    url,
    { headers: { Accept: "text/html" } },
  ]);

  return new Promise<boolean>((resolve) => {
    const channel = new MessageChannel();
    let settled = false;

    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      channel.port1.close();
      resolve(result);
    };

    const timeout = window.setTimeout(() => finish(false), 20_000);
    channel.port1.onmessage = () => finish(true);
    channel.port1.onmessageerror = () => finish(false);

    try {
      worker.postMessage(
        {
          type: "CACHE_URLS",
          payload: { urlsToCache },
        },
        [channel.port2],
      );
    } catch {
      finish(false);
    }
  });
}
