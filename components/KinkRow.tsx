"use client";
import { useState } from "react";
import type { Kink, KinkEntry, KinkStatus } from "@/types";
import StatusPicker from "./StatusPicker";
import StarScore from "./StarScore";

const STATUS_BORDER: Record<NonNullable<KinkStatus>, string> = {
  yes:     "var(--yes)",
  willing: "var(--willing)",
  maybe:   "var(--maybe)",
  no:      "var(--no)",
  hard_no: "var(--hard-no)",
};

interface Props {
  kink: Kink;
  entry: KinkEntry;
  onStatusChange: (s: KinkStatus) => void;
  onScoreChange: (n: number | null) => void;
  onCommentChange: (c: string) => void;
}

export default function KinkRow({ kink, entry, onStatusChange, onScoreChange, onCommentChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const borderColour = entry.status ? STATUS_BORDER[entry.status] : "transparent";

  return (
    <div
      className="rounded-xl overflow-hidden mb-1 transition-[border-left-color] duration-150"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `4px solid ${borderColour}`,
      }}
    >
      {/* Row 1: name + stars + comment toggle */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
        <span className="flex-1 text-[15px] font-medium leading-snug">{kink.name}</span>
        <StarScore value={entry.score} onChange={onScoreChange} />
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Opmerking verbergen" : "Opmerking toevoegen"}
          title={expanded ? "Opmerking verbergen" : "Opmerking toevoegen"}
          className={`focus-ring w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${
            entry.comment
              ? "text-[var(--accent)] border border-[var(--accent)]"
              : "text-[var(--text2)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--text2)]"
          }`}
        >
          {entry.comment ? "✎" : "+"}
        </button>
      </div>

      {/* Row 2: full-width status strip */}
      <StatusPicker value={entry.status} onChange={onStatusChange} kinkName={kink.name} />

      {/* Row 3: comment textarea (conditional) */}
      {(expanded || entry.comment) && (
        <div className="px-3 pb-2 pt-1">
          <textarea
            aria-label="Opmerking of grensvoorwaarde"
            placeholder="Voeg een notitie of grensvoorwaarde toe…"
            value={entry.comment}
            onChange={(e) => onCommentChange(e.target.value)}
            rows={2}
            className="focus-ring w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-[var(--text)] placeholder-[color:var(--text2)] resize-none focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      )}
    </div>
  );
}
