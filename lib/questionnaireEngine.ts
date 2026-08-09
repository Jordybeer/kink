import {
  questionnaireCanonicalProbeTarget,
  questionnaireFollowUpIds,
  questionnairePrimaryCluster,
  questionnaireRelatedIds,
  questionnaireTopicsFor,
} from "@/lib/questionnaireMetadata";
import type { Kink, KinkEntry } from "@/types";

interface RankOptions {
  preferredIds?: ReadonlySet<string>;
  safetyIds?: ReadonlySet<string>;
}

export type PositiveQuestionnaireStatus = "yes" | "willing";
export type QuestionnaireLane =
  | "core"
  | "interest"
  | "expansion"
  | "coverage"
  | "discovery"
  | "deepDive"
  | "legacy";

export interface ExpansionReason {
  sourceKinkId: string;
  targetKinkId: string;
  relationType: "followUp";
  status: PositiveQuestionnaireStatus;
}

export interface PendingExpansionProbe {
  targetKinkId: string;
  reasons: ExpansionReason[];
}

export interface QuestionnaireQueueItem {
  kink: Kink;
  lane: QuestionnaireLane;
  isProbe: boolean;
  coversAnchor: boolean;
  reasons: ExpansionReason[];
}

export interface ConversationContext {
  /** A positive probe must breathe before another probe may appear. */
  requireNonProbe?: boolean;
  /** Used only for topical spacing, never as an answer signal. */
  lastKinkId?: string | null;
}

interface DirectSupport {
  strongest: 0 | 1 | 2;
  sources: number;
  hardLimits: number;
}

interface RankedKink {
  kink: Kink;
  support: DirectSupport;
  safety: boolean;
  preferred: boolean;
  catalogIndex: number;
}

const MAX_CLUSTER_RUN = 2;
const DISCOVERY_INTERVAL = 5;

const LANE_RANK: Record<QuestionnaireLane, number> = {
  core: 0,
  interest: 1,
  expansion: 2,
  discovery: 3,
  coverage: 4,
  deepDive: 5,
  legacy: 5,
};

function positiveStatus(status: KinkEntry["status"]): PositiveQuestionnaireStatus | null {
  return status === "yes" || status === "willing" ? status : null;
}

function statusStrength(status: PositiveQuestionnaireStatus): 1 | 2 {
  return status === "yes" ? 2 : 1;
}

function directSignals(
  catalog: readonly Kink[],
  entries: Record<string, KinkEntry>,
): Map<string, DirectSupport> {
  const catalogIds = new Set(catalog.map((kink) => kink.id));
  const support = new Map<string, {
    strongest: 0 | 1 | 2;
    sources: Set<string>;
    hardLimits: Set<string>;
  }>();

  for (const [sourceKinkId, entry] of Object.entries(entries)) {
    const status = positiveStatus(entry.status);
    if (!catalogIds.has(sourceKinkId)) continue;
    // A hard limit may delay only explicit directional continuations. It never
    // propagates backwards over symmetric `related` edges or across a topic.
    const targets = status
      ? new Set([
          ...questionnaireRelatedIds(sourceKinkId),
          ...questionnaireFollowUpIds(sourceKinkId),
        ])
      : entry.status === "hard_no"
        ? new Set(questionnaireFollowUpIds(sourceKinkId))
        : new Set<string>();

    for (const targetKinkId of targets) {
      if (!catalogIds.has(targetKinkId) || targetKinkId === sourceKinkId) continue;
      const current = support.get(targetKinkId) ?? {
        strongest: 0,
        sources: new Set<string>(),
        hardLimits: new Set<string>(),
      };
      if (status) {
        current.strongest = Math.max(current.strongest, statusStrength(status)) as 0 | 1 | 2;
        current.sources.add(sourceKinkId);
      } else {
        current.hardLimits.add(sourceKinkId);
      }
      support.set(targetKinkId, current);
    }
  }

  return new Map(
    [...support].map(([targetKinkId, value]) => [
      targetKinkId,
      {
        strongest: value.strongest,
        sources: value.sources.size,
        hardLimits: value.hardLimits.size,
      },
    ]),
  );
}

/**
 * Pure, stateless expansion ledger. Each positive source can nominate only its
 * pinned canonical target. If that target was already answered, the source is
 * exhausted forever; there is deliberately no fallback to a second edge.
 */
export function derivePendingExpansionProbes(
  catalog: readonly Kink[],
  entries: Record<string, KinkEntry>,
): PendingExpansionProbe[] {
  const catalogIndex = new Map(catalog.map((kink, index) => [kink.id, index]));
  const reasonsByTarget = new Map<string, ExpansionReason[]>();

  for (const [sourceKinkId, entry] of Object.entries(entries)) {
    const status = positiveStatus(entry.status);
    if (!status || !catalogIndex.has(sourceKinkId)) continue;
    const targetKinkId = questionnaireCanonicalProbeTarget(sourceKinkId);
    if (!targetKinkId || !catalogIndex.has(targetKinkId)) continue;
    if (entries[targetKinkId]?.status != null) continue;

    const reasons = reasonsByTarget.get(targetKinkId) ?? [];
    reasons.push({ sourceKinkId, targetKinkId, relationType: "followUp", status });
    reasonsByTarget.set(targetKinkId, reasons);
  }

  return [...reasonsByTarget]
    .map(([targetKinkId, reasons]) => ({
      targetKinkId,
      reasons: reasons.sort((left, right) =>
        statusStrength(right.status) - statusStrength(left.status)
        || left.sourceKinkId.localeCompare(right.sourceKinkId)),
    }))
    .sort((left, right) => {
      const leftStrength = Math.max(...left.reasons.map((reason) => statusStrength(reason.status)));
      const rightStrength = Math.max(...right.reasons.map((reason) => statusStrength(reason.status)));
      return rightStrength - leftStrength
        || right.reasons.length - left.reasons.length
        || (catalogIndex.get(left.targetKinkId) ?? 0) - (catalogIndex.get(right.targetKinkId) ?? 0);
    });
}

function wouldExtendClusterRun(kink: Kink, queued: readonly Kink[]): boolean {
  if (queued.length < MAX_CLUSTER_RUN) return false;
  const cluster = questionnairePrimaryCluster(kink);
  return queued
    .slice(-MAX_CLUSTER_RUN)
    .every((candidate) => questionnairePrimaryCluster(candidate) === cluster);
}

function discoveryIndex<T extends { kink: Kink }>(remaining: readonly T[], queued: readonly Kink[]): number {
  if (queued.length === 0 || (queued.length + 1) % DISCOVERY_INTERVAL !== 0) return -1;
  const recentClusters = new Set(
    queued.slice(-(DISCOVERY_INTERVAL - 1)).map(questionnairePrimaryCluster),
  );
  return remaining.findIndex(
    ({ kink }) => !recentClusters.has(questionnairePrimaryCluster(kink)),
  );
}

function diversify<T extends { kink: Kink }>(ranked: readonly T[]): T[] {
  const remaining = [...ranked];
  const result: T[] = [];
  const queuedKinks: Kink[] = [];

  while (remaining.length > 0) {
    let index = discoveryIndex(remaining, queuedKinks);
    if (index < 0 || wouldExtendClusterRun(remaining[index].kink, queuedKinks)) {
      index = remaining.findIndex(({ kink }) => !wouldExtendClusterRun(kink, queuedKinks));
    }
    if (index < 0) index = 0;
    const [next] = remaining.splice(index, 1);
    result.push(next);
    queuedKinks.push(next.kink);
  }

  return result;
}

/**
 * Legacy v1 ranking remains budget-based, but propagation now uses only sparse
 * explicit relations. Safety and user-selected interests always outrank answer
 * relevance; yes outranks willing; only hard_no may delay a directional child.
 */
export function rankQuestionnaireCandidates(
  catalog: readonly Kink[],
  entries: Record<string, KinkEntry>,
  options: RankOptions = {},
): Kink[] {
  const support = directSignals(catalog, entries);
  const ranked = catalog
    .map((kink, catalogIndex): RankedKink => ({
      kink,
      catalogIndex,
      support: support.get(kink.id) ?? { strongest: 0, sources: 0, hardLimits: 0 },
      safety: options.safetyIds?.has(kink.id) ?? false,
      preferred: options.preferredIds?.has(kink.id) ?? false,
    }))
    .filter(({ kink }) => entries[kink.id]?.status == null)
    .sort((left, right) =>
      Number(right.safety) - Number(left.safety)
      || Number(right.preferred) - Number(left.preferred)
      || right.support.strongest - left.support.strongest
      || right.support.sources - left.support.sources
      || left.support.hardLimits - right.support.hardLimits
      || left.kink.level - right.kink.level
      || left.catalogIndex - right.catalogIndex);

  return diversify(ranked).map(({ kink }) => kink);
}

/** Lane ordering is categorical; no magic score can let enthusiasm swamp coverage. */
export function rankQuestionnaireQueueItems(
  items: readonly QuestionnaireQueueItem[],
  catalog: readonly Kink[],
  entries: Record<string, KinkEntry>,
): QuestionnaireQueueItem[] {
  const catalogIndex = new Map(catalog.map((kink, index) => [kink.id, index]));
  const support = directSignals(catalog, entries);
  const ranked = [...items].sort((left, right) => {
    const leftSupport = support.get(left.kink.id) ?? { strongest: 0, sources: 0, hardLimits: 0 };
    const rightSupport = support.get(right.kink.id) ?? { strongest: 0, sources: 0, hardLimits: 0 };
    const leftProbeStrength = left.reasons.length
      ? Math.max(...left.reasons.map((reason) => statusStrength(reason.status)))
      : 0;
    const rightProbeStrength = right.reasons.length
      ? Math.max(...right.reasons.map((reason) => statusStrength(reason.status)))
      : 0;
    return LANE_RANK[left.lane] - LANE_RANK[right.lane]
      || rightProbeStrength - leftProbeStrength
      || right.reasons.length - left.reasons.length
      || rightSupport.strongest - leftSupport.strongest
      || rightSupport.sources - leftSupport.sources
      || leftSupport.hardLimits - rightSupport.hardLimits
      || left.kink.level - right.kink.level
      || (catalogIndex.get(left.kink.id) ?? 0) - (catalogIndex.get(right.kink.id) ?? 0);
  });

  return diversify(ranked);
}

function sharesTopic(left: Kink, right: Kink): boolean {
  const leftTopics = questionnaireTopicsFor(left);
  if (leftTopics.length === 0) return false;
  const rightTopics = new Set(questionnaireTopicsFor(right));
  return leftTopics.some((topic) => rightTopics.has(topic));
}

/**
 * Final card chooser. Conversation state affects cadence only: it can delay a
 * probe or topical echo, never create/remove an answer or change eligibility.
 */
export function selectConversationQuestion(
  queue: readonly QuestionnaireQueueItem[],
  catalog: readonly Kink[],
  context: ConversationContext = {},
): QuestionnaireQueueItem | null {
  if (queue.length === 0) return null;
  let candidates = [...queue];

  if (context.requireNonProbe) {
    const nonProbes = candidates.filter((item) => !item.isProbe);
    if (nonProbes.length > 0) candidates = nonProbes;
  }

  if (context.lastKinkId) {
    const last = catalog.find((kink) => kink.id === context.lastKinkId);
    if (last) {
      const differentTopic = candidates.find((item) => !sharesTopic(last, item.kink));
      if (differentTopic) return differentTopic;
    }
  }

  return candidates[0] ?? null;
}
