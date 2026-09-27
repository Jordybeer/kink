import type { ComparisonFact } from "@/lib/compareV2";
import type { ContractParticipant, ContractSeries } from "@/lib/contractLifecycle";
import { getProfileVerificationCode } from "@/lib/profileVerification";
import { STORAGE_FULL_EVENT } from "@/lib/persistStorage";
import type { Profile } from "@/types";
import { KINKS } from "@/lib/kinks";

const STORAGE_KEY = "kinksync-compare-discussed-v1";
const ENTRY_PREFIX = "kinksync-compare-discussed-v2:";
const INVALID_PREFIX = "kinksync-compare-discussed-invalid-v2:";
export const DISCUSSION_CHANGED_EVENT = "ks:discussion-changed";
type DiscussionStorage = Pick<Storage, "getItem" | "setItem">;

interface DiscussionEntry extends StoredDiscussion {
  version: 2;
  id: string;
  discussed: boolean;
}

export interface DiscussionContext {
  profileA: Profile;
  profileB: Profile;
  facts: readonly ComparisonFact[];
  contractSeries: readonly ContractSeries[];
}

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

function legacyFactKey(fact: ComparisonFact): string {
  return `${fact.custom ? "custom" : "catalog"}:${fact.relation}:${normalize(fact.label)}`;
}

/** Keep each person's part attached when the two columns swap places. */
export function discussionFactKey(profileA: Profile, profileB: Profile, fact: ComparisonFact): string {
  const participants = [
    [profilePersonKey(profileA), fact.kinkAId],
    [profilePersonKey(profileB), fact.kinkBId],
  ].sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify([fact.custom ? "custom" : "catalog", fact.relation, participants]);
}

const catalogLabelCounts = new Map<string, number>();
for (const kink of KINKS) {
  const label = normalize(kink.name);
  catalogLabelCounts.set(label, (catalogLabelCounts.get(label) ?? 0) + 1);
}

function canReadLegacy(profileA: Profile, profileB: Profile, fact: ComparisonFact): boolean {
  // V1 never recorded direction. Do not guess which participant was giving.
  if (fact.relation !== "same") return false;
  if (!fact.custom) return catalogLabelCounts.get(normalize(fact.label)) === 1;
  return [profileA, profileB].every((profile) =>
    profile.customKinks.filter((kink) => normalize(kink.name) === normalize(fact.label)).length === 1);
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

function announceChange(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DISCUSSION_CHANGED_EVENT));
}

function writeValue(storage: DiscussionStorage, key: string, value: unknown): boolean {
  try {
    storage.setItem(key, JSON.stringify(value));
    announceChange();
    return true;
  } catch {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(STORAGE_FULL_EVENT));
    return false;
  }
}

function readEntry(
  storage: Pick<Storage, "getItem">,
  profileA: Profile,
  profileB: Profile,
  fact: ComparisonFact,
  legacy: DiscussionState,
): DiscussionEntry | null {
  const key = discussionFactKey(profileA, profileB, fact);
  try {
    const raw = storage.getItem(ENTRY_PREFIX + key);
    if (raw !== null) {
      const entry = JSON.parse(raw) as Partial<DiscussionEntry> | null;
      if (entry?.version !== 2 || typeof entry.id !== "string" || !entry.id
        || typeof entry.discussed !== "boolean" || typeof entry.fingerprint !== "string"
        || typeof entry.updatedAt !== "number" || !Number.isFinite(entry.updatedAt)) return null;
      return entry as DiscussionEntry;
    }
    // Read-through migration: never copy a stale v1 snapshot over a v2 choice.
    // Explicit v2 false (and even malformed v2 data) always shadows legacy data.
    if (!canReadLegacy(profileA, profileB, fact)) return null;
    const pairKey = discussionPairKey(profileA, profileB);
    const legacyKey = legacyFactKey(fact);
    const stored = legacy.pairs[pairKey]?.[legacyKey];
    if (!stored) return null;
    return {
      ...stored, version: 2, discussed: true,
      id: JSON.stringify(["legacy", pairKey, legacyKey, stored.fingerprint, stored.updatedAt]),
    };
  } catch {
    return null;
  }
}

function isInvalidated(storage: Pick<Storage, "getItem">, entry: DiscussionEntry): boolean {
  try {
    return storage.getItem(INVALID_PREFIX + entry.id) !== null;
  } catch {
    return true;
  }
}

/** A stale reader may hide a mark locally, but must never delete it. */
export function loadValidDiscussed(
  storage: Pick<Storage, "getItem">,
  profileA: Profile,
  profileB: Profile,
  facts: readonly ComparisonFact[],
  contractSeries: readonly ContractSeries[],
): Set<string> {
  const legacy = readState(storage);
  const discussed = new Set<string>();
  for (const fact of facts) {
    const entry = readEntry(storage, profileA, profileB, fact, legacy);
    if (entry?.discussed && !isInvalidated(storage, entry)
      && entry.fingerprint === discussionFingerprint(profileA, profileB, fact, contractSeries)) {
      discussed.add(fact.id);
    }
  }
  return discussed;
}

export function setDiscussedMemory(
  storage: DiscussionStorage,
  profileA: Profile,
  profileB: Profile,
  fact: ComparisonFact,
  contractSeries: readonly ContractSeries[],
  discussed: boolean,
): boolean {
  const entry: DiscussionEntry = {
    version: 2,
    id: crypto.randomUUID(),
    discussed,
    fingerprint: discussionFingerprint(profileA, profileB, fact, contractSeries),
    updatedAt: Date.now(),
  };
  return writeValue(storage, ENTRY_PREFIX + discussionFactKey(profileA, profileB, fact), entry);
}

/**
 * Reopen only acknowledgements of the meaning that actually changed.
 * Revocation has its own immutable key: a concurrent fresh acknowledgement
 * gets another id, so this operation cannot erase it or bring an older one back.
 */
export function invalidateDiscussedTransition(
  storage: DiscussionStorage,
  before: DiscussionContext,
  after: DiscussionContext,
): boolean {
  if (discussionPairKey(before.profileA, before.profileB)
    !== discussionPairKey(after.profileA, after.profileB)) return true;
  const legacy = readState(storage);
  const nextFacts = new Map(after.facts.map((fact) =>
    [discussionFactKey(after.profileA, after.profileB, fact), fact]));
  let saved = true;
  for (const fact of before.facts) {
    const next = nextFacts.get(discussionFactKey(before.profileA, before.profileB, fact));
    const previousMeaning = discussionFingerprint(before.profileA, before.profileB, fact, before.contractSeries);
    if (next && previousMeaning === discussionFingerprint(after.profileA, after.profileB, next, after.contractSeries)) continue;
    const entry = readEntry(storage, before.profileA, before.profileB, fact, legacy);
    if (!entry?.discussed || entry.fingerprint !== previousMeaning || isInvalidated(storage, entry)) continue;
    if (!writeValue(storage, INVALID_PREFIX + entry.id, true)) saved = false;
  }
  return saved;
}

export function subscribeDiscussionMemory(
  target: Window,
  storage: Storage,
  refresh: () => void,
): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== storage) return;
    if (event.key === null || event.key === STORAGE_KEY
      || event.key.startsWith(ENTRY_PREFIX) || event.key.startsWith(INVALID_PREFIX)) refresh();
  };
  target.addEventListener("storage", onStorage);
  target.addEventListener(DISCUSSION_CHANGED_EVENT, refresh);
  target.addEventListener("focus", refresh);
  return () => {
    target.removeEventListener("storage", onStorage);
    target.removeEventListener(DISCUSSION_CHANGED_EVENT, refresh);
    target.removeEventListener("focus", refresh);
  };
}
