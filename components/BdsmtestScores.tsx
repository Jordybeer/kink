"use client";

import { useState } from "react";
import { ArrowSquareOut, CaretRight } from "@phosphor-icons/react";
import type { BdsmtestScore } from "@/types";
import Sheet, { SheetContent } from "@/components/Sheet";
import BdsmtestMark from "@/components/brand/BdsmtestMark";

const PREVIEW_COUNT = 3;

interface Props {
  scores: BdsmtestScore[];
  url?: string;
  embedded?: boolean;
}

function ScoreRows({ scores, compact = false }: { scores: BdsmtestScore[]; compact?: boolean }) {
  return (
    <div className={compact ? "flex flex-col gap-1.5" : "flex flex-col gap-2"}>
      {scores.map(({ role, pct }) => (
        <div
          key={`${role}-${pct}`}
          className={`grid grid-cols-[minmax(0,6.5rem)_1fr_2.5rem] items-center gap-2 ${compact ? "min-h-7" : "min-h-8"}`}
        >
          <span className="truncate text-sm" style={{ color: "var(--text)" }}>{role}</span>
          <div
            role="progressbar"
            aria-label={`${role}: ${pct}%`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className={`${compact ? "h-1" : "h-1.5"} overflow-hidden rounded-full`}
            style={{ background: "var(--surface2)" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: "var(--accent)", transition: "width 250ms ease-out" }}
            />
          </div>
          <span className="text-right text-sm tabular-nums" style={{ color: "var(--text2)" }}>{pct}%</span>
        </div>
      ))}
    </div>
  );
}

export default function BdsmtestScores({ scores, url, embedded = false }: Props) {
  const [open, setOpen] = useState(false);
  if (!scores.length) return null;

  const preview = scores.slice(0, PREVIEW_COUNT);

  return (
    <>
      {embedded ? (
        <div data-testid="bdsmtest-summary" className="flex min-h-[60px] w-full items-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-label={`Bekijk alle ${scores.length} BDSMTest-resultaten`}
            className="focus-ring flex min-h-[60px] min-w-0 flex-1 items-center gap-3 rounded-lg px-1 text-left"
          >
            <span
              className="flex h-8 w-8 flex-none items-center justify-center rounded-lg"
              style={{ color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 8%, transparent)" }}
              aria-hidden="true"
            >
              <BdsmtestMark className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">BDSMTest</span>
              <span className="mt-0.5 block text-xs" style={{ color: "var(--text2)" }}>{scores.length} resultaten gekoppeld</span>
            </span>
            <CaretRight size={15} aria-hidden="true" style={{ color: "var(--text2)" }} />
          </button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open het opgeslagen BDSMTest-resultaat"
              className="focus-ring ml-1 flex h-11 w-11 flex-none items-center justify-center rounded-full"
              style={{ color: "var(--text2)" }}
            >
              <ArrowSquareOut size={16} aria-hidden="true" />
            </a>
          )}
        </div>
      ) : (
        <section
          className="mx-4 mb-3 rounded-xl px-3 py-2.5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          data-testid="bdsmtest-summary"
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className="focus-ring mb-2 flex min-h-11 w-full items-center justify-between gap-3 text-left"
          >
            <span className="text-xl font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-display, Georgia, serif)" }}>BDSMTest</span>
            <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--accent)" }}>
              Bekijk alle {scores.length}
              <CaretRight size={12} aria-hidden="true" />
            </span>
          </button>
          <ScoreRows scores={preview} compact />
        </section>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} scrollable aria-label="Alle BDSMTest-resultaten">
        <SheetContent className="max-h-[80dvh] overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
          <h2 className="mb-4 px-1 text-lg font-bold">BDSMTest-resultaten</h2>
          <div className="px-1 pb-2"><ScoreRows scores={scores} /></div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="focus-ring mt-4 min-h-11 w-full rounded-xl border py-2.5 text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}
          >
            Sluit
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}
