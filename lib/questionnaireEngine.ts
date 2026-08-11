import {
  questionnaireCanonicalProbeTarget,
  questionnaireFollowUpIds,
  questionnairePrimaryCluster,
  questionnaireRelatedIds,
  questionnaireTopicsFor,
} from "@/lib/questionnaireMetadata";
import { questionnaireProgressionParentIds } from "@/lib/questionnaireProgression";
import { complementarySiblingId } from "@/lib/participation";
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
  | "category"
  | "deepDive";

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

export type ConversationPhase = "normal" | "preferContinuation" | "topicBreakRequired";

export interface ConversationContext {
  /** Nieuwe expliciete live-state; afwezig houdt de oude adaptersemantiek. */
  phase?: ConversationPhase;
  /** Een positieve probe krijgt ademruimte voor de volgende zich aandient. */
  requireNonProbe?: boolean;
  /** Legacy adapter: alleen een zelfstandig eligible sibling direct uitnodigen. */
  preferDirectionalSibling?: boolean;
  /** Bron voor sibling/follow-up en topic spacing. */
  lastKinkId?: string | null;
}

interface DirectSupport {
  strongest: 0 | 1 | 2;
  sources: number;
  hardLimits: number;
}

const MAX_CLUSTER_RUN = 2;
const DISCOVERY_INTERVAL = 5;

const LANE_RANK: Record<QuestionnaireLane, number> = {
  core: 0,
  interest: 1,
  expansion: 2,
  discovery: 3,
  category: 3,
  coverage: 4,
  deepDive: 5,
};

function positiveStatus(status: KinkEntry["status"]): PositiveQuestionnaireStatus | null {
  return status === "yes" || status === "willing" ? status : null;
}

function statusStrength(status: PositiveQuestionnaireStatus): 1 | 2 {
  return status === "yes" ? 2 : 1;
}

function repeatedHardLimitPenalty(hardLimits: number): number {
  return Math.max(0, hardLimits - 1);
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
    // Alleen herhaalde harde grenzen mogen een expliciete vervolgvraag wat later
    // laten verleiden. Nooit achteruit over `related`, nooit door een heel topic.
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
 * Puur, stateless expansionboekje: elke positieve bron mag precies haar ene
 * vastgepinde target uitnodigen. Is die al beantwoord, dan blijft de tweede deur
 * dicht — geen stiekeme fallback naar een andere edge.
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

function diversify<T extends { kink: Kink }>(
  ranked: readonly T[],
  queuedBefore: readonly Kink[] = [],
): T[] {
  const remaining = [...ranked];
  const result: T[] = [];
  const queuedKinks: Kink[] = [...queuedBefore];

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
 * Laat ritme/diversiteit nooit een expliciete verdiepingsdeur inhalen. De
 * topologische herschikking is stabiel: alleen een child die vóór haar nog
 * onbeantwoorde parent staat, schuift naar achter. Een metadata-cycle faalt
 * open zodat de UI nooit vastloopt; de catalogustest bewaakt dat zo'n cycle
 * niet kan landen.
 */
function enforceProgressionOrder<T extends { kink: Kink }>(
  items: readonly T[],
  entries: Record<string, KinkEntry>,
): T[] {
  const remaining = [...items];
  const result: T[] = [];

  while (remaining.length > 0) {
    const remainingIds = new Set(remaining.map((item) => item.kink.id));
    const index = remaining.findIndex(({ kink }) =>
      questionnaireProgressionParentIds(kink.id).every(
        (parentId) => entries[parentId]?.status != null || !remainingIds.has(parentId),
      ),
    );

    if (index < 0) {
      result.push(...remaining);
      break;
    }

    const [next] = remaining.splice(index, 1);
    result.push(next);
  }

  return result;
}

/** De lanes houden de teugels: geen vurige score mag coverage onder de voet lopen. */
export function rankQuestionnaireQueueItems(
  items: readonly QuestionnaireQueueItem[],
  catalog: readonly Kink[],
  entries: Record<string, KinkEntry>,
): QuestionnaireQueueItem[] {
  const catalogIndex = new Map(catalog.map((kink, index) => [kink.id, index]));
  const support = directSignals(catalog, entries);
  const answeredByCategory = new Map<string, number>();
  const answeredByCluster = new Map<string, number>();
  for (const kink of catalog) {
    if (entries[kink.id]?.status == null) continue;
    answeredByCategory.set(kink.category, (answeredByCategory.get(kink.category) ?? 0) + 1);
    const cluster = questionnairePrimaryCluster(kink);
    answeredByCluster.set(cluster, (answeredByCluster.get(cluster) ?? 0) + 1);
  }
  const ranked = [...items].sort((left, right) => {
    const leftSupport = support.get(left.kink.id) ?? { strongest: 0, sources: 0, hardLimits: 0 };
    const rightSupport = support.get(right.kink.id) ?? { strongest: 0, sources: 0, hardLimits: 0 };
    const leftProbeStrength = left.reasons.length
      ? Math.max(...left.reasons.map((reason) => statusStrength(reason.status)))
      : 0;
    const rightProbeStrength = right.reasons.length
      ? Math.max(...right.reasons.map((reason) => statusStrength(reason.status)))
      : 0;
    const breadthFirst = left.lane === "discovery" || left.lane === "deepDive";
    const leftCategoryCoverage = breadthFirst
      ? answeredByCategory.get(left.kink.category) ?? 0
      : 0;
    const rightCategoryCoverage = breadthFirst
      ? answeredByCategory.get(right.kink.category) ?? 0
      : 0;
    const leftClusterCoverage = breadthFirst
      ? answeredByCluster.get(questionnairePrimaryCluster(left.kink)) ?? 0
      : 0;
    const rightClusterCoverage = breadthFirst
      ? answeredByCluster.get(questionnairePrimaryCluster(right.kink)) ?? 0
      : 0;
    return LANE_RANK[left.lane] - LANE_RANK[right.lane]
      || rightProbeStrength - leftProbeStrength
      || right.reasons.length - left.reasons.length
      || leftCategoryCoverage - rightCategoryCoverage
      || leftClusterCoverage - rightClusterCoverage
      || rightSupport.strongest - leftSupport.strongest
      || rightSupport.sources - leftSupport.sources
      || repeatedHardLimitPenalty(leftSupport.hardLimits)
        - repeatedHardLimitPenalty(rightSupport.hardLimits)
      || left.kink.level - right.kink.level
      || (catalogIndex.get(left.kink.id) ?? 0) - (catalogIndex.get(right.kink.id) ?? 0);
  });

  const itemsByLane = new Map<QuestionnaireLane, QuestionnaireQueueItem[]>();
  for (const item of ranked) {
    const laneItems = itemsByLane.get(item.lane) ?? [];
    laneItems.push(item);
    itemsByLane.set(item.lane, laneItems);
  }

  const diversified: QuestionnaireQueueItem[] = [];
  for (const laneItems of itemsByLane.values()) {
    diversified.push(...diversify(laneItems, diversified.map((item) => item.kink)));
  }
  return enforceProgressionOrder(diversified, entries);
}

/**
 * Compatibiliteitsadapter voor gerichte unit-tests. Hij heeft bewust géén eigen
 * rankingformule: safety/interests worden naar dezelfde lanes vertaald en gaan
 * daarna door exact dezelfde queue-ranker als de live questionnaire.
 */
export function rankQuestionnaireCandidates(
  catalog: readonly Kink[],
  entries: Record<string, KinkEntry>,
  options: RankOptions = {},
): Kink[] {
  const items: QuestionnaireQueueItem[] = catalog
    .filter((kink) => entries[kink.id]?.status == null)
    .map((kink) => ({
      kink,
      lane: options.safetyIds?.has(kink.id)
        ? "core"
        : options.preferredIds?.has(kink.id)
          ? "interest"
          : "coverage",
      isProbe: false,
      coversAnchor: options.safetyIds?.has(kink.id) || options.preferredIds?.has(kink.id) || false,
      reasons: [],
    }));

  return rankQuestionnaireQueueItems(items, catalog, entries).map((item) => item.kink);
}

function sharesTopic(left: Kink, right: Kink): boolean {
  const leftTopics = questionnaireTopicsFor(left);
  if (leftTopics.length === 0) return false;
  const rightTopics = new Set(questionnaireTopicsFor(right));
  return leftTopics.some((topic) => rightTopics.has(topic));
}

export function isConversationContinuation(
  item: QuestionnaireQueueItem | null | undefined,
  sourceKinkId: string | null | undefined,
): boolean {
  if (!item || !sourceKinkId) return false;
  if (complementarySiblingId(sourceKinkId) === item.kink.id) return true;
  return item.isProbe && item.reasons.some((reason) =>
    reason.sourceKinkId === sourceKinkId && reason.targetKinkId === item.kink.id,
  );
}

/**
 * De kaartdanser bewaakt alleen het gesprek. Hij maakt nooit eligibility of
 * antwoorden aan: een complement/probe moet al in de queue staan om direct te
 * mogen volgen.
 */
export function selectConversationQuestion(
  queue: readonly QuestionnaireQueueItem[],
  catalog: readonly Kink[],
  context: ConversationContext = {},
): QuestionnaireQueueItem | null {
  if (queue.length === 0) return null;
  let candidates = [...queue];

  // Een expliciete progression-parent die nog in dezelfde wachtrij staat,
  // houdt haar child nog even achter de gordijnrand. Dit filtert alleen de
  // volgende kaart; eligibility en antwoorden blijven onaangeraakt.
  const queuedIds = new Set(queue.map((item) => item.kink.id));
  const progressionReady = candidates.filter(({ kink }) =>
    questionnaireProgressionParentIds(kink.id).every((parentId) => !queuedIds.has(parentId)),
  );
  if (progressionReady.length > 0) candidates = progressionReady;

  if (context.phase) {
    if (context.phase === "topicBreakRequired" && context.lastKinkId) {
      const last = catalog.find((kink) => kink.id === context.lastKinkId);
      if (last) {
        const differentTopic = candidates.find((item) =>
          !isConversationContinuation(item, context.lastKinkId)
          && !sharesTopic(last, item.kink),
        );
        if (differentTopic) return differentTopic;
      }
      return candidates[0] ?? null;
    }

    if (context.phase === "preferContinuation" && context.lastKinkId) {
      const siblingId = complementarySiblingId(context.lastKinkId);
      const sibling = siblingId
        ? candidates.find((item) => item.kink.id === siblingId)
        : undefined;
      if (sibling) return sibling;

      const canonicalProbe = candidates.find((item) =>
        item.isProbe && item.reasons.some((reason) =>
          reason.sourceKinkId === context.lastKinkId
          && reason.targetKinkId === item.kink.id,
        ),
      );
      if (canonicalProbe) return canonicalProbe;
    }

    // Geen echte continuation beschikbaar: behoud de bestaande conversation
    // spacing in plaats van een gewone related/topic-buur direct te serveren.
    if (context.lastKinkId) {
      const last = catalog.find((kink) => kink.id === context.lastKinkId);
      if (last) {
        const differentTopic = candidates.find((item) => !sharesTopic(last, item.kink));
        if (differentTopic) return differentTopic;
      }
    }
    return candidates[0] ?? null;
  }

  if (context.requireNonProbe) {
    const nonProbes = candidates.filter((item) => !item.isProbe);
    if (nonProbes.length > 0) candidates = nonProbes;
  }

  if (context.lastKinkId) {
    if (context.preferDirectionalSibling) {
      const siblingId = complementarySiblingId(context.lastKinkId);
      const sibling = siblingId
        ? candidates.find((item) => item.kink.id === siblingId)
        : undefined;
      if (sibling) return sibling;
    }

    const last = catalog.find((kink) => kink.id === context.lastKinkId);
    if (last) {
      const differentTopic = candidates.find((item) => !sharesTopic(last, item.kink));
      if (differentTopic) return differentTopic;
    }
  }

  return candidates[0] ?? null;
}