import {
  questionnairePrimaryCluster,
  questionnaireTopicsFor,
  type QuestionnaireTopic,
} from "@/lib/questionnaireMetadata";
import type { Kink, KinkEntry } from "@/types";

interface RankOptions {
  preferredIds?: ReadonlySet<string>;
  safetyIds?: ReadonlySet<string>;
}

interface TopicSignal {
  positive: number;
  hardLimits: number;
}

interface RankedKink {
  kink: Kink;
  score: number;
  catalogIndex: number;
}

const MAX_CLUSTER_RUN = 2;
const DISCOVERY_INTERVAL = 5;
const YES_TOPIC_WEIGHT = 2;
const WILLING_TOPIC_WEIGHT = 1;
const MAX_POSITIVE_TOPIC_WEIGHT = 2;
const POSITIVE_TOPIC_BOOST = 120;

function buildTopicSignals(
  catalog: readonly Kink[],
  entries: Record<string, KinkEntry>,
): Map<QuestionnaireTopic, TopicSignal> {
  const signals = new Map<QuestionnaireTopic, TopicSignal>();
  const byId = new Map(catalog.map((kink) => [kink.id, kink]));

  for (const [kinkId, entry] of Object.entries(entries)) {
    if (!entry.status) continue;
    const kink = byId.get(kinkId);
    if (!kink) continue;
    const positive = entry.status === "yes"
      ? YES_TOPIC_WEIGHT
      : entry.status === "willing"
        ? WILLING_TOPIC_WEIGHT
        : 0;
    const hardLimit = entry.status === "hard_no";
    if (positive === 0 && !hardLimit) continue;

    for (const topic of questionnaireTopicsFor(kink)) {
      const signal = signals.get(topic) ?? { positive: 0, hardLimits: 0 };
      signal.positive += positive;
      if (hardLimit) signal.hardLimits += 1;
      signals.set(topic, signal);
    }
  }

  return signals;
}

function adaptiveScore(
  kink: Kink,
  signals: Map<QuestionnaireTopic, TopicSignal>,
  options: RankOptions,
): number {
  let score = (5 - kink.level) * 45;
  if (options.safetyIds?.has(kink.id)) score += 650;
  if (options.preferredIds?.has(kink.id)) score += 500;

  const topicSignals = questionnaireTopicsFor(kink).map(
    (topic) => signals.get(topic) ?? { positive: 0, hardLimits: 0 },
  );
  const strongestPositive = Math.max(0, ...topicSignals.map((signal) => signal.positive));
  const strongestHardLimit = Math.max(0, ...topicSignals.map((signal) => signal.hardLimits));

  // Yes opens a close door more strongly than willing. Even several answers
  // cannot outbid explicit interests or the safety/core coverage weights.
  score += Math.min(strongestPositive, MAX_POSITIVE_TOPIC_WEIGHT) * POSITIVE_TOPIC_BOOST;

  // Only repeated hard limits push deeper *topical* neighbors back. "Voor hen"
  // and "Misschien" are deliberately neutral and never close a branch.
  if (strongestHardLimit >= 2 && kink.level > 1) {
    score -= (strongestHardLimit - 1) * (kink.level - 1) * 210;
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
  const signals = buildTopicSignals(catalog, entries);
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
