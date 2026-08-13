import { describe, expect, it } from "vitest";
import {
  cleanCompareParam,
  mergeCustomKinks,
  resolveCompareProfileIds,
} from "@/lib/compare";
import {
  buildCompareModel,
  classifyStatusPair,
  type VisibleCompareStatus,
} from "@/lib/compareV2";
import { DIRECTIONAL_KINK_PAIRS } from "@/lib/directionality";
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

  it("voegt gelijknamige eigen kinks hoofdletterongevoelig samen", () => {
    const own = profile("own", "Eigen profiel", {
      customKinks: [
        { id: "a-1", name: "Wax play" },
        { id: "a-2", name: "Rope" },
      ],
    });
    const partner = profile("partner", "Partner", {
      customKinks: [
        { id: "b-1", name: " wax PLAY " },
      ],
    });

    expect(mergeCustomKinks(own, partner)).toEqual([
      { name: "Wax play", aId: "a-1", bId: "b-1" },
      { name: "Rope", aId: "a-2" },
    ]);
  });
});

describe("compare v2 status contract", () => {
  const cases: Array<[VisibleCompareStatus, VisibleCompareStatus, string]> = [
    ["yes", "yes", "shared"],
    ["yes", "willing", "shared"],
    ["willing", "willing", "shared"],
    ["yes", "maybe", "discuss"],
    ["willing", "maybe", "discuss"],
    ["maybe", "maybe", "discuss"],
    ["yes", "no", "soft"],
    ["willing", "no", "soft"],
    ["maybe", "no", "soft"],
    ["no", "no", "discuss"],
    ["yes", "hard_no", "conflict"],
    ["willing", "hard_no", "conflict"],
    ["maybe", "hard_no", "limit"],
    ["no", "hard_no", "limit"],
    ["hard_no", "hard_no", "limit"],
  ];

  for (const [left, right, expected] of cases) {
    it(`${left} + ${right} => ${expected} in beide volgordes`, () => {
      expect(classifyStatusPair(left, right).kind).toBe(expected);
      expect(classifyStatusPair(right, left).kind).toBe(expected);
    });
  }

  it("maakt positieve antwoorden alleen complementair met expliciete directionality", () => {
    expect(classifyStatusPair("yes", "willing", "same").kind).toBe("shared");
    expect(classifyStatusPair("yes", "willing", "complementary").kind).toBe("complementary");
  });

  it("houdt directionele id, label en samenvatting stabiel bij A/B-wissel", () => {
    const pair = DIRECTIONAL_KINK_PAIRS[0];
    const left = profile("left", "Left", {
      entries: {
        [pair.giveId]: { status: "yes", comment: "" },
      },
    });
    const right = profile("right", "Right", {
      entries: {
        [pair.receiveId]: { status: "willing", comment: "" },
      },
    });

    const ab = buildCompareModel(left, right);
    const ba = buildCompareModel(right, left);

    expect(ab.summary).toEqual(ba.summary);
    expect(ab.facts.map(({ id, label, kind }) => ({ id, label, kind })))
      .toEqual(ba.facts.map(({ id, label, kind }) => ({ id, label, kind })));
  });
});
