import { describe, expect, it } from "vitest";
import {
  STATIC_OFFLINE_ROUTES,
  buildOfflineWarmupRoutes,
} from "@/lib/offlineRoutes";

describe("offline route warming", () => {
  it("includes every fixed room without requiring a prior visit", () => {
    expect(buildOfflineWarmupRoutes([], [])).toEqual(STATIC_OFFLINE_ROUTES);
  });

  it("adds every local profile and saved scene", () => {
    const routes = buildOfflineWarmupRoutes(
      ["profile-a", "profile b"],
      ["scene-a", "scene/b"],
    );

    expect(routes).toContain("/profile/profile-a");
    expect(routes).toContain("/profile/profile%20b");
    expect(routes).toContain("/scenes/scene-a");
    expect(routes).toContain("/scenes/scene%2Fb");
  });

  it("does not warm the same dynamic route twice", () => {
    const routes = buildOfflineWarmupRoutes(
      ["same", "same"],
      ["same", "same"],
    );

    expect(routes.filter((route) => route === "/profile/same")).toHaveLength(1);
    expect(routes.filter((route) => route === "/scenes/same")).toHaveLength(1);
  });
});
