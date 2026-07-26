import { describe, expect, it } from "vitest";
import {
  canonicalizeLocalUrl,
  findSingleAddedId,
  profileHref,
  sceneDetailHref,
} from "@/lib/localRoutes";

describe("local-first routes", () => {
  it("keeps profile and scene ids in one precacheable document route", () => {
    expect(profileHref("profile a/b")).toBe("/profile?id=profile%20a%2Fb");
    expect(sceneDetailHref("scene a/b")).toBe(
      "/scenes/view?id=scene%20a%2Fb",
    );
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
});
