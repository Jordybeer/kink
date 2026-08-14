import {
  buildCompareModel,
  classifyStatusPair,
  type CompareCategoryEvidence,
  type CompareFactKind,
  type CompareSummary as CompareSummaryV2,
  type VisibleCompareStatus,
} from "@/lib/compareV2";
import {
  complementaryCompareLabel,
  complementaryPartnerKinkId,
} from "@/lib/participation";
import { visibleStatus } from "@/lib/privateResponses";
import type { KinkEntry, Profile } from "@/types";

export const PROFILE_COLOUR_A = "var(--identity-a)";
export const PROFILE_COLOUR_B = "var(--identity-b)";

export type CompareFilterMode =
  | "all"
  | "shared"
  | "complementary"
  | "discuss"
  | "soft"
  | "conflict"
  | "limit";

export type CompareCategoryScore = CompareCategoryEvidence;
export interface CompareSummary extends CompareSummaryV2 {
  /** Compatibility alias for the existing page contract. */
  match: number;
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
  entryA: KinkEntry,
  entryB: KinkEntry,
  filterMode: CompareFilterMode,
): boolean {
  const statusA = visibleStatus(entryA) as VisibleCompareStatus | null;
  const statusB = visibleStatus(entryB) as VisibleCompareStatus | null;
  if (!statusA || !statusB) return false;
  if (filterMode === "all") return true;
  const kind: CompareFactKind = classifyStatusPair(statusA, statusB).kind;
  return kind === filterMode;
}

export function getCompareSummary(
  profileA: Profile | undefined,
  profileB: Profile | undefined,
): CompareSummary {
  const summary = buildCompareModel(profileA, profileB).summary;
  return {
    ...summary,
    match: summary.shared + summary.complementary,
  };
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
