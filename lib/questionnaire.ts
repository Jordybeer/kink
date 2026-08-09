import { KINKS, LEVEL_MAX } from "@/lib/kinks";
import {
  derivePendingExpansionProbes,
  rankQuestionnaireCandidates,
  rankQuestionnaireQueueItems,
  type PendingExpansionProbe,
  type QuestionnaireQueueItem,
} from "@/lib/questionnaireEngine";
import {
  QUESTIONNAIRE_COVERAGE_ANCHOR_IDS,
  QUESTIONNAIRE_CORE_ANCHOR_IDS,
  QUESTIONNAIRE_DISCOVERY_ANCHOR_IDS,
  QUESTIONNAIRE_INTEREST_ANCHOR_IDS,
  questionnairePrimaryCluster,
} from "@/lib/questionnaireMetadata";
import type {
  DynamicQuestionnaireSetup,
  Kink,
  Profile,
  QuestionnaireInterest,
  QuestionnaireMode,
  QuestionnairePreset,
  QuestionnaireSetup,
} from "@/types";

export type QuestionnaireIntent = "dynamic" | "discover" | "deepDive";

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

export interface QuestionnaireRuntime {
  intent: QuestionnaireIntent | "legacy";
  queue: QuestionnaireQueueItem[];
  visibleKinks: Kink[];
  pendingProbes: PendingExpansionProbe[];
  coverage: QuestionnaireCoverage | null;
  complete: boolean;
}

interface RuntimeOptions {
  intent?: QuestionnaireIntent;
  discoveryWaveIds?: readonly string[];
}

const DISCOVERY_ANCHOR_SET: ReadonlySet<string> = new Set(
  QUESTIONNAIRE_DISCOVERY_ANCHOR_IDS,
);

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

/** v1 is deliberately still exported for old profile settings and tests. */
export const QUESTIONNAIRE_PRESETS: Array<{
  value: QuestionnairePreset;
  label: string;
  description: string;
  target: number | null;
}> = [
  {
    value: "quick",
    label: "Snel starten",
    description: "Een compacte kernlijst met jouw gekozen interesses.",
    target: 52,
  },
  {
    value: "balanced",
    label: "Gebalanceerd",
    description: "Een brede startlijst met ruimte voor ontdekking.",
    target: 104,
  },
  {
    value: "full",
    label: "Volledig",
    description: "De volledige catalogus, zonder voorselectie.",
    target: null,
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

export const DEFAULT_QUESTIONNAIRE_SETUP: DynamicQuestionnaireSetup = {
  mode: "dynamic",
  interests: [],
  version: 2,
};

const SAFETY_TERMS = [
  "toestemming",
  "consent",
  "safeword",
  "stopwoord",
  "veilig",
  "grens",
  "communicatie",
  "check-in",
  "aftercare",
  "nazorg",
  "onderhand",
];

const INTEREST_TERMS: Record<QuestionnaireInterest, string[]> = {
  power: [
    "domin", "submiss", "macht", "controle", "service", "protocol", "ritueel",
    "training", "straf", "correctie", "regel",
  ],
  impact: [
    "impact", "spank", "flog", "whip", "paddle", "crop", "pijn", "sadis",
    "masoch", "needle", "naald", "elektro",
  ],
  bondage: [
    "bondage", "rope", "touw", "shibari", "cuff", "boei", "restraint", "beperk",
    "immobil", "suspension",
  ],
  sensation: [
    "sensatie", "sensory", "zintuig", "temperatuur", "wax", "kaars", "ijs", "tickl",
    "kietel", "aanraking", "adem", "breath",
  ],
  humiliation: [
    "verneder", "humili", "degrad", "object", "worship", "aanbidding", "service",
    "exposure", "lichaam", "body",
  ],
  sexual_social: [
    "seks", "sexual", "oral", "anaal", "anal", "penetr", "orgasm", "groep", "group",
    "publiek", "public", "voyeur", "exhibition", "roleplay", "rollenspel",
  ],
};

function searchable(kink: Kink): string {
  return `${kink.name} ${kink.category} ${kink.description ?? ""}`.toLowerCase();
}

function labelSearchable(kink: Kink): string {
  return `${kink.name} ${kink.category}`.toLowerCase();
}

function matchesTerms(kink: Kink, terms: string[]): boolean {
  const haystack = searchable(kink);
  return terms.some((term) => haystack.includes(term));
}

function matchesLabelTerms(kink: Kink, terms: string[]): boolean {
  const haystack = labelSearchable(kink);
  return terms.some((term) => haystack.includes(term));
}

function explicitlyAnswered(profile: Profile, kinkId: string): boolean {
  return profile.entries[kinkId]?.status != null;
}

function legacyQuestionnaire(profile: Profile): Kink[] {
  const maxLevel = LEVEL_MAX[profile.experienceLevel ?? "beginner"] ?? 1;
  return KINKS.filter((kink) => kink.level <= maxLevel);
}

function v1AdaptiveCandidates(profile: Profile): Kink[] {
  const setup = profile.questionnaireSetup;
  if (!setup || setup.version !== 1) return [];
  const chosenTerms = setup.interests.flatMap((interest) => INTEREST_TERMS[interest]);
  const preferredIds = new Set(
    chosenTerms.length > 0
      ? KINKS.filter((kink) => matchesTerms(kink, chosenTerms)).map((kink) => kink.id)
      : [],
  );
  const safetyIds = new Set(
    KINKS.filter((kink) => matchesLabelTerms(kink, SAFETY_TERMS)).map((kink) => kink.id),
  );
  return rankQuestionnaireCandidates(KINKS, profile.entries, { preferredIds, safetyIds });
}

function v1Questionnaire(profile: Profile): Kink[] {
  const setup = profile.questionnaireSetup;
  if (!setup || setup.version !== 1) return legacyQuestionnaire(profile);
  if (setup.preset === "full") return [...KINKS];

  const targetCount = setup.preset === "quick" ? 52 : 104;
  const answeredIds = new Set(
    KINKS.filter((kink) => explicitlyAnswered(profile, kink.id)).map((kink) => kink.id),
  );
  const selectionLimit = Math.max(targetCount, answeredIds.size);
  const remainingSlots = Math.max(0, selectionLimit - answeredIds.size);
  const selectedIds = new Set(answeredIds);
  for (const kink of v1AdaptiveCandidates(profile).slice(0, remainingSlots)) selectedIds.add(kink.id);
  return KINKS.filter((kink) => selectedIds.has(kink.id));
}

export function buildQuestionnaireCoveragePlan(
  interests: readonly QuestionnaireInterest[],
): QuestionnaireCoveragePlan {
  const catalogIds = new Set(KINKS.map((kink) => kink.id));
  const anchorIds: string[] = [];
  const interestAnchorIds: string[] = [];
  const seen = new Set<string>();

  for (const kinkId of QUESTIONNAIRE_COVERAGE_ANCHOR_IDS) {
    if (!catalogIds.has(kinkId) || seen.has(kinkId)) continue;
    seen.add(kinkId);
    anchorIds.push(kinkId);
  }
  for (const interest of interests) {
    for (const kinkId of QUESTIONNAIRE_INTEREST_ANCHOR_IDS[interest]) {
      if (!catalogIds.has(kinkId)) continue;
      if (!interestAnchorIds.includes(kinkId)) interestAnchorIds.push(kinkId);
      if (seen.has(kinkId)) continue;
      seen.add(kinkId);
      anchorIds.push(kinkId);
    }
  }

  return { anchorIds, interestAnchorIds };
}

export function questionnaireCoverage(
  profile: Profile,
  plan: QuestionnaireCoveragePlan = buildQuestionnaireCoveragePlan(profile.questionnaireSetup?.interests ?? []),
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

/**
 * One optional unanswered anchor per broad cluster. Re-running after a wave
 * naturally advances to the next anchor; no hidden discovery score is stored.
 */
export function buildQuestionnaireDiscoveryWave(profile: Profile): string[] {
  const byId = new Map(KINKS.map((kink) => [kink.id, kink]));
  const selectedClusters = new Set<string>();
  const wave: string[] = [];

  for (const kinkId of QUESTIONNAIRE_DISCOVERY_ANCHOR_IDS) {
    const kink = byId.get(kinkId);
    if (!kink || explicitlyAnswered(profile, kinkId)) continue;
    const cluster = questionnairePrimaryCluster(kink);
    if (selectedClusters.has(cluster)) continue;
    selectedClusters.add(cluster);
    wave.push(kinkId);
  }

  return wave;
}

function runtimeVisibleKinks(profile: Profile, eligibleIds: ReadonlySet<string>): Kink[] {
  return KINKS.filter((kink) => eligibleIds.has(kink.id) || explicitlyAnswered(profile, kink.id));
}

function runtimeForLegacy(profile: Profile): QuestionnaireRuntime {
  const selected = v1Questionnaire(profile);
  const selectedIds = new Set(selected.map((kink) => kink.id));
  const queue = (profile.questionnaireSetup?.version === 1
    ? v1AdaptiveCandidates(profile)
    : selected.filter((kink) => !explicitlyAnswered(profile, kink.id)))
    .filter((kink) => selectedIds.has(kink.id))
    .map((kink): QuestionnaireQueueItem => ({
      kink,
      lane: "legacy",
      isProbe: false,
      coversAnchor: false,
      reasons: [],
    }));

  return {
    intent: "legacy",
    queue,
    visibleKinks: selected,
    pendingProbes: [],
    coverage: null,
    complete: queue.length === 0,
  };
}

export function getQuestionnaireRuntime(
  profile: Profile,
  options: RuntimeOptions = {},
): QuestionnaireRuntime {
  const setup = profile.questionnaireSetup;
  if (!setup || setup.version === 1) return runtimeForLegacy(profile);

  const intent: QuestionnaireIntent = setup.mode === "deepDive"
    ? "deepDive"
    : options.intent ?? "dynamic";
  const coveragePlan = buildQuestionnaireCoveragePlan(setup.interests);
  const coverage = questionnaireCoverage(profile, coveragePlan);
  const coverageIds = new Set(coveragePlan.anchorIds);
  const coreIds = new Set<string>(QUESTIONNAIRE_CORE_ANCHOR_IDS);
  const interestIds = new Set(coveragePlan.interestAnchorIds);
  const pendingProbes = derivePendingExpansionProbes(KINKS, profile.entries);
  const probeByTarget = new Map(pendingProbes.map((probe) => [probe.targetKinkId, probe]));
  const discoveryIds = new Set(
    intent === "discover"
      ? (options.discoveryWaveIds ?? []).filter((kinkId) => DISCOVERY_ANCHOR_SET.has(kinkId))
      : [],
  );
  const eligibleIds = new Set<string>();

  if (intent === "deepDive") {
    for (const kink of KINKS) {
      if (!explicitlyAnswered(profile, kink.id)) eligibleIds.add(kink.id);
    }
  } else {
    for (const kinkId of coveragePlan.anchorIds) {
      if (!explicitlyAnswered(profile, kinkId)) eligibleIds.add(kinkId);
    }
    for (const kinkId of discoveryIds) {
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
            : discoveryIds.has(kink.id)
              ? "discovery"
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
  const discoveryComplete = [...discoveryIds].every((kinkId) => explicitlyAnswered(profile, kinkId));
  const complete = intent === "deepDive"
    ? KINKS.every((kink) => explicitlyAnswered(profile, kink.id))
    : coverage.complete
      && pendingProbes.length === 0
      && (intent !== "discover" || discoveryComplete);

  return {
    intent,
    queue,
    visibleKinks: intent === "deepDive" ? [...KINKS] : runtimeVisibleKinks(profile, eligibleIds),
    pendingProbes,
    coverage,
    complete,
  };
}

/**
 * Compatibility accessor. v1 keeps 52/104/full; v2 returns only the factual
 * Dynamic working set (answered + required/open) or the full Deep Dive catalog.
 */
export function getQuestionnaireKinks(profile: Profile): Kink[] {
  return getQuestionnaireRuntime(profile).visibleKinks;
}

export function getAdaptiveQuestionQueue(profile: Profile): Kink[] {
  return getQuestionnaireRuntime(profile).queue.map((item) => item.kink);
}

export function getQuestionnaireKinksByCategory(profile: Profile, category: string): Kink[] {
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
  if (setup.version === 2) {
    return setup.mode === "deepDive" ? KINKS.length : buildQuestionnaireCoveragePlan(interests).anchorIds.length;
  }
  const mockProfile: Profile = {
    id: "questionnaire-preview",
    name: "Preview",
    role: "Dominant",
    perspective: "dominant",
    experienceLevel: "beginner",
    questionnaireSetup: { ...setup, interests },
    customKinks: [],
    createdAt: 0,
    updatedAt: 0,
    entries: {},
  };
  return v1Questionnaire(mockProfile).length;
}
