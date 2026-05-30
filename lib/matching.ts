import type { KinkEntry, KinkStatus } from "@/types";

const ok = (s: KinkStatus | undefined | null): boolean =>
  s === "yes" || s === "willing";

export function isKinkMatch(a: KinkEntry, b: KinkEntry): boolean {
  if (!a.direction && !b.direction) return ok(a.status) && ok(b.status);
  if (ok(a.statusGive ?? a.status) && ok(b.statusReceive ?? b.status)) return true;
  if (ok(b.statusGive ?? b.status) && ok(a.statusReceive ?? a.status)) return true;
  return false;
}

export function isHardLimit(a: KinkEntry, b: KinkEntry): boolean {
  const anyHard = (e: KinkEntry) =>
    e.status === "hard_no" || e.statusGive === "hard_no" || e.statusReceive === "hard_no";
  return anyHard(a) || anyHard(b);
}

export function isConflict(a: KinkEntry, b: KinkEntry): boolean {
  if (isHardLimit(a, b)) return false;
  const hasRating = (e: KinkEntry) =>
    e.status != null || e.statusGive != null || e.statusReceive != null;
  return !isKinkMatch(a, b) && hasRating(a) && hasRating(b);
}
