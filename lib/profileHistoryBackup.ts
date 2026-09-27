import type { ProfileSnapshot } from "@/types";
import { sanitizeProfileFull } from "@/lib/sanitizeProfile";
import { deriveCounts } from "@/lib/profileSnapshot";

export function sanitizeProfileHistory(value: unknown): ProfileSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || !raw.id
      || typeof raw.profileId !== "string" || !raw.profileId
      || typeof raw.date !== "number" || !Number.isFinite(raw.date)) return [];
    const profile = sanitizeProfileFull({ ...raw, id: raw.profileId, name: "History" });
    if (!profile) return [];
    return [{ id: raw.id, profileId: raw.profileId, date: raw.date,
      entries: profile.entries, customKinks: profile.customKinks, counts: deriveCounts(profile.entries) }];
  });
}

export function mergeProfileHistory(current: ProfileSnapshot[], incoming: ProfileSnapshot[]) {
  const merged = new Map(current.map((snapshot) => [snapshot.id, snapshot]));
  const counts = new Map<string, number>();
  for (const snapshot of current) counts.set(snapshot.profileId, (counts.get(snapshot.profileId) ?? 0) + 1);
  let added = 0;
  for (const snapshot of [...incoming].sort((a, b) => b.date - a.date)) {
    if (merged.has(snapshot.id) || (counts.get(snapshot.profileId) ?? 0) >= 30) continue;
    merged.set(snapshot.id, snapshot);
    counts.set(snapshot.profileId, (counts.get(snapshot.profileId) ?? 0) + 1);
    added += 1;
  }
  return { profileSnapshots: [...merged.values()], added };
}
