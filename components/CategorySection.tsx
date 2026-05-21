"use client";
import { useState } from "react";
import type { Kink, KinkEntry } from "@/types";
import type { KinkStatus } from "@/types";
import KinkRow from "./KinkRow";

interface Props {
  category: string;
  kinks: Kink[];
  entries: Record<string, KinkEntry>;
  onStatusChange: (kinkId: string, s: KinkStatus) => void;
  onScoreChange: (kinkId: string, n: number | null) => void;
  onCommentChange: (kinkId: string, c: string) => void;
}

function countFilled(kinks: Kink[], entries: Record<string, KinkEntry>) {
  return kinks.filter((k) => entries[k.id]?.status !== null && entries[k.id]?.status !== undefined).length;
}

export default function CategorySection({ category, kinks, entries, onStatusChange, onScoreChange, onCommentChange }: Props) {
  const [open, setOpen] = useState(true);
  const filled = countFilled(kinks, entries);

  return (
    <section className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface2)] transition-colors text-left"
      >
        <span className="text-[var(--accent)] font-bold text-sm">{open ? "▾" : "▸"}</span>
        <span className="font-semibold text-sm flex-1">{category}</span>
        <span className="text-xs text-[var(--muted)]">
          {filled}/{kinks.length} rated
        </span>
      </button>

      {open && (
        <div className="mt-1 flex flex-col gap-1 pl-2">
          {kinks.map((kink) => (
            <KinkRow
              key={kink.id}
              kink={kink}
              entry={entries[kink.id] ?? { status: null, score: null, comment: "" }}
              onStatusChange={(s) => onStatusChange(kink.id, s)}
              onScoreChange={(n) => onScoreChange(kink.id, n)}
              onCommentChange={(c) => onCommentChange(kink.id, c)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
