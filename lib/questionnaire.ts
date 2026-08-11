import { KINKS } from "@/lib/kinks";
import { kinkCategorySearchTerms } from "@/lib/kinkCategories";
import { questionnaireDirectionalKinkIdForPerspective } from "@/lib/directionality";
import { isQuestionnaireKinkEligibleForPerspective } from "@/lib/questionnaireEligibility";
import {
  derivePendingExpansionProbes,
  rankQuestionnaireQueueItems,
  type PendingExpansionProbe,
  type QuestionnaireQueueItem,
} from "@/lib/questionnaireEngine";
import {
  QUESTIONNAIRE_COVERAGE_ANCHOR_IDS,
  QUESTIONNAIRE_CORE_ANCHOR_IDS,
  QUESTIONNAIRE_INTEREST_ANCHOR_IDS,
} from "@/lib/questionnaireMetadata";
import { defaultQuestionnaireSetup } from "@/lib/questionnaireSetup";
import type {
  Kink,
  KinkCategory,
  KinkCategoryId,
  Profile,
  ProfilePerspective,
  QuestionnaireInterest,
  QuestionnaireMode,
  QuestionnaireSetup,
} from "@/types";

export type QuestionnaireIntent =
  | { kind: "dynamic" }
  | { kind: "discover" }
  | { kind: "category"; category: KinkCategoryId }
  | { kind: "deepDive" };

export interface QuestionnaireCoverage {
  answered: number;
  total: number;
  percent: number;
  complete: boolean;
}

export interface QuestionnaireCoveragePlan {
  anchorIds: string[];
  interestAnchorIds: string[];
}

export interface QuestionnaireScopeProgress {
  answered: number;
  total: number;
}

export interface QuestionnaireRuntime {
  intent: QuestionnaireIntent;
  queue: QuestionnaireQueueItem[];
  visibleKinks: Kink[];
  pendingProbes: PendingExpansionProbe[];
  coverage: QuestionnaireCoverage;
  scope: QuestionnaireScopeProgress;
  complete: boolean;
}

interface RuntimeOptions {
  intent?: QuestionnaireIntent;
}

export const QUESTIONNAIRE_INTERESTS: Array<{
  value: QuestionnaireInterest;
  label: string;
  description: string;
}> = [
  {
    value: "power",
    label: "Macht & overgave",
    description: "Dominantie, service, regels, rituelen en controle.",
  },
  {
    value: "impact",
    label: "Impact & pijn",
    description: "Spanking, impact, pijnspel en intensere sensaties.",
  },
  {
    value: "bondage",
    label: "Bondage & beperking",
    description: "Touw, cuffs, immobilisatie en bewegingsbeperking.",
  },
  {
    value: "sensation",
    label: "Sensatie & lichaam",
    description: "Temperatuur, aanraking, zintuigen en lichamelijke prikkels.",
  },
  {
    value: "humiliation",
    label: "Vernedering & service",
    description: "Service, aanbidding, objectificatie en consensuele vernedering.",
  },
  {
    value: "sexual_social",
    label: "Seksueel & sociaal",
    description: "Seksuele handelingen, rollenspel, publiek spel en meerdere personen.",
  },
];

export const QUESTIONNAIRE_MODES: Array<{
  value: QuestionnaireMode;
  label: string;
  description: string;
}> = [
  {
    value: "dynamic",
    label: "Dynamic",
    description: "Brede dekking, met lokale vervolgvragen die alleen uit jouw expliciete antwoorden ontstaan.",
  },
  {
    value: "deepDive",
    label: "Deep Dive",
    description: "Werk uiteindelijk de volledige catalogus af; de volgorde blijft rustig en gevarieerd.",
  },
];

function searchable(kink: Kink): string {
  return [
    kink.name,
    ...(kink.aliases ?? []),
    ...kinkCategorySearchTerms(kink.category),
    kink.description ?? "",
    kink.safetyNote ?? "",
  ].join(" ").toLowerCase();
}

function explicitlyAnswered(profile: Profile, kinkId: string): boolean {
  return profile.entries[kinkId]?.status != null;
}

export function buildQuestionnaireCoveragePlan(
  interests: readonly QuestionnaireInterest[],
  perspective?: ProfilePerspective,
): QuestionnaireCoveragePlan {
  const catalogIds = new Set(KINKS.map((kink) => kink.id));
  const anchorIds: string[] = [];
  const interestAnchorIds: string[] = [];
  const seen = new Set<string>();

  for (const sourceId of QUESTIONNAIRE_COVERAGE_ANCHOR_IDS) {
    const kinkId = questionnaireDirectionalKinkIdForPerspective(sourceId, perspective);
    if (!catalogIds.has(kinkId) || seen.has(kinkId)) continue;
    seen.add(kinkId);
    anchorIds.push(kinkId);
  }
  for (const interest of interests) {
    for (const sourceId of QUESTIONNAIRE_INTEREST_ANCHOR_IDS[interest]) {
      const kinkId = questionnaireDirectionalKinkIdForPerspective(sourceId, perspective);
      if (!catalogIds.has(kinkId)) continue;
      if (!interestAnchorIds.includes(kinkId)) interestAnchorIds.push(kinkId);
      if (seen.has(kinkId)) continue;
      seen.add(kinkId);
      anchorIds.push(kinkId);
    }
  }

  return { anchorIds, interestAnchorIds };
}

function questionnairePerspective(profile: Profile): ProfilePerspective | undefined {
  if (profile.perspective) return profile.perspective;
  const role = profile.role.trim().toLowerCase();
  return role === "dominant" || role === "submissive" ? role : undefined;
}

export function questionnaireCoverage(
  profile: Profile,
  plan: QuestionnaireCoveragePlan = buildQuestionnaireCoveragePlan(
    profile.questionnaireSetup?.interests ?? [],
    questionnairePerspective(profile),
  ),
): QuestionnaireCoverage {
  const answered = plan.anchorIds.filter((kinkId) => explicitlyAnswered(profile, kinkId)).length;
  const total = plan.anchorIds.length;
  return {
    answered,
    total,
    percent: total === 0 ? 100 : Math.round((answered / total) * 100),
    complete: answered === total,
  };
}

function runtimeVisibleKinks(profile: Profile, eligibleIds: ReadonlySet<string>): Kink[] {
  return KINKS.filter((kink) => eligibleIds.has(kink.id) || explicitlyAnswered(profile, kink.id));
}

export function getQuestionnaireRuntime(
  profile: Profile,
  options: RuntimeOptions = {},
): QuestionnaireRuntime {
  const setup = profile.questionnaireSetup ?? defaultQuestionnaireSetup();

  const requestedIntent = options.intent ?? { kind: "dynamic" };
  const intent: QuestionnaireIntent = requestedIntent.kind === "category"
    ? requestedIntent
    : setup.mode === "deepDive"
      ? { kind: "deepDive" }
      : requestedIntent;
  const perspective = questionnairePerspective(profile);
  const exhaustive = intent.kind === "deepDive";
  const isGuidedEligible = (kinkId: string) =>
    isQuestionnaireKinkEligibleForPerspective(kinkId, perspective, exhaustive);

  const coveragePlan = buildQuestionnaireCoveragePlan(setup.interests, perspective);
  const coverage = questionnaireCoverage(profile, coveragePlan);
  const coverageIds = new Set(coveragePlan.anchorIds);
  const coreIds = new Set<string>(QUESTIONNAIRE_CORE_ANCHOR_IDS);
  const interestIds = new Set(coveragePlan.interestAnchorIds);

  const pendingProbes = derivePendingExpansionProbes(KINKS, profile.entries)
    .filter((probe) => isGuidedEligible(probe.targetKinkId));
  const probeByTarget = new Map(pendingProbes.map((probe) => [probe.targetKinkId, probe]));

  const scopeIds = intent.kind === "deepDive"
    ? KINKS.map((kink) => kink.id)
    : intent.kind === "discover"
      ? KINKS.filter((kink) => isGuidedEligible(kink.id)).map((kink) => kink.id)
      : intent.kind === "category"
        ? KINKS
            .filter((kink) => kink.category === intent.category && isGuidedEligible(kink.id))
            .map((kink) => kink.id)
        : coveragePlan.anchorIds;
  const scopeAnswered = scopeIds.filter((kinkId) => explicitlyAnswered(profile, kinkId)).length;
  const scope: QuestionnaireScopeProgress = {
    answered: intent.kind === "dynamic" ? coverage.answered : scopeAnswered,
    total: intent.kind === "dynamic" ? coverage.total : scopeIds.length,
  };

  const eligibleIds = new Set<string>();
  if (intent.kind === "deepDive" || intent.kind === "discover" || intent.kind === "category") {
    for (const kinkId of scopeIds) {
      if (!explicitlyAnswered(profile, kinkId)) eligibleIds.add(kinkId);
    }
  } else {
    for (const kinkId of coveragePlan.anchorIds) {
      if (!explicitlyAnswered(profile, kinkId)) eligibleIds.add(kinkId);
    }
    for (const probe of pendingProbes) eligibleIds.add(probe.targetKinkId);
  }

  const items = KINKS
    .filter((kink) => eligibleIds.has(kink.id) && !explicitlyAnswered(profile, kink.id))
    .map((kink): QuestionnaireQueueItem => {
      const probe = probeByTarget.get(kink.id);
      const lane = coreIds.has(kink.id)
        ? "core"
        : interestIds.has(kink.id)
          ? "interest"
          : probe
            ? "expansion"
            : intent.kind === "discover"
              ? "discovery"
              : intent.kind === "category"
                ? "category"
                : coverageIds.has(kink.id)
                  ? "coverage"
                  : "deepDive";
      return {
        kink,
        lane,
        isProbe: !!probe,
        coversAnchor: coverageIds.has(kink.id),
        reasons: probe?.reasons ?? [],
      };
    });
  const queue = rankQuestionnaireQueueItems(items, KINKS, profile.entries);
  const complete = intent.kind === "deepDive" || intent.kind === "discover" || intent.kind === "category"
    ? scope.answered === scope.total
    : coverage.complete && pendingProbes.length === 0;

  const visibleScopeIds = new Set(scopeIds);
  return {
    intent,
    queue,
    visibleKinks: intent.kind === "deepDive"
      ? [...KINKS]
      : intent.kind === "dynamic"
        ? runtimeVisibleKinks(profile, eligibleIds)
        : runtimeVisibleKinks(profile, visibleScopeIds),
    pendingProbes,
    coverage,
    scope,
    complete,
  };
}

/** Dynamic returns its factual working set; Deep Dive returns the catalog. */
export function getQuestionnaireKinks(profile: Profile): Kink[] {
  return getQuestionnaireRuntime(profile).visibleKinks;
}

export function getAdaptiveQuestionQueue(profile: Profile): Kink[] {
  return getQuestionnaireRuntime(profile).queue.map((item) => item.kink);
}

export function getQuestionnaireKinksByCategory(profile: Profile, category: KinkCategory): Kink[] {
  return getQuestionnaireKinks(profile).filter((kink) => kink.category === category);
}

/** Search deliberately ignores questionnaire mode so the full catalog stays reachable. */
export function searchAllKinks(query: string): Kink[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return KINKS.filter((kink) => searchable(kink).includes(normalized));
}

export function questionnaireCount(
  setup: QuestionnaireSetup,
  interests: QuestionnaireInterest[] = setup.interests,
): number {
  return setup.mode === "deepDive"
    ? KINKS.length
    : buildQuestionnaireCoveragePlan(interests).anchorIds.length;
}
