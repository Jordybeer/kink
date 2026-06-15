"use client";
import type { Profile } from "@/types";
import { CATEGORIES, getKinksByCategoryAndLevel } from "@/lib/kinks";

export const STATUSES = ["willing", "yes", "maybe", "no", "hard_no"] as const;
export type Status = typeof STATUSES[number];

export const DNA_COLORS: Record<Status, string> = {
  willing: "var(--willing)",
  yes:     "var(--yes)",
  maybe:   "var(--maybe)",
  no:      "var(--no)",
  hard_no: "var(--hard-no)",
};

export const DNA_ICONS: Record<Status, string> = {
  willing: "↗",
  yes:     "✓",
  maybe:   "♡",
  no:      "✕",
  hard_no: "✕✕",
};

export function computeDnaSegments(profile: Profile, maxLevel: number) {
  const visibleKinks = CATEGORIES.flatMap((cat) => getKinksByCategoryAndLevel(cat, maxLevel));

  const statusCounts = Object.values(profile.entries).reduce((acc, e) => {
    if (e.status) acc[e.status as Status] = (acc[e.status as Status] ?? 0) + 1;
    return acc;
  }, {} as Record<Status, number>);

  const totalRated = visibleKinks.filter((k) => profile.entries[k.id]?.status).length;
  const totalVisible = visibleKinks.length;

  const dnaSegments = STATUSES
    .map((s) => ({
      status: s,
      count: statusCounts[s] ?? 0,
      pct: totalRated > 0 ? ((statusCounts[s] ?? 0) / totalRated) * 100 : 0,
    }))
    .filter((s) => s.count > 0);

  return { statusCounts, totalRated, totalVisible, dnaSegments };
}

interface DnaBarProps {
  profile: Profile;
  maxLevel: number;
}

/** Kink DNA distribution bar — shows the status spread for a profile's rated kinks. */
export default function DnaBar({ profile, maxLevel }: DnaBarProps) {
  const { dnaSegments } = computeDnaSegments(profile, maxLevel);

  return (
    <div className="mb-4">
      {dnaSegments.length === 0 ? (
        <div
          className="h-3 rounded-full w-full"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          aria-label="Nog geen keuzes gemaakt"
          role="img"
        />
      ) : (
        <div
          className="h-3 rounded-full overflow-hidden flex"
          style={{ background: "var(--surface2)" }}
          role="img"
          aria-label="Kink DNA verdeling"
        >
          {dnaSegments.map((seg, i) => (
            <div
              key={seg.status}
              className="h-full"
              style={{
                width: `${seg.pct}%`,
                background: DNA_COLORS[seg.status],
                borderRadius:
                  dnaSegments.length === 1
                    ? "9999px"
                    : i === 0
                    ? "9999px 0 0 9999px"
                    : i === dnaSegments.length - 1
                    ? "0 9999px 9999px 0"
                    : "0",
                transition: "width 700ms ease-out",
              }}
            />
          ))}
        </div>
      )}
      {dnaSegments.length > 0 && (
        <>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
            {dnaSegments.map((seg) => (
              <span
                key={seg.status}
                className="text-[10px] tabular-nums flex items-center gap-0.5"
                style={{ color: DNA_COLORS[seg.status] }}
              >
                {DNA_ICONS[seg.status]} {seg.count}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {(["yes", "willing", "maybe", "no", "hard_no"] as const).map((s) => (
              <span key={s} className="text-[10px] flex items-center gap-1" style={{ color: "var(--text2)" }}>
                <span className="w-1.5 h-1.5 rounded-full flex-none inline-block" style={{ background: DNA_COLORS[s] }} />
                {s === "yes" ? "Heel graag" : s === "willing" ? "Ja" : s === "maybe" ? "Misschien" : s === "no" ? "Voor hen" : "Harde grens"}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
