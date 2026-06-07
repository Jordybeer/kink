/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { url: string; revision: string | null })[];
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Notify existing clients that a new version has installed.
self.addEventListener("install", (event) => {
  // Skip on the very first install — no existing clients to notify.
  if (!self.registration.active) return;

  event.waitUntil(
    self.registration.showNotification("KinkSync bijgewerkt", {
      body: "Een nieuwe versie is klaar. Herlaad de app om bij te werken.",
      icon: "/icons/icon-192.png",
      tag: "sw-update",
    })
  );
});
