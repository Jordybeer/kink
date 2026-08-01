import type { KinkEntry, KinkStatus, ProfileSnapshot } from "@/types";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/statusLabels";

export type CountKey = Exclude<KinkStatus, null>;

const ZERO_COUNTS: ProfileSnapshot["counts"] = {
  yes: 0, willing: 0, maybe: 0, no: 0, hard_no: 0,
};

export function deriveCounts(entries: Record<string, KinkEntry>): ProfileSnapshot["counts"] {
  const counts = { ...ZERO_COUNTS };
  for (const entry of Object.values(entries)) {
    const status = effectiveStatus(entry);
    if (status) counts[status]++;
  }
  return counts;
}

function effectiveStatus(entry: KinkEntry): CountKey | null {
  if (entry.privateResponse === true) return null;
  return (entry.status ?? null) as CountKey | null;
}

export interface ProfileTrendSeries {
  readonly key: CountKey;
  readonly label: string;
  readonly cssVar: string;
}

const SERIES_CSS_VAR: Record<CountKey, string> = {
  yes: "--yes", willing: "--willing", maybe: "--maybe", no: "--no", hard_no: "--hard-no",
};

export const PROFILE_TREND_SERIES: readonly ProfileTrendSeries[] = STATUS_ORDER.map((key) => ({
  key,
  label: STATUS_LABEL[key],
  cssVar: SERIES_CSS_VAR[key],
}));

export interface ProfileTrendData {
  labels: string[];
  series: Record<CountKey, number[]>;
  ascending: ProfileSnapshot[];
}

export interface SnapshotShift {
  kinkId: string;
  from: CountKey | null;
  to: CountKey | null;
}

export function diffSnapshotEntries(
  older: Record<string, KinkEntry>,
  newer: Record<string, KinkEntry>
): SnapshotShift[] {
  const ids = new Set([...Object.keys(older), ...Object.keys(newer)]);
  const shifts: SnapshotShift[] = [];
  for (const kinkId of ids) {
    const olderEntry = older[kinkId];
    const newerEntry = newer[kinkId];
    // A privacy transition may never confess either the former or current verdict.
    if (olderEntry?.privateResponse === true || newerEntry?.privateResponse === true) continue;
    const from = olderEntry ? effectiveStatus(olderEntry) : null;
    const to = newerEntry ? effectiveStatus(newerEntry) : null;
    if (from !== to) shifts.push({ kinkId, from, to });
  }
  const rank = (shift: SnapshotShift) =>
    (shift.from === null ? 0 : shift.to === null ? 2 : 1) * 10 +
    (shift.to ? STATUS_ORDER.indexOf(shift.to) : STATUS_ORDER.length);
  return shifts.sort((a, b) => rank(a) - rank(b) || a.kinkId.localeCompare(b.kinkId));
}

export function prepareProfileTrendData(
  snapshots: ProfileSnapshot[],
  currentEntries?: Record<string, KinkEntry>,
): ProfileTrendData {
  const sorted = [...snapshots].sort((a, b) => a.date - b.date);
  const latest = sorted[sorted.length - 1];
  const privacySource = currentEntries ?? latest?.entries ?? {};
  const currentlyPrivate = new Set(
    Object.entries(privacySource)
      .filter(([, entry]) => entry.privateResponse === true)
      .map(([kinkId]) => kinkId),
  );
  const ascending = sorted.map((snapshot) => {
    const visibleEntries = Object.fromEntries(
      Object.entries(snapshot.entries).filter(([kinkId]) => !currentlyPrivate.has(kinkId)),
    );
    return { ...snapshot, entries: visibleEntries, counts: deriveCounts(visibleEntries) };
  });
  const fmt = (ms: number) => new Date(ms).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  const series: Record<CountKey, number[]> = {
    yes: [], willing: [], maybe: [], no: [], hard_no: [],
  };
  for (const snapshot of ascending) {
    series.yes.push(snapshot.counts.yes);
    series.willing.push(snapshot.counts.willing);
    series.maybe.push(snapshot.counts.maybe);
    series.no.push(snapshot.counts.no);
    series.hard_no.push(snapshot.counts.hard_no);
  }
  return { labels: ascending.map((snapshot) => fmt(snapshot.date)), series, ascending };
}
