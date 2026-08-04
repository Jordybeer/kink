"use client";

import { useState } from "react";
import { ArrowSquareOut, CaretRight } from "@phosphor-icons/react";
import type { BdsmtestScore } from "@/types";
import Sheet from "@/components/ui/Sheet";

const PREVIEW_COUNT = 3;

interface Props {
  scores: BdsmtestScore[];
  url?: string;
}

function ScoreRows({ scores, compact = false }: { scores: BdsmtestScore[]; compact?: boolean }) {
  return (
    <div className={compact ? "flex flex-col gap-1" : "flex flex-col gap-2"}>
      {scores.map(({ role, pct }) => (
        <div
          key={`${role}-${pct}`}
          className={`grid grid-cols-[minmax(0,6.25rem)_1fr_2.35rem] items-center gap-1.5 ${compact ? "min-h-5" : "min-h-8"}`}
        >
          <span className={`${compact ? "text-[11px]" : "text-xs"} truncate`} style={{ color: "var(--text)" }}>
            {role}
          </span>
          <div
            role="progressbar"
            aria-label={`${role}: ${pct}%`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className={`${compact ? "h-0.5" : "h-1.5"} rounded-full overflow-hidden`}
            style={{ background: "var(--surface2)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: "var(--accent)",
                transition: "width 250ms ease-out",
              }}
            />
          </div>
          <span className={`${compact ? "text-[11px]" : "text-xs"} tabular-nums text-right`} style={{ color: "var(--text2)" }}>
            {pct}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default function BdsmtestScores({ scores, url }: Props) {
  const [open, setOpen] = useState(false);
  if (!scores.length) return null;

  const preview = scores.slice(0, PREVIEW_COUNT);

  return (
    <>
      <section
        className="mx-4 mb-3 rounded-xl px-3 py-2.5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="focus-ring mb-1.5 flex min-h-7 w-full items-center justify-between gap-3 rounded-md text-left"
        >
          <span className="text-[11px] font-semibold" style={{ color: "var(--text2)" }}>
            BDSMTest
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: "var(--accent)" }}>
            Bekijk alle {scores.length}
            <CaretRight size={11} aria-hidden="true" />
          </span>
        </button>

        <ScoreRows scores={preview} compact />
      </section>

      <Sheet open={open} onClose={() => setOpen(false)} title="BDSMTest-resultaten" aria-label="Alle BDSMTest-resultaten">
        <div className="max-h-[65dvh] overflow-y-auto overscroll-contain px-1 pb-2">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring mb-4 inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold"
              style={{ color: "var(--accent)", borderColor: "var(--border-accent)" }}
            >
              Origineel resultaat openen
              <ArrowSquareOut size={12} aria-hidden="true" />
            </a>
          )}

          <ScoreRows scores={scores} />
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="focus-ring mt-4 w-full rounded-xl border py-2.5 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text2)" }}
        >
          Sluit
        </button>
      </Sheet>
    </>
  );
}
