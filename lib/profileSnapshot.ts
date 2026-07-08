import type { KinkEntry, KinkStatus, ProfileSnapshot } from "@/types";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/statusLabels";

export type CountKey = Exclude<KinkStatus, null>;

const ZERO_COUNTS: ProfileSnapshot["counts"] = {
  yes: 0, willing: 0, maybe: 0, no: 0, hard_no: 0,
};

export function deriveCounts(entries: Record<string, KinkEntry>): ProfileSnapshot["counts"] {
  const counts = { ...ZERO_COUNTS };
  for (const entry of Object.values(entries)) {
    const s = effectiveStatus(entry);
    if (s) counts[s]++;
  }
  return counts;
}

function effectiveStatus(entry: KinkEntry): CountKey | null {
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

export function prepareProfileTrendData(snapshots: ProfileSnapshot[]): ProfileTrendData {
  const ascending = [...snapshots].sort((a, b) => a.date - b.date);
  const fmt = (ms: number) => new Date(ms).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  const series: Record<CountKey, number[]> = {
    yes: [], willing: [], maybe: [], no: [], hard_no: [],
  };
  for (const snap of ascending) {
    series.yes.push(snap.counts.yes);
    series.willing.push(snap.counts.willing);
    series.maybe.push(snap.counts.maybe);
    series.no.push(snap.counts.no);
    series.hard_no.push(snap.counts.hard_no);
  }
  return { labels: ascending.map((s) => fmt(s.date)), series, ascending };
}
