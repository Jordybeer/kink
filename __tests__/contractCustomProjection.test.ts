import { describe, expect, it } from "vitest";
import { projectCustomContractEvidence } from "@/lib/contractCustomProjection";
import { contractSourceKey } from "@/lib/contractSources";
import type { KinkStatus, Profile } from "@/types";

function profile(id: string, topic: string, status: KinkStatus, name = "Topic", privateResponse = false): Profile {
  return { id, name: id, role: "Switch", experienceLevel: "beginner", createdAt: 1, updatedAt: 1,
    customKinks: [{ id: topic, name }], entries: { [topic]: { status, comment: "never export", privateResponse } } };
}

describe("public custom contract evidence", () => {
  it("keeps independently named topics separate with different source keys", () => {
    const a = profile("a", "one", "yes"), b = profile("b", "two", "willing");
    const result = projectCustomContractEvidence(a, b);
    expect(result.shared).toEqual([]);
    expect(result.discuss).toEqual([
      { name: "Topic", statusA: "yes", statusB: null, sourceKind: "custom", sourceAId: "one" },
      { name: "Topic", statusA: null, statusB: "willing", sourceKind: "custom", sourceBId: "two" },
    ]);
    expect(new Set(result.discuss.map(row => contractSourceKey(row, a.id, b.id))).size).toBe(2);
  });
  const statuses = ["yes", "willing", "maybe", "no", "hard_no"] as const;
  const buckets = [
    ["shared", "shared", "discuss", "softLimits", "hardLimitDetails"],
    ["shared", "shared", "discuss", "softLimits", "hardLimitDetails"],
    ["discuss", "discuss", "discuss", "softLimits", "hardLimitDetails"],
    ["softLimits", "softLimits", "softLimits", "discuss", "hardLimitDetails"],
    ["hardLimitDetails", "hardLimitDetails", "hardLimitDetails", "hardLimitDetails", "hardLimitDetails"],
  ] as const;
  statuses.forEach((left, i) => statuses.forEach((right, j) => {
    it(`classifies proven shared identity ${left}/${right}`, () => {
      const result = projectCustomContractEvidence(profile("a", "same", left), profile("b", "same", right));
      expect(result[buckets[i][j]]).toHaveLength(1);
      expect(result[buckets[i][j]][0]).toMatchObject({statusA: left, statusB: right, sourceAId: "same", sourceBId: "same"});
      if (left === "hard_no" || right === "hard_no") expect(result.hardLimits[0].who).toBe(left === right ? "beiden" : left === "hard_no" ? "a" : "b");
    });
  }));
  it("retains a one-sided hard limit without inferring the hidden counterpart", () => {
    const a = profile("a", "same", "hard_no"), b = profile("b", "same", "yes", "Topic", true);
    const result = projectCustomContractEvidence(a, b);
    expect(result.hardLimits).toEqual([{ name: "Topic", who: "a", sourceKind: "custom", sourceAId: "same" }]);
    expect(result.hardLimitDetails[0]).toEqual({ name: "Topic", statusA: "hard_no", statusB: null, sourceKind: "custom", sourceAId: "same" });
    expect(result).toEqual(projectCustomContractEvidence(a, {...b, entries: {}, customKinks: []}));
  });
  it("omits all private and unanswered topics and never mutates profiles", () => {
    const a = profile("a", "one", "hard_no", "secret", true), b = profile("b", "two", null);
    const before = JSON.stringify([a,b]);
    expect(projectCustomContractEvidence(a,b)).toEqual({shared: [], softLimits: [], discuss: [], hardLimits: [], hardLimitDetails: []});
    expect(JSON.stringify([a,b])).toBe(before);
  });
  it("keeps same IDs with different names separate", () => {
    expect(projectCustomContractEvidence(profile("a", "same", "yes", "One"), profile("b", "same", "yes", "Two")).discuss).toHaveLength(2);
  });
  it("preserves source identity on rename and reversal without crossing owners", () => {
    const a = profile("a", "one", "yes"), b = profile("b", "two", "hard_no");
    const first = projectCustomContractEvidence(a,b);
    const swapped = projectCustomContractEvidence(b,a);
    expect(contractSourceKey(first.discuss[0],a.id,b.id)).toBe(contractSourceKey(swapped.discuss[0],b.id,a.id));
    expect(swapped.discuss[0]).toMatchObject({statusA:null,statusB:"yes",sourceBId:"one"});
    const renamed = projectCustomContractEvidence({...a,customKinks:[{id:"one",name:"Renamed"}]},b);
    expect(contractSourceKey(renamed.discuss[0],a.id,b.id)).toBe(contractSourceKey(first.discuss[0],a.id,b.id));
  });
  it("does not project a self-pair or catalogue topics", () => {
    const a = profile("a", "one", "yes");
    expect(projectCustomContractEvidence(a,a).discuss).toEqual([]);
    const b = {...profile("b", "two", null), entries: {bondage:{status:"yes" as const,comment:""}}};
    expect(projectCustomContractEvidence({...a, customKinks:[],entries:b.entries},b).shared).toEqual([]);
  });
});
