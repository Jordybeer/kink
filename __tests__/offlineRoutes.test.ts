import { describe, expect, it } from "vitest";
import {
  RUNTIME_PAGE_CACHE,
  STATIC_OFFLINE_ROUTES,
  buildOfflineWarmupRoutes,
  runtimeCachesToPurge,
} from "@/lib/offlineRoutes";

describe("offline route warming", () => {
  it("includes every fixed room without requiring a prior visit", () => {
    expect(buildOfflineWarmupRoutes()).toEqual(STATIC_OFFLINE_ROUTES);
    expect(STATIC_OFFLINE_ROUTES).toContain("/contracts");
    expect(STATIC_OFFLINE_ROUTES).toContain("/intimacy");
    expect(STATIC_OFFLINE_ROUTES).toContain("/about");
    expect(STATIC_OFFLINE_ROUTES).toContain("/security");
    expect(STATIC_OFFLINE_ROUTES).not.toContain("/session");
  });

  it("never leaks local record identifiers into background warmup urls", () => {
    const routes = buildOfflineWarmupRoutes();

    expect(routes).toEqual(STATIC_OFFLINE_ROUTES);
    expect(routes.some((route) => /^\/profile\/[^/]+/.test(route))).toBe(false);
    expect(routes.some((route) => route.startsWith("/scenes/") && route !== "/scenes/view")).toBe(false);
    expect(routes.some((route) => /^\/contracts\/[^/]+/.test(route))).toBe(false);
  });
});

/**
 * "Alles wissen" beloofde alles en ruimde één bucket op. Serwist zet er via
 * defaultCache nog een stuk of vijftien naast, met /profile/<id> als sleutel.
 * Deze tests bewaken dat alleen de app zelf blijft staan.
 */
describe("runtimeCachesToPurge", () => {
  const SERWIST_DEFAULTS = [
    "apis", "cross-origin", "next-data", "next-image", "next-static-js-assets",
    "others", "static-audio-assets", "static-data-assets", "static-font-assets",
    "static-image-assets", "static-js-assets", "static-style-assets",
    "static-video-assets", "google-fonts-stylesheets", "google-fonts-webfonts",
  ];

  it("ruimt elke Serwist-runtimebucket op, niet alleen de eigen paginacache", () => {
    const purged = runtimeCachesToPurge([...SERWIST_DEFAULTS, RUNTIME_PAGE_CACHE]);
    for (const name of SERWIST_DEFAULTS) expect(purged).toContain(name);
    expect(purged).toContain(RUNTIME_PAGE_CACHE);
  });

  it("laat de precache staan zodat offline herladen geen wit scherm geeft", () => {
    const purged = runtimeCachesToPurge([
      "serwist-precache-v2-https://kinksync.be/",
      RUNTIME_PAGE_CACHE,
    ]);
    expect(purged).toEqual([RUNTIME_PAGE_CACHE]);
  });

  it("herkent een toekomstige bucket die niemand hier heeft opgeschreven", () => {
    expect(runtimeCachesToPurge(["serwist-brand-new-bucket"]))
      .toEqual(["serwist-brand-new-bucket"]);
  });
});
