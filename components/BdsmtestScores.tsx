"use client";

import { useState } from "react";
import { CaretRight } from "@phosphor-icons/react";
import type { BdsmtestScore } from "@/types";
import Sheet, { SheetContent } from "@/components/Sheet";

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
          className={`grid grid-cols-[minmax(0,6.25rem)_1fr_2.35rem] items-center gap-1.5 ${compact ? "min-h-6" : "min-h-8"}`}
        >
          <span className="truncate text-xs" style={{ color: "var(--text)" }}>
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
          <span className="text-right text-xs tabular-nums" style={{ color: "var(--text2)" }}>
            {pct}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default function BdsmtestScores({ scores }: Props) {
  const [open, setOpen] = useState(false);
  if (!scores.length) return null;

  const preview = scores.slice(0, PREVIEW_COUNT);

  return (
    <>
      <section
        className="mx-4 mb-3 rounded-xl px-3 py-2.5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        data-testid="bdsmtest-summary"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="focus-ring mb-1 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left"
        >
          <span className="text-sm font-semibold" style={{ color: "var(--text2)" }}>
            BDSMTest
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--accent)" }}>
            Bekijk alle {scores.length}
            <CaretRight size={11} aria-hidden="true" />
          </span>
        </button>

        <ScoreRows scores={preview} compact />
      </section>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        scrollable
        aria-label="Alle BDSMTest-resultaten"
      >
        <SheetContent className="max-h-[80dvh] overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
          <h2 className="mb-4 px-1 text-lg font-bold">BDSMTest-resultaten</h2>

          <div className="px-1 pb-2">
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
        </SheetContent>
      </Sheet>
    </>
  );
}
