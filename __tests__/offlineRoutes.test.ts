import { describe, expect, it } from "vitest";
import {
  STATIC_OFFLINE_ROUTES,
  buildOfflineWarmupRoutes,
} from "@/lib/offlineRoutes";

describe("offline route warming", () => {
  it("includes every fixed room without requiring a prior visit", () => {
    expect(buildOfflineWarmupRoutes()).toEqual(STATIC_OFFLINE_ROUTES);
    expect(STATIC_OFFLINE_ROUTES).toContain("/contracts");
    expect(STATIC_OFFLINE_ROUTES).toContain("/about");
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
