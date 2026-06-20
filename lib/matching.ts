import type { KinkEntry, KinkStatus, Profile } from "@/types";
import { KINKS } from "@/lib/kinks";

export type MatchKind = "perfect" | "strong" | "soft" | "discuss" | "conflict" | "limit" | "none";
export interface KinkMatch { score: number; kind: MatchKind; }

const anyHard = (e: KinkEntry) =>
  e.status === "hard_no" || e.statusGive === "hard_no" || e.statusReceive === "hard_no";

const hasRating = (e: KinkEntry): boolean =>
  e.status != null || e.statusGive != null || e.statusReceive != null;

function eff(e: KinkEntry, side: "give" | "receive"): KinkStatus | null {
  if (side === "give") return e.statusGive ?? e.status ?? null;
  return e.statusReceive ?? e.status ?? null;
}

export function kinkMatchScore(a: KinkEntry, b: KinkEntry): KinkMatch {
  if (anyHard(a) || anyHard(b)) return { score: 0, kind: "limit" };
  if (!hasRating(a) || !hasRating(b)) return { score: 0, kind: "none" };

  const aDir = !!(a.direction || a.statusGive || a.statusReceive);
  const bDir = !!(b.direction || b.statusGive || b.statusReceive);

  if (!aDir && !bDir) {
    const sa = a.status, sb = b.status;
    // "no" = "voor hen" (willing to do for partner) — not a hard limit, scored accordingly
    if (sa === "yes"     && sb === "yes")                                                  return { score: 95, kind: "perfect" };
    if ((sa === "yes"    && sb === "willing") || (sa === "willing" && sb === "yes"))       return { score: 80, kind: "strong" };
    if (sa === "willing" && sb === "willing")                                              return { score: 65, kind: "soft" };
    if ((sa === "yes"    && sb === "no")      || (sa === "no"      && sb === "yes"))       return { score: 55, kind: "discuss" };
    if ((sa === "yes"    && sb === "maybe")   || (sa === "maybe"   && sb === "yes"))       return { score: 50, kind: "discuss" };
    if ((sa === "willing"&& sb === "maybe")   || (sa === "maybe"   && sb === "willing"))   return { score: 45, kind: "discuss" };
    if ((sa === "willing"&& sb === "no")      || (sa === "no"      && sb === "willing"))   return { score: 40, kind: "discuss" };
    if (sa === "maybe"   && sb === "maybe")                                                return { score: 30, kind: "discuss" };
    if ((sa === "maybe"  && sb === "no")      || (sa === "no"      && sb === "maybe"))     return { score: 20, kind: "discuss" };
    if (sa === "no"      && sb === "no")                                                   return { score: 15, kind: "conflict" };
    return { score: 0, kind: "none" };
  }

  // Directional: try A-gives B-receives and B-gives A-receives
  const aGive = eff(a, "give"), bReceive = eff(b, "receive");
  const bGive = eff(b, "give"), aReceive = eff(a, "receive");

  const scoreDir = (give: KinkStatus | null, recv: KinkStatus | null): KinkMatch | null => {
    if (give === "yes"     && recv === "yes")                                                    return { score: 100, kind: "perfect" };
    if ((give === "yes"    && recv === "willing") || (give === "willing" && recv === "yes"))     return { score: 85,  kind: "strong" };
    if (give === "willing" && recv === "willing")                                                return { score: 65,  kind: "soft" };
    if ((give === "yes"    && recv === "no")      || (give === "no"      && recv === "yes"))     return { score: 55,  kind: "discuss" };
    if ((give === "yes"    && recv === "maybe")   || (give === "maybe"   && recv === "yes"))     return { score: 50,  kind: "discuss" };
    if ((give === "willing"&& recv === "maybe")   || (give === "maybe"   && recv === "willing")) return { score: 45,  kind: "discuss" };
    if ((give === "willing"&& recv === "no")      || (give === "no"      && recv === "willing")) return { score: 40,  kind: "discuss" };
    if (give === "maybe"   && recv === "maybe")                                                  return { score: 30,  kind: "discuss" };
    if ((give === "maybe"  && recv === "no")      || (give === "no"      && recv === "maybe"))   return { score: 20,  kind: "discuss" };
    if (give === "no"      && recv === "no")                                                     return { score: 15,  kind: "conflict" };
    return null;
  };

  // Both want to give and nobody will receive → role clash
  if (bReceive === "no" && aReceive === "no") return { score: 25, kind: "conflict" };

  const fwd = scoreDir(aGive, bReceive);
  const rev = scoreDir(bGive, aReceive);

  if (fwd && rev) return fwd.score >= rev.score ? fwd : rev;
  if (fwd) return fwd;
  if (rev) return rev;

  return { score: 25, kind: "conflict" };
}

export function profileMatchScore(
  a: Profile,
  b: Profile
): { overall: number; counts: Record<MatchKind, number> } {
  const counts: Record<MatchKind, number> = {
    perfect: 0, strong: 0, soft: 0, discuss: 0, conflict: 0, limit: 0, none: 0,
  };

  let scoreSum = 0, ratedTotal = 0;

  for (const kink of KINKS) {
    const eA = a.entries[kink.id] ?? { status: null, comment: "" };
    const eB = b.entries[kink.id] ?? { status: null, comment: "" };
    const { score, kind } = kinkMatchScore(eA, eB);
    counts[kind]++;
    if (kind !== "none") {
      scoreSum += score;
      ratedTotal++;
    }
  }

  const overall = ratedTotal > 0 ? Math.round(scoreSum / ratedTotal) : 0;
  return { overall, counts };
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
