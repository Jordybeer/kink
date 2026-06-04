"use client";
import type { ContractSnapshot } from "@/types";

interface Props {
  contracts: ContractSnapshot[];
}

const SEGMENTS = [
  { key: "matchCount",    label: "Match",     color: "var(--yes)" },
  { key: "discussCount",  label: "Bespreken", color: "var(--willing)" },
  { key: "softLimitCount", label: "Soft",     color: "var(--maybe)" },
  { key: "hardLimitCount", label: "Grens",    color: "var(--hard-no)" },
] as const;

const W = 400;
const H = 100;
const LABEL_H = 18;
const CHART_H = H - LABEL_H;
const BAR_GAP = 3;
const MAX_BAR_W = 28;

export function CompatibilityTimeline({ contracts }: Props) {
  if (contracts.length === 0) return null;

  const sorted = [...contracts].sort((a, b) => a.date - b.date);
  const n = sorted.length;
  const barW = Math.min(MAX_BAR_W, (W - BAR_GAP * (n - 1)) / n);
  const totalW = barW * n + BAR_GAP * (n - 1);
  const offsetX = (W - totalW) / 2;

  const maxTotal = Math.max(
    1,
    ...sorted.map((c) => c.matchCount + c.discussCount + c.softLimitCount + c.hardLimitCount)
  );

  const first = sorted[0];
  const last = sorted[n - 1];
  const summary =
    n === 1
      ? `Eén contract met ${first.matchCount} matches en ${first.hardLimitCount} harde grenzen.`
      : `Compatibiliteit over ${n} contracten: matches van ${first.matchCount} naar ${last.matchCount}, harde grenzen van ${first.hardLimitCount} naar ${last.hardLimitCount}.`;

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        aria-label={summary}
        role="img"
      >
        {sorted.map((c, i) => {
          const x = offsetX + i * (barW + BAR_GAP);
          const vals = [c.matchCount, c.discussCount, c.softLimitCount, c.hardLimitCount];
          const total = vals.reduce((s, v) => s + v, 0);
          const scale = total === 0 ? 0 : (CHART_H * 0.9) / maxTotal;
          const dateLabel = new Date(c.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

          let yTop = CHART_H;
          return (
            <g key={c.id}>
              {SEGMENTS.map(({ key, color }, si) => {
                const val = c[key];
                const h = val * scale;
                yTop -= h;
                return (
                  <rect
                    key={si}
                    x={x}
                    y={yTop}
                    width={barW}
                    height={h}
                    fill={color}
                    opacity={0.85}
                  />
                );
              })}
              <text
                x={x + barW / 2}
                y={H - 2}
                textAnchor="middle"
                fontSize={7}
                fill="var(--text2)"
              >
                {dateLabel}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
        {SEGMENTS.map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1 text-xs" style={{ color: "var(--text2)" }}>
            <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
