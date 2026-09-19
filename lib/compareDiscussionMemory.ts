import type { ComparisonFact } from "@/lib/compareV2";
import type { ContractParticipant, ContractSeries } from "@/lib/contractLifecycle";
import { getProfileVerificationCode } from "@/lib/profileVerification";
import { STORAGE_FULL_EVENT } from "@/lib/persistStorage";
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

  return `verification:${getProfileVerificationCode(profile)}`;
}

function participantPersonKey(participant: ContractParticipant): string {
  if (participant.personGroupId) return `group:${participant.personGroupId}`;
  if (participant.verificationCode) return `verification:${participant.verificationCode}`;
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

function canonicalAgreementDetail(
  content: NonNullable<ContractSeries["versions"][number]["content"]>,
  detail: {
    name: string;
    statusA: unknown;
    statusB: unknown;
    commentA?: string;
    commentB?: string;
    desireA?: number | null;
    desireB?: number | null;
  },
) {
  const participants = [
    {
      person: participantPersonKey(content.profileA),
      status: detail.statusA,
      comment: detail.commentA ?? "",
      desire: detail.desireA ?? null,
    },
    {
      person: participantPersonKey(content.profileB),
      status: detail.statusB,
      comment: detail.commentB ?? "",
      desire: detail.desireB ?? null,
    },
  ].sort((left, right) => left.person.localeCompare(right.person));

  return { name: normalize(detail.name), participants };
}

function canonicalHardLimitWho(
  content: NonNullable<ContractSeries["versions"][number]["content"]>,
  who: string,
): string {
  const normalized = normalize(who);
  if (normalized === "beiden") return "both";
  if (normalized === normalize(content.profileA.profileName)) return participantPersonKey(content.profileA);
  if (normalized === normalize(content.profileB.profileName)) return participantPersonKey(content.profileB);
  return normalized;
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
        rows.push({ bucket, ...canonicalAgreementDetail(content, detail) });
      }
    }

    for (const limit of content.hardLimits) {
      if (normalize(limit.name) !== factLabel) continue;
      rows.push({
        bucket: "hard-who",
        name: normalize(limit.name),
        who: canonicalHardLimitWho(content, limit.who),
      });
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
    const pairs: DiscussionState["pairs"] = {};
    for (const [key, entries] of Object.entries(parsed.pairs)) {
      if (!entries || typeof entries !== "object" || Array.isArray(entries)) continue;
      const valid = Object.entries(entries).filter(([, value]) =>
        value && typeof value === "object" && typeof value.fingerprint === "string"
        && typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt));
      Object.defineProperty(pairs, key, { value: Object.fromEntries(valid), enumerable: true, configurable: true, writable: true });
    }
    return { version: 1, pairs };
  } catch {
    return structuredClone(EMPTY_STATE);
  }
}

function writeState(storage: Pick<Storage, "setItem">, state: DiscussionState): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(STORAGE_FULL_EVENT));
    return false;
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
): boolean {
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

  return writeState(storage, state);
}
