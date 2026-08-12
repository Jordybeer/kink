import { describe, it, expect } from "vitest";
import { getProfileType, splitProfilesByOwnership } from "@/lib/profileType";

const own = { id: "a", isImported: false as const, origin: "own" as const };

describe("getProfileType", () => {
  it("returns 'partner' for imported profile", () => {
    expect(getProfileType({ ...own, isImported: true }, null)).toBe("partner");
  });

  it("returns 'partner' for shared origin", () => {
    expect(getProfileType({ ...own, origin: "shared" }, null)).toBe("partner");
  });

  it("partner check takes precedence over pin", () => {
    expect(getProfileType({ ...own, isImported: true }, "a")).toBe("partner");
  });

  it("returns 'primair' for pinned own profile", () => {
    expect(getProfileType(own, "a")).toBe("primair");
  });

  it("returns 'alternatief' for unpinned own profile", () => {
    expect(getProfileType(own, "other")).toBe("alternatief");
    expect(getProfileType(own, null)).toBe("alternatief");
  });
});

describe("splitProfilesByOwnership", () => {
  it("uses only explicit ownership metadata and keeps order stable", () => {
    const profiles = [
      { ...own, id: "mine-dominant", role: "Dominant", name: "Zelf" },
      { ...own, id: "shared-dominant", isImported: true, role: "Dominant", name: "Ook dominant" },
      { ...own, id: "mine-submissive", role: "Submissive", name: "Zelf twee" },
      { ...own, id: "shared-origin", origin: "shared" as const, role: "Submissive", name: "Gedeeld" },
    ];

    const result = splitProfilesByOwnership(profiles, "mine-dominant");

    expect(result.mine.map((profile) => profile.id)).toEqual([
      "mine-dominant",
      "mine-submissive",
    ]);
    expect(result.shared.map((profile) => profile.id)).toEqual([
      "shared-dominant",
      "shared-origin",
    ]);
  });
});
