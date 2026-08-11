/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { ExpirationPlugin, NetworkFirst, Serwist } from "serwist";
import {
  PROFILE_SHELL_ROUTE,
  SCENE_DETAIL_SHELL_ROUTE,
} from "../lib/localRoutes";
import { STATIC_OFFLINE_ROUTES } from "../lib/offlineRoutes";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { url: string; revision: string | null })[];
};

const THIRTY_DAYS = 30 * 24 * 60 * 60;

function isDocumentRequest(request: Request): boolean {
  return request.mode === "navigate" || request.destination === "document";
}

const offlineRuntimeCaching = [
  {
    // CACHE_URLS warms these with Accept: text/html; real browser/PWA reloads
    // arrive as navigate requests. Both must land in the same cache.
    matcher({ request, url, sameOrigin }: { request: Request; url: URL; sameOrigin: boolean }) {
      return (
        sameOrigin &&
        !url.pathname.startsWith("/api/") &&
        (request.mode === "navigate" ||
          request.headers.get("Accept")?.includes("text/html") === true)
      );
    },
    handler: new NetworkFirst({
      cacheName: "kinksync-pages",
      matchOptions: { ignoreSearch: true },
      plugins: [
        new ExpirationPlugin({
          maxEntries: 128,
          maxAgeSeconds: THIRTY_DAYS,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
];

const dynamicShellFallbacks = [
  {
    url: PROFILE_SHELL_ROUTE,
    matcher({ request }: { request: Request }) {
      return (
        isDocumentRequest(request) &&
        /^\/profile\/[^/]+(?:\/questions)?$/.test(new URL(request.url).pathname)
      );
    },
  },
  {
    url: SCENE_DETAIL_SHELL_ROUTE,
    matcher({ request }: { request: Request }) {
      const pathname = new URL(request.url).pathname;
      return (
        isDocumentRequest(request) &&
        /^\/scenes\/[^/]+$/.test(pathname) &&
        pathname !== SCENE_DETAIL_SHELL_ROUTE
      );
    },
  },
];

const staticRouteFallbacks = STATIC_OFFLINE_ROUTES.map((url) => ({
  url,
  matcher({ request }: { request: Request }) {
    return isDocumentRequest(request) && new URL(request.url).pathname === url;
  },
}));

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...offlineRuntimeCaching, ...defaultCache],
  fallbacks: {
    entries: [
      ...dynamicShellFallbacks,
      ...staticRouteFallbacks,
      {
        url: "/offline",
        matcher({ request }) {
          return isDocumentRequest(request);
        },
      },
    ],
  },
});

serwist.addEventListeners();

// The first hotfix preview fabricated RSC cache entries without the exact
// router-state headers used by a real click. Remove that cache on activation so
// no browser or installed PWA can keep serving those poisoned payloads.
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.delete("kinksync-rsc"));
});

// Notify existing clients that a new version has installed.
self.addEventListener("install", (event) => {
  // Skip on the very first install — no existing clients to notify.
  if (!self.registration.active) return;

  event.waitUntil(
    self.registration.showNotification("KinkSync bijgewerkt", {
      body: "Een nieuwe versie is klaar. Herlaad de app om bij te werken.",
      icon: "/icon-192.png",
      tag: "sw-update",
    })
  );
});
