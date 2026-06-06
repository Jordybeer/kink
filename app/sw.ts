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
});

serwist.addEventListeners();

// Notify existing clients that a new version has installed.
// event.waitUntil keeps the SW alive until the notification promise settles.
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
