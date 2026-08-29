import { describe, expect, it } from "vitest";
import { KINKS } from "@/lib/kinks";
import { getQuestionnaireRuntime, questionnaireCoverage } from "@/lib/questionnaire";
import {
  QUESTIONNAIRE_FIRST_ROUND_ANCHOR_IDS,
  buildQuestionnaireFirstRoundPlan,
  getDynamicFirstRound,
} from "@/lib/questionnaireFirstRound";
import type { KinkEntry, Profile, ProfilePerspective } from "@/types";

function profile(
  perspective: ProfilePerspective = "dominant",
  entries: Record<string, KinkEntry> = {},
): Profile {
  return {
    id: `first-round-${perspective}`,
    name: "First Round",
    role: perspective === "dominant" ? "Dominant" : "Submissive",
    perspective,
    questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    experienceLevel: "gevorderd",
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries,
    origin: "own",
  };
}

function entry(status: NonNullable<KinkEntry["status"]>): KinkEntry {
  return { status, comment: "" };
}

describe("compact Dynamic first round", () => {
  it("pins eight unique real signal anchors", () => {
    expect(QUESTIONNAIRE_FIRST_ROUND_ANCHOR_IDS).toHaveLength(8);
    expect(new Set(QUESTIONNAIRE_FIRST_ROUND_ANCHOR_IDS).size).toBe(8);

    const catalogIds = new Set(KINKS.map((kink) => kink.id));
    expect(QUESTIONNAIRE_FIRST_ROUND_ANCHOR_IDS.filter((id) => !catalogIds.has(id))).toEqual([]);
    expect(buildQuestionnaireFirstRoundPlan([]).anchorIds).toHaveLength(8);
  });

  it("keeps the same breadth while mapping strong role-affinity questions", () => {
    const dominant = buildQuestionnaireFirstRoundPlan([], "dominant");
    const submissive = buildQuestionnaireFirstRoundPlan([], "submissive");

    expect(dominant.anchorIds).toHaveLength(8);
    expect(submissive.anchorIds).toHaveLength(8);
    expect(dominant.anchorIds).toContain("spanking_hand_give");
    expect(dominant.anchorIds).toContain("handcuffs_give");
    expect(submissive.anchorIds).toContain("spanking_hand_receive");
    expect(submissive.anchorIds).toContain("handcuffs_receive");
    expect(submissive.anchorIds).not.toContain("spanking_hand_give");
    expect(submissive.anchorIds).not.toContain("handcuffs_give");
  });

  it("counts explicit answers only and exposes the same coverage to profile UI", () => {
    const current = profile();
    const plan = buildQuestionnaireFirstRoundPlan([], "dominant");

    current.entries[plan.anchorIds[0]] = entry("maybe");
    current.entries[plan.anchorIds[1]] = { status: null, comment: "later" };

    const runtime = getQuestionnaireRuntime(current);
    const firstRound = getDynamicFirstRound(current, runtime);
    expect(firstRound.coverage.answered).toBe(1);
    expect(firstRound.coverage.total).toBe(8);
    expect(questionnaireCoverage(current)).toEqual(firstRound.coverage);
  });

  it("opens only the pinned local probe after an explicit positive anchor answer", () => {
    const current = profile("dominant", { handcuffs_give: entry("yes") });
    const firstRound = getDynamicFirstRound(current, getQuestionnaireRuntime(current));
    const probes = firstRound.queue.filter((item) => item.isProbe);

    expect(probes.map((item) => item.kink.id)).toEqual(["leather_cuffs_give"]);
    expect(probes[0].reasons).toEqual([
      {
        sourceKinkId: "handcuffs_give",
        targetKinkId: "leather_cuffs_give",
        relationType: "followUp",
        status: "yes",
      },
    ]);
  });

  it("does not turn maybe, no or hard-no into expansion", () => {
    for (const status of ["maybe", "no", "hard_no"] as const) {
      const current = profile("dominant", { handcuffs_give: entry(status) });
      const firstRound = getDynamicFirstRound(current, getQuestionnaireRuntime(current));
      expect(firstRound.queue.filter((item) => item.isProbe), status).toEqual([]);
    }
  });

  it("ignores historic positives outside the scan instead of ballooning a fresh first round", () => {
    const current = profile("dominant", { remote_toy: entry("yes") });
    const runtime = getQuestionnaireRuntime(current);
    expect(runtime.pendingProbes.map((probe) => probe.targetKinkId)).toContain("remote_toy_publiek");

    const firstRound = getDynamicFirstRound(current, runtime);
    expect(firstRound.queue.map((item) => item.kink.id)).not.toContain("remote_toy_publiek");
    expect(firstRound.visibleKinks.map((kink) => kink.id)).not.toContain("remote_toy_publiek");
  });

  it("keeps every queued card in the first-round visible set", () => {
    const current = profile("dominant", { handcuffs_give: entry("willing") });
    const firstRound = getDynamicFirstRound(current, getQuestionnaireRuntime(current));
    const visibleIds = new Set(firstRound.visibleKinks.map((kink) => kink.id));

    expect(firstRound.queue.filter((item) => !visibleIds.has(item.kink.id))).toEqual([]);
  });

  it("adds only explicitly selected interest anchors without creating answers", () => {
    const current = profile();
    current.questionnaireSetup = { mode: "dynamic", interests: ["power"], version: 2 };
    const before = structuredClone(current.entries);
    const plan = buildQuestionnaireFirstRoundPlan(["power"], "dominant");

    expect(plan.anchorIds).toContain("service");
    expect(plan.anchorIds).toContain("rules_protocols");
    expect(plan.anchorIds).toContain("orgasm_control");
    expect(plan.anchorIds.length).toBeGreaterThan(8);

    getDynamicFirstRound(current, getQuestionnaireRuntime(current));
    expect(current.entries).toEqual(before);
  });
});
