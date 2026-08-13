import { CATEGORIES, KINKS } from "@/lib/kinks";
import {
  complementaryCompareLabel,
  complementaryPartnerKinkId,
} from "@/lib/participation";
import { visibleStatus } from "@/lib/privateResponses";
import type {
  KinkCategoryId,
  KinkEntry,
  KinkStatus,
  Profile,
} from "@/types";

export type VisibleCompareStatus = Exclude<KinkStatus, null>;
export type CompareRelation = "same" | "complementary";
export type CompareFactKind =
  | "shared"
  | "complementary"
  | "discuss"
  | "soft"
  | "limit"
  | "conflict";

export type CompareReasonCode =
  | "mutual_explicit_interest"
  | "complementary_explicit_participation"
  | "uncertain_or_mixed"
  | "reciprocal_for_partner"
  | "soft_desire_for_partner"
  | "soft_willing_for_partner"
  | "soft_uncertain_for_partner"
  | "hard_conflict_explicit_interest"
  | "hard_limit_without_conflict";

export interface StatusPairClassification {
  kind: CompareFactKind;
  reasonCode: CompareReasonCode;
}

export interface ComparisonFact {
  id: string;
  kind: CompareFactKind;
  reasonCode: CompareReasonCode;
  relation: CompareRelation;
  label: string;
  category: KinkCategoryId | null;
  custom: boolean;
  kinkAId: string;
  kinkBId: string;
  statusA: VisibleCompareStatus;
  statusB: VisibleCompareStatus;
}

export interface UnpairedComparisonItem {
  id: string;
  label: string;
  category: KinkCategoryId | null;
  custom: boolean;
  kinkAId: string;
  kinkBId: string;
  visibleSide: "a" | "b";
  status: VisibleCompareStatus;
}

export type CompareReasonType =
  | "hard_conflicts"
  | "hard_limits"
  | "soft_boundaries"
  | "complementary"
  | "shared"
  | "discussion";

export interface CompareReason {
  type: CompareReasonType;
  priority: number;
  count: number;
  factIds: string[];
}

export interface CompareSummary {
  shared: number;
  complementary: number;
  discuss: number;
  soft: number;
  conflict: number;
  limit: number;
  jointlyAssessed: number;
  unpairedVisible: number;
  reasons: CompareReason[];
}

export interface CompareCategoryEvidence {
  category: KinkCategoryId;
  jointlyAssessed: number;
  shared: number;
  complementary: number;
  discuss: number;
  soft: number;
  conflict: number;
  limit: number;
}

export interface CompareModel {
  facts: ComparisonFact[];
  unpaired: UnpairedComparisonItem[];
  categories: CompareCategoryEvidence[];
  summary: CompareSummary;
}

const POSITIVE = new Set<VisibleCompareStatus>(["yes", "willing"]);
const KINK_BY_ID = new Map(KINKS.map((kink) => [kink.id, kink]));

export function classifyStatusPair(
  statusA: VisibleCompareStatus,
  statusB: VisibleCompareStatus,
  relation: CompareRelation = "same",
): StatusPairClassification {
  const aPositive = POSITIVE.has(statusA);
  const bPositive = POSITIVE.has(statusB);

  if (statusA === "hard_no" || statusB === "hard_no") {
    const other = statusA === "hard_no" ? statusB : statusA;
    return POSITIVE.has(other)
      ? { kind: "conflict", reasonCode: "hard_conflict_explicit_interest" }
      : { kind: "limit", reasonCode: "hard_limit_without_conflict" };
  }

  if (aPositive && bPositive) {
    return relation === "complementary"
      ? { kind: "complementary", reasonCode: "complementary_explicit_participation" }
      : { kind: "shared", reasonCode: "mutual_explicit_interest" };
  }

  if (
    (aPositive && statusB === "maybe")
    || (bPositive && statusA === "maybe")
    || (statusA === "maybe" && statusB === "maybe")
  ) {
    return { kind: "discuss", reasonCode: "uncertain_or_mixed" };
  }

  if (statusA === "no" && statusB === "no") {
    return { kind: "discuss", reasonCode: "reciprocal_for_partner" };
  }

  if (statusA === "no" || statusB === "no") {
    const other = statusA === "no" ? statusB : statusA;
    if (other === "yes") return { kind: "soft", reasonCode: "soft_desire_for_partner" };
    if (other === "willing") return { kind: "soft", reasonCode: "soft_willing_for_partner" };
    return { kind: "soft", reasonCode: "soft_uncertain_for_partner" };
  }

  return { kind: "discuss", reasonCode: "uncertain_or_mixed" };
}

function canonicalPairId(
  prefix: "catalog" | "custom",
  profileAId: string,
  kinkAId: string,
  profileBId: string,
  kinkBId: string,
): string {
  return `${prefix}:${[
    `${profileAId}:${kinkAId}`,
    `${profileBId}:${kinkBId}`,
  ].sort().join("|")}`;
}

function customUnpairedId(profileId: string, kinkId: string): string {
  return `custom-unpaired:${profileId}:${kinkId}`;
}

function visibleRatedStatus(entry: KinkEntry | undefined): VisibleCompareStatus | null {
  return visibleStatus(entry) as VisibleCompareStatus | null;
}

function emptyCategoryEvidence(): CompareCategoryEvidence[] {
  return CATEGORIES.map((category) => ({
    category,
    jointlyAssessed: 0,
    shared: 0,
    complementary: 0,
    discuss: 0,
    soft: 0,
    conflict: 0,
    limit: 0,
  }));
}

function makeReason(
  type: CompareReasonType,
  priority: number,
  facts: ComparisonFact[],
  kind: CompareFactKind,
): CompareReason | null {
  const supporting = facts.filter((fact) => fact.kind === kind);
  if (!supporting.length) return null;
  return {
    type,
    priority,
    count: supporting.length,
    factIds: supporting.map((fact) => fact.id),
  };
}

export function buildCompareReasons(facts: ComparisonFact[]): CompareReason[] {
  return [
    makeReason("hard_conflicts", 100, facts, "conflict"),
    makeReason("hard_limits", 90, facts, "limit"),
    makeReason("soft_boundaries", 80, facts, "soft"),
    makeReason("complementary", 70, facts, "complementary"),
    makeReason("shared", 60, facts, "shared"),
    makeReason("discussion", 50, facts, "discuss"),
  ]
    .filter((reason): reason is CompareReason => reason !== null)
    .sort((a, b) => b.priority - a.priority || a.type.localeCompare(b.type));
}

function buildSummary(
  facts: ComparisonFact[],
  unpaired: UnpairedComparisonItem[],
): CompareSummary {
  const count = (kind: CompareFactKind) =>
    facts.filter((fact) => fact.kind === kind).length;
  return {
    shared: count("shared"),
    complementary: count("complementary"),
    discuss: count("discuss"),
    soft: count("soft"),
    conflict: count("conflict"),
    limit: count("limit"),
    jointlyAssessed: facts.length,
    unpairedVisible: unpaired.length,
    reasons: buildCompareReasons(facts),
  };
}

function catalogPresentation(
  kink: (typeof KINKS)[number],
): { label: string; category: KinkCategoryId | null } {
  const partnerId = complementaryPartnerKinkId(kink.id);
  if (partnerId === kink.id) {
    return {
      label: complementaryCompareLabel(kink.id, kink.name),
      category: kink.category,
    };
  }

  const partner = KINK_BY_ID.get(partnerId);
  if (!partner) {
    return {
      label: complementaryCompareLabel(kink.id, kink.name),
      category: kink.category,
    };
  }

  const labels = [
    complementaryCompareLabel(kink.id, kink.name),
    complementaryCompareLabel(partner.id, partner.name),
  ].filter((label, index, all) => all.indexOf(label) === index)
    .sort((left, right) => left.localeCompare(right));

  return {
    label: labels.join(" ↔ "),
    category: partner.category === kink.category ? kink.category : null,
  };
}

function addCatalogLane(
  facts: ComparisonFact[],
  unpaired: UnpairedComparisonItem[],
  profileA: Profile,
  profileB: Profile,
  kink: (typeof KINKS)[number],
): void {
  const kinkAId = kink.id;
  const kinkBId = complementaryPartnerKinkId(kink.id);
  const statusA = visibleRatedStatus(profileA.entries[kinkAId]);
  const statusB = visibleRatedStatus(profileB.entries[kinkBId]);
  const relation: CompareRelation = kinkAId === kinkBId ? "same" : "complementary";
  const id = canonicalPairId("catalog", profileA.id, kinkAId, profileB.id, kinkBId);
  const presentation = catalogPresentation(kink);

  if (statusA && statusB) {
    facts.push({
      id,
      ...classifyStatusPair(statusA, statusB, relation),
      relation,
      label: presentation.label,
      category: presentation.category,
      custom: false,
      kinkAId,
      kinkBId,
      statusA,
      statusB,
    });
  } else if (statusA || statusB) {
    unpaired.push({
      id,
      label: presentation.label,
      category: presentation.category,
      custom: false,
      kinkAId,
      kinkBId,
      visibleSide: statusA ? "a" : "b",
      status: (statusA ?? statusB)!,
    });
  }
}

interface VisibleCustomItem {
  id: string;
  name: string;
  status: VisibleCompareStatus;
}

function visibleCustomItems(profile: Profile): VisibleCustomItem[] {
  return (profile.customKinks ?? [])
    .flatMap((item) => {
      const status = visibleRatedStatus(profile.entries[item.id]);
      const name = item.name.trim();
      if (!status || !name) return [];
      return [{ id: item.id, name, status }];
    })
    .sort((left, right) => left.id.localeCompare(right.id) || left.name.localeCompare(right.name));
}

function customIdentityKey(item: Pick<VisibleCustomItem, "id" | "name">): string {
  return `${item.id}\u0000${item.name}`;
}

function addCustomLanes(
  facts: ComparisonFact[],
  unpaired: UnpairedComparisonItem[],
  profileA: Profile,
  profileB: Profile,
): void {
  const visibleA = visibleCustomItems(profileA);
  const visibleB = visibleCustomItems(profileB);
  const bByIdentity = new Map(visibleB.map((item) => [customIdentityKey(item), item]));
  const pairedB = new Set<string>();

  for (const itemA of visibleA) {
    const identity = customIdentityKey(itemA);
    const itemB = bByIdentity.get(identity);
    if (itemB) {
      pairedB.add(identity);
      facts.push({
        id: canonicalPairId("custom", profileA.id, itemA.id, profileB.id, itemB.id),
        ...classifyStatusPair(itemA.status, itemB.status),
        relation: "same",
        label: itemA.name,
        category: null,
        custom: true,
        kinkAId: itemA.id,
        kinkBId: itemB.id,
        statusA: itemA.status,
        statusB: itemB.status,
      });
      continue;
    }

    unpaired.push({
      id: customUnpairedId(profileA.id, itemA.id),
      label: itemA.name,
      category: null,
      custom: true,
      kinkAId: itemA.id,
      kinkBId: itemA.id,
      visibleSide: "a",
      status: itemA.status,
    });
  }

  for (const itemB of visibleB) {
    const identity = customIdentityKey(itemB);
    if (pairedB.has(identity)) continue;
    unpaired.push({
      id: customUnpairedId(profileB.id, itemB.id),
      label: itemB.name,
      category: null,
      custom: true,
      kinkAId: itemB.id,
      kinkBId: itemB.id,
      visibleSide: "b",
      status: itemB.status,
    });
  }
}

export function buildCompareModel(
  profileA: Profile | undefined,
  profileB: Profile | undefined,
): CompareModel {
  if (!profileA || !profileB || profileA.id === profileB.id) {
    return {
      facts: [],
      unpaired: [],
      categories: emptyCategoryEvidence(),
      summary: buildSummary([], []),
    };
  }

  const facts: ComparisonFact[] = [];
  const unpaired: UnpairedComparisonItem[] = [];
  for (const kink of KINKS) addCatalogLane(facts, unpaired, profileA, profileB, kink);
  addCustomLanes(facts, unpaired, profileA, profileB);
  facts.sort((left, right) => left.id.localeCompare(right.id));
  unpaired.sort((left, right) => left.id.localeCompare(right.id));

  const categories = emptyCategoryEvidence();
  const byId = new Map(categories.map((item) => [item.category, item]));
  for (const fact of facts) {
    if (!fact.category) continue;
    const category = byId.get(fact.category);
    if (!category) continue;
    category.jointlyAssessed += 1;
    category[fact.kind] += 1;
  }

  return {
    facts,
    unpaired,
    categories,
    summary: buildSummary(facts, unpaired),
  };
}
