"use client";
import type { BdsmtestScore } from "@/types";

interface Props {
  scores: BdsmtestScore[];
  url?: string;
}

export default function BdsmtestScores({ scores, url }: Props) {
  if (!scores.length) return null;

  const top = scores.slice(0, 10);
  const max = top[0]?.pct ?? 100;

  return (
    <section className="mx-4 mb-3 rounded-2xl px-4 py-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text2)" }}>
          bdsmtest resultaten
        </span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring rounded text-[11px]"
            style={{ color: "var(--accent)" }}
          >
            Bekijk ↗
          </a>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {top.map(({ role, pct }) => (
          <div key={role} className="flex items-center gap-2">
            <span className="text-xs w-28 flex-none truncate" style={{ color: "var(--text)" }}>{role}</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(pct / max) * 100}%`,
                  background: "var(--accent)",
                  transition: "width 600ms ease-out",
                }}
              />
            </div>
            <span className="text-xs tabular-nums w-8 text-right flex-none" style={{ color: "var(--text2)" }}>
              {pct}%
            </span>
          </div>
        ))}
      </div>

      {scores.length > 10 && (
        <p className="text-[11px] mt-2" style={{ color: "var(--text2)" }}>
          +{scores.length - 10} meer
        </p>
      )}
    </section>
  );
}
