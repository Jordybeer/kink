"use client";
import { useState } from "react";
import type { Kink, KinkEntry } from "@/types";
import StatusPicker from "./StatusPicker";
import StarScore from "./StarScore";
import type { KinkStatus } from "@/types";

interface Props {
  kink: Kink;
  entry: KinkEntry;
  onStatusChange: (s: KinkStatus) => void;
  onScoreChange: (n: number | null) => void;
  onCommentChange: (c: string) => void;
}

export default function KinkRow({ kink, entry, onStatusChange, onScoreChange, onCommentChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasData = entry.status !== null || entry.score !== null || entry.comment;

  return (
    <div
      className={`rounded-lg border transition-colors ${
        hasData ? "border-[var(--border)] bg-[var(--surface)]" : "border-transparent bg-transparent hover:bg-[var(--surface)]"
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-2 min-h-[44px]">
        {/* Name */}
        <span className="flex-1 text-sm font-medium truncate">{kink.name}</span>

        {/* Status */}
        <StatusPicker value={entry.status} onChange={onStatusChange} />

        {/* Stars */}
        <StarScore value={entry.score} onChange={onScoreChange} />

        {/* Comment toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? "Hide comment" : "Add comment"}
          className={`text-xs px-2 py-1 rounded border transition-colors ${
            entry.comment
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          {entry.comment ? "✎" : "+"}
        </button>
      </div>

      {(expanded || entry.comment) && (
        <div className="px-3 pb-2">
          <textarea
            placeholder="Add a note or boundary condition…"
            value={entry.comment}
            onChange={(e) => onCommentChange(e.target.value)}
            rows={2}
            className="w-full text-sm rounded border border-[var(--border)] bg-[var(--surface2)] px-2 py-1 text-[var(--text)] placeholder-[var(--muted)] resize-none focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      )}
    </div>
  );
}
