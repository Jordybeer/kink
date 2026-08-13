import { describe, expect, it } from "vitest";
import {
  cleanCompareParam,
  mergeCustomKinks,
  resolveCompareProfileIds,
} from "@/lib/compare";
import type { Profile } from "@/types";

function profile(id: string, name: string, overrides: Partial<Profile> = {}): Profile {
  return {
    id,
    name,
    role: "Dominant",
    experienceLevel: "beginner",
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries: {},
    ...overrides,
  };
}

describe("compare helpers", () => {
  it("normaliseert lege en beschadigde URL-profielparameters", () => {
    expect(cleanCompareParam(null)).toBe("");
    expect(cleanCompareParam("undefined")).toBe("");
    expect(cleanCompareParam("null")).toBe("");
    expect(cleanCompareParam("profile-a")).toBe("profile-a");
  });

  it("vult een ontbrekend profiel aan zonder een self-pair te maken", () => {
    const own = profile("own", "Eigen profiel", { origin: "own" });
    const partner = profile("partner", "Partner", { isImported: true, origin: "shared" });
    const profiles = [own, partner];

    expect(resolveCompareProfileIds({
      profiles,
      aId: "",
      bId: partner.id,
      pinnedProfileId: own.id,
    })).toEqual({ aId: own.id, bId: partner.id });

    expect(resolveCompareProfileIds({
      profiles,
      aId: partner.id,
      bId: "",
      pinnedProfileId: own.id,
    })).toEqual({ aId: partner.id, bId: own.id });
  });

  it("paart custom entries alleen op dezelfde stabiele ID en naam", () => {
    const own = profile("own", "Eigen profiel", {
      customKinks: [
        { id: "shared-id", name: "Shared item" },
        { id: "a-only", name: "Same label" },
      ],
    });
    const partner = profile("partner", "Partner", {
      customKinks: [
        { id: "shared-id", name: "Shared item" },
        { id: "b-only", name: "Same label" },
      ],
    });

    expect(mergeCustomKinks(own, partner)).toEqual([
      { name: "Shared item", aId: "shared-id", bId: "shared-id" },
      { name: "Same label", aId: "a-only" },
      { name: "Same label", bId: "b-only" },
    ]);
  });
});
