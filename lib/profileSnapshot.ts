import type { KinkEntry, KinkStatus, ProfileSnapshot } from "@/types";

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

export const PROFILE_TREND_SERIES: readonly ProfileTrendSeries[] = [
  { key: "yes",     label: "Heel graag",  cssVar: "--yes" },
  { key: "willing", label: "Ja",          cssVar: "--willing" },
  { key: "maybe",   label: "Misschien",   cssVar: "--maybe" },
  { key: "no",      label: "Voor hen",    cssVar: "--no" },
  { key: "hard_no", label: "Harde grens", cssVar: "--hard-no" },
] as const;

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
