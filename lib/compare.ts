import {
  buildCompareModel,
  type CompareCategoryEvidence,
  type CompareSummary,
  type ComparisonFact,
} from "@/lib/compareV2";
import {
  complementaryCompareLabel,
  complementaryPartnerKinkId,
} from "@/lib/participation";
import type { KinkEntry, Profile } from "@/types";

export {
  buildCompareModel,
  buildCompareReasons,
  classifyStatusPair,
} from "@/lib/compareV2";
export type {
  CompareCategoryEvidence,
  CompareFactKind,
  CompareModel,
  CompareReason,
  CompareReasonCode,
  CompareReasonType,
  CompareRelation,
  CompareSummary,
  ComparisonFact,
  StatusPairClassification,
  UnpairedComparisonItem,
  VisibleCompareStatus,
} from "@/lib/compareV2";

export const PROFILE_COLOUR_A = "var(--identity-a)";
export const PROFILE_COLOUR_B = "var(--identity-b)";

export type CompareFilterMode =
  | "all"
  | "shared"
  | "complementary"
  | "discuss"
  | "soft"
  | "hard";

export type CompareCategoryScore = CompareCategoryEvidence;

export interface MergedCustomKink {
  name: string;
  aId?: string;
  bId?: string;
}

const EMPTY_ENTRY: KinkEntry = { status: null, comment: "" };

export function cleanCompareParam(value: string | null): string {
  return value && value !== "undefined" && value !== "null" ? value : "";
}

export function getCompareEntry(profile: Profile | undefined, kinkId: string): KinkEntry {
  return profile?.entries[kinkId] ?? EMPTY_ENTRY;
}

export function getComparePartnerKinkId(kinkId: string): string {
  return complementaryPartnerKinkId(kinkId);
}

export function getComparePartnerEntry(profile: Profile | undefined, kinkId: string): KinkEntry {
  return getCompareEntry(profile, getComparePartnerKinkId(kinkId));
}

export function getCompareKinkLabel(kinkId: string, fallbackName: string): string {
  return complementaryCompareLabel(kinkId, fallbackName);
}

export function passesCompareFilter(
  fact: ComparisonFact,
  filterMode: CompareFilterMode,
): boolean {
  if (filterMode === "all") return true;
  if (filterMode === "hard") return fact.kind === "limit" || fact.kind === "conflict";
  return fact.kind === filterMode;
}

export function getCompareSummary(
  profileA: Profile | undefined,
  profileB: Profile | undefined,
): CompareSummary {
  return buildCompareModel(profileA, profileB).summary;
}

export function getCompareCategoryScores(
  profileA: Profile | undefined,
  profileB: Profile | undefined,
): CompareCategoryScore[] {
  return buildCompareModel(profileA, profileB).categories;
}

export function resolveCompareProfileIds({
  profiles,
  aId,
  bId,
  pinnedProfileId,
}: {
  profiles: Profile[];
  aId: string;
  bId: string;
  pinnedProfileId: string | null;
}): { aId: string; bId: string } {
  const selectedA = profiles.find((profile) => profile.id === aId);
  const selectedB = profiles.find((profile) => profile.id === bId);
  if (selectedA && selectedB) return { aId, bId };

  const primary = pinnedProfileId
    ? profiles.find((profile) => profile.id === pinnedProfileId)
    : undefined;
  const preferredOwn = primary
    ?? profiles.find((profile) => !profile.isImported && profile.origin !== "shared")
    ?? profiles[0];

  const nextA = selectedA
    ?? (preferredOwn && preferredOwn.id !== selectedB?.id ? preferredOwn : undefined)
    ?? profiles.find(
      (profile) =>
        profile.id !== selectedB?.id
        && !profile.isImported
        && profile.origin !== "shared",
    )
    ?? profiles.find((profile) => profile.id !== selectedB?.id);
  const nextB = selectedB
    ?? profiles.find(
      (profile) =>
        profile.id !== nextA?.id
        && (profile.isImported || profile.origin === "shared"),
    )
    ?? profiles.find((profile) => profile.id !== nextA?.id);

  return {
    aId: nextA?.id ?? aId,
    bId: nextB?.id ?? bId,
  };
}

/**
 * UI helper only. Custom topics are paired by stable identity, never by a
 * fuzzy or name-only match.
 */
export function mergeCustomKinks(
  profileA: Profile,
  profileB: Profile,
): MergedCustomKink[] {
  const byB = new Map((profileB.customKinks ?? []).map((item) => [item.id, item]));
  const usedB = new Set<string>();
  const merged: MergedCustomKink[] = [];

  for (const itemA of profileA.customKinks ?? []) {
    const itemB = byB.get(itemA.id);
    if (itemB && itemA.name.trim() === itemB.name.trim()) {
      merged.push({ name: itemA.name, aId: itemA.id, bId: itemB.id });
      usedB.add(itemB.id);
    } else {
      merged.push({ name: itemA.name, aId: itemA.id });
    }
  }

  for (const itemB of profileB.customKinks ?? []) {
    if (usedB.has(itemB.id)) continue;
    merged.push({ name: itemB.name, bId: itemB.id });
  }

  return merged;
}
