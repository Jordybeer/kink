"use client";
import { useState, useRef } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Kink, KinkEntry, KinkStatus } from "@/types";
import KinkRow from "./KinkRow";

interface Props {
  category: string;
  kinks: Kink[];
  entries: Record<string, KinkEntry>;
  onStatusChange: (kinkId: string, s: KinkStatus) => void;
  onExperiencedChange: (kinkId: string, v: boolean | null) => void;
  onCommentChange: (kinkId: string, c: string) => void;
  onTagsChange: (kinkId: string, tags: string[]) => void;
  onBulkSkip: () => void;
  onBulkRestore?: (snapshot: Record<string, KinkEntry>) => void;
  compact?: boolean;
  hideComments?: boolean;
}

const MAX_PIPS = 20;

function countFilled(kinks: Kink[], entries: Record<string, KinkEntry>) {
  return kinks.filter((k) => entries[k.id]?.status != null).length;
}

export default function CategorySection({
  category, kinks, entries,
  onStatusChange, onExperiencedChange,
  onCommentChange, onTagsChange, onBulkSkip, onBulkRestore, compact, hideComments,
}: Props) {
  const [open, setOpen] = useState(true);
  const [undoPending, setUndoPending] = useState(false);
  const undoSnapshot = useRef<Record<string, KinkEntry>>({});
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filled = countFilled(kinks, entries);
  const pipCount = Math.min(kinks.length, MAX_PIPS);
  const filledPips = Math.round((filled / kinks.length) * pipCount);
  const overflow = kinks.length > MAX_PIPS ? `+${kinks.length - MAX_PIPS}` : null;

  return (
    <section className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors text-left sticky top-[41px] z-[5]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderLeft: open ? "4px solid var(--accent)" : "4px solid transparent",
        }}
      >
        <span className="text-[var(--accent)] flex-none">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span className="font-semibold text-sm flex-1 text-left">{category}</span>
        <div className="flex items-center gap-1.5 flex-none">
          <div className="flex gap-0.5 items-center">
            {Array.from({ length: pipCount }, (_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{ background: i < filledPips ? "var(--accent)" : "var(--border)" }}
              />
            ))}
            {overflow && (
              <span className="text-[10px] ml-0.5" style={{ color: "var(--text2)" }}>{overflow}</span>
            )}
          </div>
          <span className="text-xs tabular-nums" style={{ color: "var(--text2)" }}>
            {filled}/{kinks.length}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const snapshot: Record<string, KinkEntry> = {};
              for (const k of kinks) snapshot[k.id] = entries[k.id] ?? { status: null, score: null, comment: "" };
              undoSnapshot.current = snapshot;
              onBulkSkip();
              setUndoPending(true);
              if (undoTimer.current) clearTimeout(undoTimer.current);
              undoTimer.current = setTimeout(() => setUndoPending(false), 3000);
            }}
            aria-label={`Alle kinks in ${category} overslaan`}
            className="focus-ring rounded-full transition-colors"
            style={{
              fontSize: "10px",
              padding: "5px 8px",
              border: "1px solid var(--border)",
              color: "var(--text2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text2)";
            }}
          >
            Sla over
          </button>
        </div>
      </button>

      {undoPending && onBulkRestore && (
        <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg"
          style={{ background: "var(--surface2)", border: "1px solid var(--border-accent)", maxWidth: "28rem", margin: "0 auto" }}>
          <span className="flex-1 text-sm" style={{ color: "var(--text2)" }}>Categorie overgeslagen.</span>
          <button
            onClick={() => { onBulkRestore(undoSnapshot.current); setUndoPending(false); if (undoTimer.current) clearTimeout(undoTimer.current); }}
            className="focus-ring text-sm font-semibold flex-none"
            style={{ color: "var(--accent)" }}>
            Ongedaan maken
          </button>
        </div>
      )}

      <div className={`accordion-content ${open ? "open" : ""}`}>
        <div className="accordion-inner">
          <div className="mt-1 flex flex-col pl-1">
            {kinks.map((kink) => (
              <KinkRow
                key={kink.id}
                kink={kink}
                entry={entries[kink.id] ?? { status: null, score: null, comment: "" }}
                onStatusChange={(s) => onStatusChange(kink.id, s)}
                onExperiencedChange={(v) => onExperiencedChange(kink.id, v)}
                onCommentChange={(c) => onCommentChange(kink.id, c)}
                onTagsChange={(tags) => onTagsChange(kink.id, tags)}
                compact={compact}
                hideComments={hideComments}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
