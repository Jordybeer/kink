"use client";
import { ChevronRight, Star } from "lucide-react";
import type { Kink, KinkEntry, KinkStatus } from "@/types";

const STATUS_LABEL: Record<NonNullable<KinkStatus>, string> = {
  yes: "Heel graag",
  willing: "Ja",
  maybe: "Misschien",
  no: "Voor hen",
  hard_no: "Grens",
};

const STATUS_VAR: Record<NonNullable<KinkStatus>, string> = {
  yes: "var(--yes)",
  willing: "var(--willing)",
  maybe: "var(--maybe)",
  no: "var(--no)",
  hard_no: "var(--hard-no)",
};

interface Props {
  kink: Kink;
  entry: KinkEntry;
  onOpen: () => void;
}

// The ledger line: one rated kink, one row, one tap to reopen the verdict.
export default function KinkListRow({ kink, entry, onOpen }: Props) {
  const s = entry.status;
  const colour = s ? STATUS_VAR[s] : "var(--border)";
  return (
    <button
      onClick={onOpen}
      aria-label={`${kink.name}, ${s ? STATUS_LABEL[s] : "nog niet beoordeeld"} — bewerken`}
      className="focus-ring w-full min-h-12 rounded-xl mb-1 px-3 py-2 flex items-center gap-2 text-left transition-colors"
      style={{
        background: s
          ? `color-mix(in srgb, ${colour} 5%, var(--surface))`
          : "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${colour}`,
      }}
    >
      <span className="flex-1 text-sm font-medium truncate">{kink.name}</span>
      {entry.curious && (
        <Star size={12} fill="currentColor" aria-label="Nieuwsgierig" className="flex-none" style={{ color: "var(--curious)" }} />
      )}
      {s ? (
        <span
          className="flex-none text-xs px-2 py-0.5 rounded-full border whitespace-nowrap"
          style={
            s === "hard_no"
              ? { color: colour, borderColor: colour, borderStyle: "dashed" }
              : { color: colour, borderColor: `color-mix(in srgb, ${colour} 45%, transparent)`, background: `color-mix(in srgb, ${colour} 12%, transparent)` }
          }
        >
          {STATUS_LABEL[s]}
        </span>
      ) : (
        <span className="flex-none text-xs" style={{ color: "var(--text2)" }}>
          beoordeel
        </span>
      )}
      <ChevronRight size={14} aria-hidden="true" className="flex-none" style={{ color: "var(--text2)" }} />
    </button>
  );
}
