import { describe, expect, it } from "vitest";
import {
  buildCompareModel,
  classifyStatusPair,
  type VisibleCompareStatus,
} from "@/lib/compare";
import type { KinkEntry, Profile } from "@/types";

function entry(status: KinkEntry["status"], extra: Partial<KinkEntry> = {}): KinkEntry {
  return { status, comment: "", ...extra };
}

function profile(
  id: string,
  entries: Record<string, KinkEntry>,
  extra: Partial<Profile> = {},
): Profile {
  return {
    id,
    name: id,
    role: "Dominant",
    experienceLevel: "beginner",
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries,
    ...extra,
  };
}

const CASES: Array<[
  VisibleCompareStatus,
  VisibleCompareStatus,
  ReturnType<typeof classifyStatusPair>["kind"],
]> = [
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

describe("Compare v2 status contract", () => {
  for (const [left, right, expected] of CASES) {
    it(`${left} + ${right} => ${expected}`, () => {
      expect(classifyStatusPair(left, right).kind).toBe(expected);
      expect(classifyStatusPair(right, left).kind).toBe(expected);
    });
  }

  it("uses complementary only for an explicit complementary relation", () => {
    expect(classifyStatusPair("yes", "willing", "same").kind).toBe("shared");
    expect(classifyStatusPair("yes", "willing", "complementary").kind).toBe("complementary");
  });
});

describe("Compare v2 pair resolution", () => {
  it("does not turn a one-sided answer into pair evidence", () => {
    const a = profile("a", { praise_kink: entry("yes") });
    const b = profile("b", {});
    const result = buildCompareModel(a, b);

    expect(result.facts).toHaveLength(0);
    expect(result.summary.jointlyAssessed).toBe(0);
    expect(result.unpaired.some((item) => item.kinkAId === "praise_kink")).toBe(true);
  });

  it("does not turn a one-sided hard boundary into a conflict", () => {
    const a = profile("a", { praise_kink: entry("hard_no") });
    const b = profile("b", {});
    const result = buildCompareModel(a, b);

    expect(result.facts).toHaveLength(0);
    expect(result.summary.conflict).toBe(0);
    expect(result.summary.limit).toBe(0);
  });

  it("distinguishes a hard conflict from a visible hard boundary", () => {
    const a = profile("a", {
      praise_kink: entry("yes"),
      collar_leash: entry("maybe"),
    });
    const b = profile("b", {
      praise_kink: entry("hard_no"),
      collar_leash: entry("hard_no"),
    });
    const result = buildCompareModel(a, b);

    expect(result.summary.conflict).toBe(1);
    expect(result.summary.limit).toBe(1);
  });

  it("recognizes an explicit directional pair as complementary", () => {
    const a = profile("a", { spanking_hand_give: entry("yes") });
    const b = profile("b", { spanking_hand_receive: entry("willing") });
    const result = buildCompareModel(a, b);

    expect(result.summary.complementary).toBe(1);
    expect(result.facts[0]?.relation).toBe("complementary");
  });

  it("does not infer complementarity for equal directions", () => {
    const a = profile("a", { spanking_hand_give: entry("yes") });
    const b = profile("b", { spanking_hand_give: entry("yes") });
    const result = buildCompareModel(a, b);

    expect(result.summary.complementary).toBe(0);
    expect(result.summary.shared).toBe(0);
    expect(result.summary.jointlyAssessed).toBe(0);
  });

  it("private input cannot change visible facts, evidence, or reasons", () => {
    const a = profile("a", { praise_kink: entry("yes") });
    const missing = profile("b", {});
    const concealed = profile("b", {
      praise_kink: entry("hard_no", { privateResponse: true }),
    });

    expect(buildCompareModel(a, concealed)).toEqual(buildCompareModel(a, missing));
  });

  it("keeps the semantic result symmetric when profiles are reversed", () => {
    const a = profile("a", {
      praise_kink: entry("yes"),
      collar_leash: entry("no"),
      spanking_hand_give: entry("willing"),
    });
    const b = profile("b", {
      praise_kink: entry("willing"),
      collar_leash: entry("yes"),
      spanking_hand_receive: entry("yes"),
    });
    const ab = buildCompareModel(a, b);
    const ba = buildCompareModel(b, a);

    expect(ab.summary.shared).toBe(ba.summary.shared);
    expect(ab.summary.complementary).toBe(ba.summary.complementary);
    expect(ab.summary.soft).toBe(ba.summary.soft);
    expect(ab.summary.discuss).toBe(ba.summary.discuss);
    expect(ab.summary.conflict).toBe(ba.summary.conflict);
    expect(ab.summary.limit).toBe(ba.summary.limit);
    expect(ab.summary.jointlyAssessed).toBe(ba.summary.jointlyAssessed);
    expect(ab.facts.map((fact) => fact.id).sort()).toEqual(ba.facts.map((fact) => fact.id).sort());
  });

  it("every reason points to visible facts that actually exist", () => {
    const a = profile("a", {
      praise_kink: entry("yes"),
      collar_leash: entry("no"),
    });
    const b = profile("b", {
      praise_kink: entry("yes"),
      collar_leash: entry("yes"),
    });
    const result = buildCompareModel(a, b);
    const ids = new Set(result.facts.map((fact) => fact.id));

    for (const reason of result.summary.reasons) {
      expect(reason.factIds.length).toBeGreaterThan(0);
      expect(reason.factIds.every((id) => ids.has(id))).toBe(true);
    }
  });

  it("does not use external score metadata as comparison evidence", () => {
    const a = profile("a", {}, { bdsmtestScores: [{ role: "Dominant", pct: 100 }] });
    const b = profile("b", {}, { bdsmtestScores: [{ role: "Submissive", pct: 100 }] });

    expect(buildCompareModel(a, b).summary.jointlyAssessed).toBe(0);
  });
});

describe("Compare v2 custom identity", () => {
  it("does not pair equal labels with different identifiers", () => {
    const a = profile("a", { custom_a: entry("yes") }, {
      customKinks: [{ id: "custom_a", name: "Custom item" }],
    });
    const b = profile("b", { custom_b: entry("yes") }, {
      customKinks: [{ id: "custom_b", name: "Custom item" }],
    });

    expect(buildCompareModel(a, b).facts.filter((fact) => fact.custom)).toHaveLength(0);
  });

  it("pairs an exact shared custom identity", () => {
    const a = profile("a", { custom_shared: entry("yes") }, {
      customKinks: [{ id: "custom_shared", name: "Custom item" }],
    });
    const b = profile("b", { custom_shared: entry("willing") }, {
      customKinks: [{ id: "custom_shared", name: "Custom item" }],
    });

    const customFacts = buildCompareModel(a, b).facts.filter((fact) => fact.custom);
    expect(customFacts).toHaveLength(1);
    expect(customFacts[0]?.kind).toBe("shared");
  });
});
