import { describe, expect, it } from "vitest";
import {
  canonicalizeLocalUrl,
  findSingleAddedId,
  hasPersistedProfile,
  profileHref,
  profileIdFromLocation,
  sceneDetailHref,
  sceneIdFromLocation,
  waitForPersistedProfile,
} from "@/lib/localRoutes";

describe("local-first routes", () => {
  it("keeps profile and scene ids in one precacheable document route", () => {
    expect(profileHref("profile a/b")).toBe("/profile?id=profile%20a%2Fb");
    expect(sceneDetailHref("scene a/b")).toBe(
      "/scenes/view?id=scene%20a%2Fb",
    );
  });

  it("reads ids from both fixed query shells and legacy path doors", () => {
    expect(
      profileIdFromLocation(
        "/profile",
        new URLSearchParams("id=profile-query"),
      ),
    ).toBe("profile-query");
    expect(
      profileIdFromLocation(
        "/profile/profile%20legacy",
        new URLSearchParams(),
      ),
    ).toBe("profile legacy");
    expect(
      profileIdFromLocation(
        "/profile/profile%20questions/questions",
        new URLSearchParams(),
      ),
    ).toBe("profile questions");

    expect(
      sceneIdFromLocation(
        "/scenes/view",
        new URLSearchParams("id=scene-query"),
      ),
    ).toBe("scene-query");
    expect(
      sceneIdFromLocation(
        "/scenes/scene%20legacy",
        new URLSearchParams(),
      ),
    ).toBe("scene legacy");
  });

  it("collars legacy dynamic urls without dropping query or hash state", () => {
    const profile = canonicalizeLocalUrl(
      new URL("https://kinksync.test/profile/profile%20a?tab=edit#kink"),
    );
    const scene = canonicalizeLocalUrl(
      new URL("https://kinksync.test/scenes/scene%2Fb?from=timeline"),
    );

    expect(profile.pathname).toBe("/profile");
    expect(profile.searchParams.get("id")).toBe("profile a");
    expect(profile.searchParams.get("tab")).toBe("edit");
    expect(profile.hash).toBe("#kink");

    expect(scene.pathname).toBe("/scenes/view");
    expect(scene.searchParams.get("id")).toBe("scene/b");
    expect(scene.searchParams.get("from")).toBe("timeline");
  });

  it("leaves fixed rooms and unrelated urls untouched", () => {
    const fixed = new URL("https://kinksync.test/scenes/view?id=scene-a");
    const compare = new URL(
      "https://kinksync.test/compare?a=profile-a&b=profile-b",
    );

    expect(canonicalizeLocalUrl(fixed).href).toBe(fixed.href);
    expect(canonicalizeLocalUrl(compare).href).toBe(compare.href);
  });

  it("identifies only one newly created local record", () => {
    expect(findSingleAddedId(["a", "b"], ["a", "b", "c"])).toBe("c");
    expect(findSingleAddedId(["a"], ["a", "b", "c"])).toBeNull();
    expect(findSingleAddedId(["a"], ["a"])).toBeNull();
  });

  it("recognises only the exact profile id in the persisted store", () => {
    const storage = {
      getItem: () => JSON.stringify({
        state: { profiles: [{ id: "profile-a" }, { id: "profile-b" }] },
        version: 15,
      }),
    };

    expect(hasPersistedProfile(storage, "profile-b")).toBe(true);
    expect(hasPersistedProfile(storage, "profile-c")).toBe(false);
  });

  it("waits for a delayed Zustand persist write before allowing navigation", async () => {
    let raw = JSON.stringify({ state: { profiles: [] }, version: 15 });
    const storage = { getItem: () => raw };

    globalThis.setTimeout(() => {
      raw = JSON.stringify({
        state: { profiles: [{ id: "new-offline-profile" }] },
        version: 15,
      });
    }, 5);

    await expect(waitForPersistedProfile("new-offline-profile", {
      storage,
      timeoutMs: 100,
      pollIntervalMs: 1,
    })).resolves.toBe(true);
  });

  it("does not navigate when persistence never contains the newborn id", async () => {
    const storage = {
      getItem: () => JSON.stringify({ state: { profiles: [] }, version: 15 }),
    };

    await expect(waitForPersistedProfile("missing", {
      storage,
      timeoutMs: 5,
      pollIntervalMs: 1,
    })).resolves.toBe(false);
  });
});
