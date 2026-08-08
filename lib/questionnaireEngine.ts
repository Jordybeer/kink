import {
  questionnaireClustersFor,
  questionnairePrimaryCluster,
  type QuestionnaireCluster,
} from "@/lib/questionnaireMetadata";
import type { Kink, KinkEntry } from "@/types";

interface RankOptions {
  preferredIds?: ReadonlySet<string>;
  safetyIds?: ReadonlySet<string>;
}

interface ClusterSignal {
  positive: number;
  negative: number;
}

interface RankedKink {
  kink: Kink;
  score: number;
  catalogIndex: number;
}

const MAX_CLUSTER_RUN = 2;
const DISCOVERY_INTERVAL = 5;
const POSITIVE_STATUSES = new Set(["yes", "willing"]);
const NEGATIVE_STATUSES = new Set(["no", "hard_no"]);

function buildClusterSignals(
  catalog: readonly Kink[],
  entries: Record<string, KinkEntry>,
): Map<QuestionnaireCluster, ClusterSignal> {
  const signals = new Map<QuestionnaireCluster, ClusterSignal>();
  const byId = new Map(catalog.map((kink) => [kink.id, kink]));

  for (const [kinkId, entry] of Object.entries(entries)) {
    if (!entry.status) continue;
    const kink = byId.get(kinkId);
    if (!kink) continue;
    const positive = POSITIVE_STATUSES.has(entry.status);
    const negative = NEGATIVE_STATUSES.has(entry.status);
    if (!positive && !negative) continue;

    for (const cluster of questionnaireClustersFor(kink)) {
      const signal = signals.get(cluster) ?? { positive: 0, negative: 0 };
      if (positive) signal.positive += 1;
      if (negative) signal.negative += 1;
      signals.set(cluster, signal);
    }
  }

  return signals;
}

function adaptiveScore(
  kink: Kink,
  signals: Map<QuestionnaireCluster, ClusterSignal>,
  options: RankOptions,
): number {
  let score = (5 - kink.level) * 45;
  if (options.safetyIds?.has(kink.id)) score += 650;
  if (options.preferredIds?.has(kink.id)) score += 500;

  const clusterSignals = questionnaireClustersFor(kink).map(
    (cluster) => signals.get(cluster) ?? { positive: 0, negative: 0 },
  );
  const strongestPositive = Math.max(0, ...clusterSignals.map((signal) => signal.positive));
  const strongestNegative = Math.max(0, ...clusterSignals.map((signal) => signal.negative));

  // Explicit enthusiasm opens nearby doors. The cap keeps one enthusiastic
  // cluster from overpowering discovery forever.
  score += Math.min(strongestPositive, 3) * 260;

  // Repeated explicit negatives only push *deeper* related material back in
  // the queue. They never remove a question and never create an answer.
  if (strongestNegative >= 2 && kink.level > 1) {
    score -= (strongestNegative - 1) * (kink.level - 1) * 210;
  }

  return score;
}

function wouldExtendClusterRun(kink: Kink, queued: Kink[]): boolean {
  if (queued.length < MAX_CLUSTER_RUN) return false;
  const cluster = questionnairePrimaryCluster(kink);
  return queued
    .slice(-MAX_CLUSTER_RUN)
    .every((candidate) => questionnairePrimaryCluster(candidate) === cluster);
}

function discoveryIndex(remaining: RankedKink[], queued: Kink[]): number {
  if (queued.length === 0 || (queued.length + 1) % DISCOVERY_INTERVAL !== 0) return -1;
  const recentClusters = new Set(
    queued.slice(-(DISCOVERY_INTERVAL - 1)).map(questionnairePrimaryCluster),
  );
  return remaining.findIndex(
    ({ kink }) => !recentClusters.has(questionnairePrimaryCluster(kink)),
  );
}

function diversify(ranked: RankedKink[]): Kink[] {
  const remaining = [...ranked];
  const queued: Kink[] = [];

  while (remaining.length > 0) {
    let index = discoveryIndex(remaining, queued);
    if (index < 0 || wouldExtendClusterRun(remaining[index].kink, queued)) {
      index = remaining.findIndex(({ kink }) => !wouldExtendClusterRun(kink, queued));
    }
    if (index < 0) index = 0;
    queued.push(remaining.splice(index, 1)[0].kink);
  }

  return queued;
}

/**
 * Ranks unanswered catalog questions from explicit answers only.
 *
 * No field is mutated or inferred. Stable catalog position is the final
 * tiebreaker, so identical inputs always produce identical output.
 */
export function rankQuestionnaireCandidates(
  catalog: readonly Kink[],
  entries: Record<string, KinkEntry>,
  options: RankOptions = {},
): Kink[] {
  const signals = buildClusterSignals(catalog, entries);
  const ranked = catalog
    .map((kink, catalogIndex): RankedKink => ({
      kink,
      catalogIndex,
      score: adaptiveScore(kink, signals, options),
    }))
    .filter(({ kink }) => entries[kink.id]?.status == null)
    .sort((left, right) => right.score - left.score || left.catalogIndex - right.catalogIndex);

  return diversify(ranked);
}
