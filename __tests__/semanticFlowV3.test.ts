import { describe, expect, it } from "vitest";
import { KINKS } from "@/lib/kinks";
import {
  buildQuestionnaireCoveragePlan,
  getQuestionnaireRuntime,
  searchAllKinks,
} from "@/lib/questionnaire";
import {
  ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS,
  isQuestionnaireKinkEligibleForPerspective,
} from "@/lib/questionnaireEligibility";
import {
  complementaryCompareLabel,
  complementaryPartnerKinkId,
  complementarySiblingId,
} from "@/lib/participation";
import {
  isConversationContinuation,
  selectConversationQuestion,
  type QuestionnaireQueueItem,
} from "@/lib/questionnaireEngine";
import {
  QUESTIONNAIRE_CANONICAL_MAPPING_VERSION,
  QUESTIONNAIRE_CANONICAL_PROBE_TARGETS,
  questionnaireRelatedIds,
} from "@/lib/questionnaireMetadata";
import { directionalPairForKinkId } from "@/lib/directionality";
import { profileMatchScore } from "@/lib/matching";
import type { KinkEntry, Profile, ProfilePerspective } from "@/types";

function ownProfile(perspective: ProfilePerspective, mode: "dynamic" | "deepDive" = "dynamic"): Profile {
  return {
    id: "semantic-" + perspective + "-" + mode,
    name: "Semantic",
    role: perspective === "dominant" ? "Dominant" : "Submissive",
    perspective,
    questionnaireSetup: { mode, interests: [], version: 2 },
    experienceLevel: mode === "deepDive" ? "diepgaand" : "gevorderd",
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries: {},
    origin: "own",
  };
}

function queueItem(id: string, options: Partial<QuestionnaireQueueItem> = {}): QuestionnaireQueueItem {
  const kink = KINKS.find((candidate) => candidate.id === id);
  if (!kink) throw new Error("Kink ontbreekt: " + id);
  return {
    kink,
    lane: "coverage",
    isProbe: false,
    coversAnchor: false,
    reasons: [],
    ...options,
  };
}

function entry(status: NonNullable<KinkEntry["status"]>): KinkEntry {
  return { status, comment: "" };
}

describe("questionnaire semantic flow v3", () => {
  it("keeps hard role policy explicit and separate from broad directionality", () => {
    expect(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS).toHaveLength(31);
    expect(new Set(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS).size).toBe(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS.length);
    expect(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS).toContain("whipping");
    expect(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS).not.toContain("blindfold");
    expect(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS).not.toContain("hood");
    expect(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS).not.toContain("sound_deprivation");
    expect(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS).not.toContain("pegging");

    for (const conceptId of ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS) {
      const pair = KINKS
        .map((kink) => directionalPairForKinkId(kink.id))
        .find((candidate) => candidate?.conceptId === conceptId);
      expect(pair, conceptId).toBeDefined();
    }
  });

  it("admits only the aligned side of every role-bound pair outside Deep Dive", () => {
    for (const conceptId of ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS) {
      const pair = KINKS
        .map((kink) => directionalPairForKinkId(kink.id))
        .find((candidate) => candidate?.conceptId === conceptId)!;
      expect(isQuestionnaireKinkEligibleForPerspective(pair.giveId, "dominant"), conceptId).toBe(true);
      expect(isQuestionnaireKinkEligibleForPerspective(pair.receiveId, "dominant"), conceptId).toBe(false);
      expect(isQuestionnaireKinkEligibleForPerspective(pair.giveId, "submissive"), conceptId).toBe(false);
      expect(isQuestionnaireKinkEligibleForPerspective(pair.receiveId, "submissive"), conceptId).toBe(true);
      expect(isQuestionnaireKinkEligibleForPerspective(pair.giveId, "submissive", true), conceptId).toBe(true);
      expect(isQuestionnaireKinkEligibleForPerspective(pair.receiveId, "dominant", true), conceptId).toBe(true);
    }

    expect(isQuestionnaireKinkEligibleForPerspective("pegging_give", "submissive")).toBe(true);
    expect(isQuestionnaireKinkEligibleForPerspective("pegging_receive", "dominant")).toBe(true);
    expect(isQuestionnaireKinkEligibleForPerspective("blindfold_receive", "dominant")).toBe(true);
  });

  it("uses the same role gate in Discover and category while Deep Dive stays exhaustive", () => {
    const dominant = ownProfile("dominant");
    const discover = getQuestionnaireRuntime(dominant, { intent: { kind: "discover" } });
    const discoverIds = new Set(discover.queue.map((item) => item.kink.id));
    expect(discoverIds.has("whipping_give")).toBe(true);
    expect(discoverIds.has("whipping_receive")).toBe(false);
    expect(discoverIds.has("pegging_give")).toBe(true);
    expect(discoverIds.has("pegging_receive")).toBe(true);

    const impact = getQuestionnaireRuntime(dominant, { intent: { kind: "category", category: "impact" } });
    const impactIds = new Set(impact.queue.map((item) => item.kink.id));
    expect(impactIds.has("whipping_give")).toBe(true);
    expect(impactIds.has("whipping_receive")).toBe(false);

    const deep = getQuestionnaireRuntime(ownProfile("dominant", "deepDive"));
    const deepIds = new Set(deep.queue.map((item) => item.kink.id));
    expect(deepIds.has("whipping_give")).toBe(true);
    expect(deepIds.has("whipping_receive")).toBe(true);
    expect(deep.queue).toHaveLength(KINKS.length);
  });

  it("never hides an explicitly stored opposite-side answer", () => {
    const dominant = ownProfile("dominant");
    dominant.entries.whipping_receive = entry("yes");
    const discover = getQuestionnaireRuntime(dominant, { intent: { kind: "discover" } });
    expect(discover.queue.some((item) => item.kink.id === "whipping_receive")).toBe(false);
    expect(discover.visibleKinks.some((kink) => kink.id === "whipping_receive")).toBe(true);
    expect(dominant.entries.whipping_receive.status).toBe("yes");
  });

  it("keeps manual search explicit even when guided flow hides a role-opposite", () => {
    expect(searchAllKinks("Whipping").map((kink) => kink.id)).toContain("whipping_receive");
  });

  it("prefers a same-concept complement, then one canonical source probe, then a topic break", () => {
    const siblingQueue = [
      queueItem("pegging_receive"),
      queueItem("anal_sex_give", {
        lane: "expansion",
        isProbe: true,
        reasons: [{
          sourceKinkId: "pegging_give",
          targetKinkId: "anal_sex_give",
          relationType: "followUp",
          status: "yes",
        }],
      }),
    ];
    const sibling = selectConversationQuestion(siblingQueue, KINKS, {
      phase: "preferContinuation",
      lastKinkId: "pegging_give",
    });
    expect(sibling?.kink.id).toBe("pegging_receive");
    expect(isConversationContinuation(sibling, "pegging_give")).toBe(true);

    const probe = queueItem("leather_cuffs_give", {
      lane: "expansion",
      isProbe: true,
      reasons: [{
        sourceKinkId: "handcuffs_give",
        targetKinkId: "leather_cuffs_give",
        relationType: "followUp",
        status: "yes",
      }],
    });
    expect(selectConversationQuestion([queueItem("doctor_patient"), probe], KINKS, {
      phase: "preferContinuation",
      lastKinkId: "handcuffs_give",
    })?.kink.id).toBe("leather_cuffs_give");

    expect(selectConversationQuestion([probe, queueItem("doctor_patient")], KINKS, {
      phase: "topicBreakRequired",
      lastKinkId: "handcuffs_give",
    })?.kink.id).toBe("doctor_patient");

    // Een gewone related/topic-buur is géén continuation en mag het mentale
    // momentum niet kapen wanneer er geen sibling/canonical probe bestaat.
    expect(selectConversationQuestion([
      queueItem("spanking_implement_give"),
      queueItem("doctor_patient"),
    ], KINKS, {
      phase: "preferContinuation",
      lastKinkId: "spanking_hand_give",
    })?.kink.id).toBe("doctor_patient");
  });

  it("models diaper wearing as self/partner participation without calling it give/receive", () => {
    expect(complementarySiblingId("luiers_dragen")).toBe("diaper_partner_wearing");
    expect(complementarySiblingId("diaper_partner_wearing")).toBe("luiers_dragen");
    expect(complementaryPartnerKinkId("luiers_dragen")).toBe("diaper_partner_wearing");
    expect(complementaryCompareLabel("luiers_dragen", "Diaper wearing")).toContain("Zelf dragen");
    expect(complementaryCompareLabel("diaper_partner_wearing", "Partner wearing diapers")).toContain("Partner draagt");
    expect(KINKS.some((kink) => kink.id === "diaper_partner_wearing")).toBe(true);
    expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS.diaper_partner_wearing).toBeUndefined();

    const dominantCoverage = buildQuestionnaireCoveragePlan([], "dominant").anchorIds;
    const submissiveCoverage = buildQuestionnaireCoveragePlan([], "submissive").anchorIds;
    expect(dominantCoverage).toContain("diaper_partner_wearing");
    expect(dominantCoverage).not.toContain("luiers_dragen");
    expect(submissiveCoverage).toContain("luiers_dragen");
    expect(submissiveCoverage).not.toContain("diaper_partner_wearing");

    const dominantDiscover = getQuestionnaireRuntime(ownProfile("dominant"), {
      intent: { kind: "discover" },
    }).queue.map((item) => item.kink.id);
    expect(dominantDiscover).toContain("luiers_dragen");
    expect(dominantDiscover).toContain("diaper_partner_wearing");
  });

  it("matches diaper self-wearing only against a partner's explicit partner-facing preference", () => {
    const a = ownProfile("submissive");
    const b = ownProfile("dominant");
    a.entries.luiers_dragen = entry("yes");
    b.entries.diaper_partner_wearing = entry("yes");
    expect(profileMatchScore(a, b).counts.perfect).toBeGreaterThan(0);

    const wrongDirection = ownProfile("dominant");
    wrongDirection.entries.luiers_dragen = entry("yes");
    expect(profileMatchScore(a, wrongDirection).counts.perfect).toBe(0);
  });

  it("keeps private recording related but removes it as a canonical immediate publication step", () => {
    expect(QUESTIONNAIRE_CANONICAL_MAPPING_VERSION).toBe(6);
    expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS.recording).toBeUndefined();
    expect(questionnaireRelatedIds("recording")).toContain("adult_content_creation");
  });
});
