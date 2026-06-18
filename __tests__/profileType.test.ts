import { describe, it, expect } from "vitest";
import { getProfileType } from "@/lib/profileType";

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
