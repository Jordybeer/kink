import { KINKS } from "@/lib/kinks";
import { questionnaireParticipationKinkIdForPerspective } from "@/lib/participation";
import { rankQuestionnaireQueueItems, type QuestionnaireQueueItem } from "@/lib/questionnaireEngine";
import { QUESTIONNAIRE_CORE_ANCHOR_IDS, QUESTIONNAIRE_INTEREST_ANCHOR_IDS } from "@/lib/questionnaireMetadata";
import type { Profile, ProfilePerspective, QuestionnaireInterest } from "@/types";
import type { QuestionnaireCoverage, QuestionnaireCoveragePlan, QuestionnaireRuntime } from "@/lib/questionnaire";

/**
 * Dynamic starts with a compact signal scan instead of replaying the catalog in
 * miniature. These anchors deliberately sample different broad play rooms. A
 * response never predicts or fills another kink; positive answers may only open
 * the existing explicit local follow-up registered by the questionnaire engine.
 */
export const QUESTIONNAIRE_FIRST_ROUND_ANCHOR_IDS = [
  "dominance_submission",
  "spanking_hand_give",
  "handcuffs_give",
  "ice_play",
  "masseur_client",
  "erotic_teasing",
  "oral_sex_give",
  "aftercare_physical",
] as const;

export interface DynamicFirstRound {
  plan: QuestionnaireCoveragePlan;
  coverage: QuestionnaireCoverage;
  queue: QuestionnaireQueueItem[];
  complete: boolean;
}

function questionnairePerspective(profile: Profile): ProfilePerspective | undefined {
  if (profile.perspective) return profile.perspective;
  const role = profile.role.trim().toLowerCase();
  return role === "dominant" || role === "submissive" ? role : undefined;
}

function addMappedAnchor(
  sourceId: string,
  perspective: ProfilePerspective | undefined,
  catalogIds: ReadonlySet<string>,
  seen: Set<string>,
  target: string[],
): string | null {
  const kinkId = questionnaireParticipationKinkIdForPerspective(sourceId, perspective);
  if (!catalogIds.has(kinkId)) return null;
  if (!seen.has(kinkId)) {
    seen.add(kinkId);
    target.push(kinkId);
  }
  return kinkId;
}

export function buildQuestionnaireFirstRoundPlan(
  interests: readonly QuestionnaireInterest[],
  perspective?: ProfilePerspective,
): QuestionnaireCoveragePlan {
  const catalogIds = new Set(KINKS.map((kink) => kink.id));
  const anchorIds: string[] = [];
  const interestAnchorIds: string[] = [];
  const seen = new Set<string>();

  for (const sourceId of QUESTIONNAIRE_FIRST_ROUND_ANCHOR_IDS) {
    addMappedAnchor(sourceId, perspective, catalogIds, seen, anchorIds);
  }

  for (const interest of interests) {
    for (const sourceId of QUESTIONNAIRE_INTEREST_ANCHOR_IDS[interest]) {
      const kinkId = questionnaireParticipationKinkIdForPerspective(sourceId, perspective);
      if (!catalogIds.has(kinkId)) continue;
      if (!interestAnchorIds.includes(kinkId)) interestAnchorIds.push(kinkId);
      if (seen.has(kinkId)) continue;
      seen.add(kinkId);
      anchorIds.push(kinkId);
    }
  }

  return { anchorIds, interestAnchorIds };
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
  // balloon. Only explicit answers to this scan (or chosen-interest anchors) may
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

  return {
    plan,
    coverage,
    queue: rankQuestionnaireQueueItems(items, KINKS, profile.entries),
    complete: coverage.complete && pendingProbes.length === 0,
  };
}
