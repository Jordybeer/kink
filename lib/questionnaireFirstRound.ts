import { KINKS } from "@/lib/kinks";
import { rankQuestionnaireQueueItems, type QuestionnaireQueueItem } from "@/lib/questionnaireEngine";
import { QUESTIONNAIRE_CORE_ANCHOR_IDS, QUESTIONNAIRE_COVERAGE_ANCHOR_IDS } from "@/lib/questionnaireMetadata";
import type { Kink, Profile, ProfilePerspective, QuestionnaireInterest } from "@/types";
import {
  buildQuestionnaireCoveragePlan,
  type QuestionnaireCoverage,
  type QuestionnaireCoveragePlan,
  type QuestionnaireRuntime,
} from "@/lib/questionnaire";

/**
 * Dynamic's first round uses the maintained broad coverage contract. A response
 * never predicts or fills another kink; positive answers may only open the
 * existing explicit local follow-up registered by the questionnaire engine.
 */
export const QUESTIONNAIRE_FIRST_ROUND_ANCHOR_IDS = QUESTIONNAIRE_COVERAGE_ANCHOR_IDS;

export interface DynamicFirstRound {
  plan: QuestionnaireCoveragePlan;
  coverage: QuestionnaireCoverage;
  queue: QuestionnaireQueueItem[];
  visibleKinks: Kink[];
  complete: boolean;
}

function questionnairePerspective(profile: Profile): ProfilePerspective | undefined {
  if (profile.perspective) return profile.perspective;
  const role = profile.role.trim().toLowerCase();
  return role === "dominant" || role === "submissive" ? role : undefined;
}

export function buildQuestionnaireFirstRoundPlan(
  interests: readonly QuestionnaireInterest[],
  perspective?: ProfilePerspective,
): QuestionnaireCoveragePlan {
  return buildQuestionnaireCoveragePlan(interests, perspective);
}

export function getDynamicFirstRound(
  profile: Profile,
  runtime: QuestionnaireRuntime,
): DynamicFirstRound {
  const perspective = questionnairePerspective(profile);
  const interests = profile.questionnaireSetup?.interests ?? [];
  const plan = buildQuestionnaireFirstRoundPlan(interests, perspective);
  const anchorIds = new Set(plan.anchorIds);
  const interestIds = new Set(plan.interestAnchorIds);
  const coreIds = new Set<string>(QUESTIONNAIRE_CORE_ANCHOR_IDS);

  const answered = plan.anchorIds.filter((kinkId) => profile.entries[kinkId]?.status != null).length;
  const total = plan.anchorIds.length;
  const coverage: QuestionnaireCoverage = {
    answered,
    total,
    percent: total === 0 ? 100 : Math.round((answered / total) * 100),
    complete: answered === total,
  };

  // Historic positives elsewhere in a profile must not make a fresh first round
  // balloon. Only explicit answers in this round (or chosen-interest anchors) may
  // invite one of the engine's existing local follow-ups here.
  const pendingProbes = runtime.pendingProbes.filter((probe) =>
    probe.reasons.some((reason) => anchorIds.has(reason.sourceKinkId)),
  );
  const probeByTarget = new Map(pendingProbes.map((probe) => [probe.targetKinkId, probe]));
  const eligibleIds = new Set<string>();

  for (const kinkId of plan.anchorIds) {
    if (profile.entries[kinkId]?.status == null) eligibleIds.add(kinkId);
  }
  for (const probe of pendingProbes) eligibleIds.add(probe.targetKinkId);

  const items = KINKS
    .filter((kink) => eligibleIds.has(kink.id) && profile.entries[kink.id]?.status == null)
    .map((kink): QuestionnaireQueueItem => {
      const probe = probeByTarget.get(kink.id);
      return {
        kink,
        lane: coreIds.has(kink.id)
          ? "core"
          : interestIds.has(kink.id)
            ? "interest"
            : probe
              ? "expansion"
              : "coverage",
        isProbe: !!probe,
        coversAnchor: anchorIds.has(kink.id),
        reasons: probe?.reasons ?? [],
      };
    });

  const visibleIds = new Set([...plan.anchorIds, ...pendingProbes.map((probe) => probe.targetKinkId)]);
  const visibleKinks = KINKS.filter((kink) =>
    visibleIds.has(kink.id) || profile.entries[kink.id]?.status != null,
  );

  return {
    plan,
    coverage,
    queue: rankQuestionnaireQueueItems(items, KINKS, profile.entries),
    visibleKinks,
    complete: coverage.complete && pendingProbes.length === 0,
  };
}
