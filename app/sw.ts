import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: typeof globalThis & {
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

// Show a notification when a new SW version installs (existing clients will see UpdateBanner).
// event.waitUntil is required — without it the SW can be killed before showNotification resolves.
self.addEventListener("install", (event) => {
  // Only notify if this isn't the very first install (i.e. an update).
  if ((self as typeof globalThis & { registration: ServiceWorkerRegistration }).registration.active) {
    (event as ExtendableEvent).waitUntil(
      (self as typeof globalThis & { registration: ServiceWorkerRegistration }).registration.showNotification(
        "KinkSync bijgewerkt",
        {
          body: "Een nieuwe versie is klaar. Herlaad de app om bij te werken.",
          icon: "/icons/icon-192.png",
          tag: "sw-update",
        }
      )
    );
  }
});
