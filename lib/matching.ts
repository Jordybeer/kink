import type { KinkEntry, Profile } from "@/types";
import { KINKS } from "@/lib/kinks";
import { complementaryComparisonEntries } from "@/lib/participation";

export type MatchKind = "perfect" | "strong" | "soft" | "discuss" | "conflict" | "limit" | "none";
export interface KinkMatch { score: number; kind: MatchKind; }

export const MAX_KINK_MATCH_SCORE = 95;

const isAvailable = (e: KinkEntry): boolean => e.privateResponse !== true;
const anyHard = (e: KinkEntry) => isAvailable(e) && e.status === "hard_no";

const hasRating = (e: KinkEntry): boolean => isAvailable(e) && e.status != null;

export function kinkMatchScore(a: KinkEntry, b: KinkEntry): KinkMatch {
  // A hard limit always stays visible, even when the other profile has not rated this kink.
  if (anyHard(a) || anyHard(b)) return { score: 0, kind: "limit" };
  if (!hasRating(a) || !hasRating(b)) return { score: 0, kind: "none" };

  const sa = a.status, sb = b.status;
  // "no" = "voor hen" (willing to do for partner) — not a hard limit, scored accordingly
  if (sa === "yes"     && sb === "yes")                                                  return { score: 95, kind: "perfect" };
  if ((sa === "yes"    && sb === "willing") || (sa === "willing" && sb === "yes"))       return { score: 80, kind: "strong" };
  if (sa === "willing" && sb === "willing")                                              return { score: 65, kind: "soft" };
  if ((sa === "yes"    && sb === "no")      || (sa === "no"      && sb === "yes"))       return { score: 55, kind: "discuss" };
  if ((sa === "yes"    && sb === "maybe")   || (sa === "maybe"   && sb === "yes"))       return { score: 50, kind: "soft" };
  if ((sa === "willing"&& sb === "maybe")   || (sa === "maybe"   && sb === "willing"))   return { score: 45, kind: "soft" };
  if ((sa === "willing"&& sb === "no")      || (sa === "no"      && sb === "willing"))   return { score: 40, kind: "discuss" };
  if (sa === "maybe"   && sb === "maybe")                                                return { score: 30, kind: "soft" };
  if ((sa === "maybe"  && sb === "no")      || (sa === "no"      && sb === "maybe"))     return { score: 20, kind: "discuss" };
  if (sa === "no"      && sb === "no")                                                   return { score: 15, kind: "conflict" };
  return { score: 0, kind: "none" };
}

export interface ProfileMatchResult {
  /** Compatibility normalized to 0–100 across kinks rated by both profiles. */
  overall: number;
  counts: Record<MatchKind, number>;
  /** Number of kinks that actually contributed to the compatibility percentage. */
  comparedTotal: number;
  /** Visible hard limits where only one profile supplied a rating. */
  unscoredLimits: number;
}

export function profileMatchScore(a: Profile, b: Profile): ProfileMatchResult {
  const counts: Record<MatchKind, number> = {
    perfect: 0, strong: 0, soft: 0, discuss: 0, conflict: 0, limit: 0, none: 0,
  };

  let scoreSum = 0;
  let comparedTotal = 0;
  let unscoredLimits = 0;

  for (const kink of KINKS) {
    const { sourceEntry: eA, partnerEntry: eB } = complementaryComparisonEntries(
      a.entries,
      b.entries,
      kink.id,
    );
    const { score, kind } = kinkMatchScore(eA, eB);
    counts[kind]++;

    const jointlyRated = hasRating(eA) && hasRating(eB);
    if (jointlyRated) {
      scoreSum += score;
      comparedTotal++;
    } else if (kind === "limit") {
      unscoredLimits++;
    }
  }

  const overall = comparedTotal > 0
    ? Math.round((scoreSum / (comparedTotal * MAX_KINK_MATCH_SCORE)) * 100)
    : 0;
  return { overall, counts, comparedTotal, unscoredLimits };
}

export function isKinkMatch(a: KinkEntry, b: KinkEntry): boolean {
  const k = kinkMatchScore(a, b).kind;
  return k === "perfect" || k === "strong";
}

export function isHardLimit(a: KinkEntry, b: KinkEntry): boolean {
  return anyHard(a) || anyHard(b);
}

export { hasRating };

export function isConflict(a: KinkEntry, b: KinkEntry): boolean {
  if (isHardLimit(a, b)) return false;
  const kind = kinkMatchScore(a, b).kind;
  return kind === "discuss" || kind === "conflict";
}
