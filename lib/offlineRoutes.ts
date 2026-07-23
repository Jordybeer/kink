export const STATIC_OFFLINE_ROUTES = [
  "/",
  "/compare",
  "/contract",
  "/scene",
  "/scenes",
  "/session",
  "/timeline",
] as const;

export function buildOfflineWarmupRoutes(
  profileIds: readonly string[],
  sceneIds: readonly string[],
): string[] {
  return [
    ...STATIC_OFFLINE_ROUTES,
    ...profileIds.map((id) => `/profile/${encodeURIComponent(id)}`),
    ...sceneIds.map((id) => `/scenes/${encodeURIComponent(id)}`),
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

  const urlsToCache = [...new Set(routes)];
  if (urlsToCache.length === 0) return true;

  return new Promise<boolean>((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => resolve(false), 20_000);

    channel.port1.onmessage = () => {
      window.clearTimeout(timeout);
      resolve(true);
    };

    worker.postMessage(
      {
        type: "CACHE_URLS",
        payload: { urlsToCache },
      },
      [channel.port2],
    );
  });
}
