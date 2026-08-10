import { CATEGORIES, getKinksByCategory } from "@/lib/kinks";
import {
  hasRating,
  isConflict,
  isHardLimit,
  isKinkMatch,
  kinkMatchScore,
  MAX_KINK_MATCH_SCORE,
  profileMatchScore,
} from "@/lib/matching";
import type { KinkCategoryId, KinkEntry, Profile } from "@/types";

export const PROFILE_COLOUR_A = "var(--identity-a)";
export const PROFILE_COLOUR_B = "var(--identity-b)";

export type CompareFilterMode = "all" | "match" | "conflict" | "hardno";

export interface CompareCategoryScore {
  category: KinkCategoryId;
  rated: number;
  compared: number;
  rate: number | null;
}

export interface CompareSummary {
  score: number | null;
  match: number;
  discuss: number;
  soft: number;
  limit: number;
}

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

export function passesCompareFilter(
  entryA: KinkEntry,
  entryB: KinkEntry,
  filterMode: CompareFilterMode,
): boolean {
  if (!entryA.status && !entryB.status) return false;
  if (filterMode === "all") return true;
  if (filterMode === "hardno") return isHardLimit(entryA, entryB);
  if (filterMode === "conflict") return isConflict(entryA, entryB);
  if (filterMode === "match") return isKinkMatch(entryA, entryB);
  return true;
}

export function getCompareSummary(
  profileA: Profile | undefined,
  profileB: Profile | undefined,
): CompareSummary {
  if (!profileA || !profileB) {
    return { score: null, match: 0, discuss: 0, soft: 0, limit: 0 };
  }

  const result = profileMatchScore(profileA, profileB);
  return {
    score: result.comparedTotal > 0 ? result.overall : null,
    match: (result.counts.perfect ?? 0) + (result.counts.strong ?? 0),
    discuss: (result.counts.discuss ?? 0) + (result.counts.conflict ?? 0),
    soft: result.counts.soft ?? 0,
    limit: result.counts.limit ?? 0,
  };
}

export function getCompareCategoryScores(
  profileA: Profile | undefined,
  profileB: Profile | undefined,
): CompareCategoryScore[] {
  if (!profileA || !profileB) return [];

  return CATEGORIES.map((category) => {
    const kinks = getKinksByCategory(category);
    let scoreSum = 0;
    let compared = 0;
    let rated = 0;

    for (const kink of kinks) {
      const entryA = getCompareEntry(profileA, kink.id);
      const entryB = getCompareEntry(profileB, kink.id);
      if (hasRating(entryA) || hasRating(entryB)) rated += 1;
      if (!hasRating(entryA) || !hasRating(entryB)) continue;
      scoreSum += kinkMatchScore(entryA, entryB).score;
      compared += 1;
    }

    return {
      category,
      rated,
      compared,
      rate: compared > 0 ? scoreSum / (compared * MAX_KINK_MATCH_SCORE) : null,
    };
  });
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
    ?? profiles.find((profile) => profile.id !== selectedB?.id && !profile.isImported && profile.origin !== "shared")
    ?? profiles.find((profile) => profile.id !== selectedB?.id);
  const nextB = selectedB
    ?? profiles.find((profile) => profile.id !== nextA?.id && (profile.isImported || profile.origin === "shared"))
    ?? profiles.find((profile) => profile.id !== nextA?.id);

  return {
    aId: nextA?.id ?? aId,
    bId: nextB?.id ?? bId,
  };
}

export function mergeCustomKinks(profileA: Profile, profileB: Profile): MergedCustomKink[] {
  const merged = new Map<string, MergedCustomKink>();
  const allCustom = [
    ...(profileA.customKinks ?? []).map((kink) => ({ ...kink, side: "a" as const })),
    ...(profileB.customKinks ?? []).map((kink) => ({ ...kink, side: "b" as const })),
  ];

  for (const custom of allCustom) {
    const key = custom.name.trim().toLowerCase();
    const existing = merged.get(key) ?? { name: custom.name };
    merged.set(
      key,
      custom.side === "a"
        ? { ...existing, aId: custom.id }
        : { ...existing, bId: custom.id },
    );
  }

  return Array.from(merged.values());
}
