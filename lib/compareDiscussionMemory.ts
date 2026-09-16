import type { ComparisonFact } from "@/lib/compareV2";
import type { ContractParticipant, ContractSeries } from "@/lib/contractLifecycle";
import type { Profile } from "@/types";

const STORAGE_KEY = "kinksync-compare-discussed-v1";

interface StoredDiscussion {
  fingerprint: string;
  updatedAt: number;
}

interface DiscussionState {
  version: 1;
  pairs: Record<string, Record<string, StoredDiscussion>>;
}

const EMPTY_STATE: DiscussionState = { version: 1, pairs: {} };

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("nl-BE").replace(/\s+/g, " ");
}

export function profilePersonKey(profile: Profile): string {
  if (profile.personGroupId) return `group:${profile.personGroupId}`;

  if (profile.switchShareProof) {
    const keys = [
      profile.switchShareProof.dominant.keyId,
      profile.switchShareProof.submissive.keyId,
    ].filter(Boolean).sort();
    if (keys.length) return `switch:${keys.join("|")}`;
  }

  if (profile.verificationCode) return `verification:${profile.verificationCode}`;
  if (profile.consentProof?.keyId) return `key:${profile.consentProof.keyId}`;
  return `profile:${profile.id}`;
}

function participantPersonKey(participant: ContractParticipant): string {
  if (participant.personGroupId) return `group:${participant.personGroupId}`;
  if (participant.verificationCode) return `verification:${participant.verificationCode}`;
  if (participant.keyId) return `key:${participant.keyId}`;
  return `profile:${participant.profileId}`;
}

export function discussionPairKey(profileA: Profile, profileB: Profile): string {
  return [profilePersonKey(profileA), profilePersonKey(profileB)].sort().join("||");
}

function contractPairKey(series: ContractSeries): string {
  return series.participants.map(participantPersonKey).sort().join("||");
}

export function discussionFactKey(fact: ComparisonFact): string {
  return `${fact.custom ? "custom" : "catalog"}:${fact.relation}:${normalize(fact.label)}`;
}

function relevantAgreementMeaning(
  pairKey: string,
  fact: ComparisonFact,
  contractSeries: readonly ContractSeries[],
): unknown[] {
  const factLabel = normalize(fact.label);
  const rows: unknown[] = [];

  for (const series of contractSeries) {
    if (contractPairKey(series) !== pairKey || !series.currentVersionId) continue;
    const version = series.versions.find((candidate) => candidate.id === series.currentVersionId);
    const content = version?.content;
    if (!content) continue;

    for (const [bucket, details] of [
      ["shared", content.shared],
      ["soft", content.softLimits],
      ["hard", content.hardLimitDetails],
      ["discuss", content.discuss],
    ] as const) {
      for (const detail of details) {
        if (normalize(detail.name) !== factLabel) continue;
        rows.push({
          bucket,
          name: normalize(detail.name),
          statusA: detail.statusA,
          statusB: detail.statusB,
          commentA: detail.commentA ?? "",
          commentB: detail.commentB ?? "",
          desireA: detail.desireA ?? null,
          desireB: detail.desireB ?? null,
        });
      }
    }

    for (const limit of content.hardLimits) {
      if (normalize(limit.name) !== factLabel) continue;
      rows.push({ bucket: "hard-who", name: normalize(limit.name), who: normalize(limit.who) });
    }
  }

  return rows.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

export function discussionFingerprint(
  profileA: Profile,
  profileB: Profile,
  fact: ComparisonFact,
  contractSeries: readonly ContractSeries[],
): string {
  const statuses = [
    { person: profilePersonKey(profileA), status: fact.statusA },
    { person: profilePersonKey(profileB), status: fact.statusB },
  ].sort((left, right) => left.person.localeCompare(right.person));
  const pairKey = discussionPairKey(profileA, profileB);

  return JSON.stringify({
    statuses,
    agreement: relevantAgreementMeaning(pairKey, fact, contractSeries),
  });
}

function readState(storage: Pick<Storage, "getItem">): DiscussionState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(EMPTY_STATE);
    const parsed = JSON.parse(raw) as Partial<DiscussionState>;
    if (parsed.version !== 1 || !parsed.pairs || typeof parsed.pairs !== "object") {
      return structuredClone(EMPTY_STATE);
    }
    return { version: 1, pairs: parsed.pairs };
  } catch {
    return structuredClone(EMPTY_STATE);
  }
}

function writeState(storage: Pick<Storage, "setItem">, state: DiscussionState): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Relationship memory is helpful context, never a reason to break Compare.
  }
}

export function loadValidDiscussed(
  storage: Pick<Storage, "getItem" | "setItem">,
  profileA: Profile,
  profileB: Profile,
  facts: readonly ComparisonFact[],
  contractSeries: readonly ContractSeries[],
): Set<string> {
  const state = readState(storage);
  const pairKey = discussionPairKey(profileA, profileB);
  const pair = state.pairs[pairKey] ?? {};
  const discussed = new Set<string>();
  let changed = false;

  for (const fact of facts) {
    const key = discussionFactKey(fact);
    const stored = pair[key];
    if (!stored) continue;
    if (stored.fingerprint === discussionFingerprint(profileA, profileB, fact, contractSeries)) {
      discussed.add(fact.id);
    } else {
      delete pair[key];
      changed = true;
    }
  }

  if (changed) {
    if (Object.keys(pair).length) state.pairs[pairKey] = pair;
    else delete state.pairs[pairKey];
    writeState(storage, state);
  }

  return discussed;
}

export function setDiscussedMemory(
  storage: Pick<Storage, "getItem" | "setItem">,
  profileA: Profile,
  profileB: Profile,
  fact: ComparisonFact,
  contractSeries: readonly ContractSeries[],
  discussed: boolean,
): void {
  const state = readState(storage);
  const pairKey = discussionPairKey(profileA, profileB);
  const pair = state.pairs[pairKey] ?? {};
  const key = discussionFactKey(fact);

  if (discussed) {
    pair[key] = {
      fingerprint: discussionFingerprint(profileA, profileB, fact, contractSeries),
      updatedAt: Date.now(),
    };
    state.pairs[pairKey] = pair;
  } else {
    delete pair[key];
    if (Object.keys(pair).length) state.pairs[pairKey] = pair;
    else delete state.pairs[pairKey];
  }

  writeState(storage, state);
}
