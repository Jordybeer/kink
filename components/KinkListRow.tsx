"use client";
import { CaretRight, Star, WarningCircle } from "@phosphor-icons/react";
import type { Kink, KinkEntry } from "@/types";
import { STATUS_LABEL, STATUS_VAR } from "@/lib/statusLabels";
import StatusGlyph from "./StatusGlyph";

interface Props {
  kink: Kink;
  entry: KinkEntry;
  onOpen: () => void;
}

export default function KinkListRow({ kink, entry, onOpen }: Props) {
  const status = entry.status;
  const colour = status ? STATUS_VAR[status] : "var(--border)";
  const askFirst = entry.tags?.includes("vraag eerst") ?? false;
  const firstTime = entry.tags?.includes("eerste keer") ?? false;
  const tagSpeech = [askFirst ? "eerst vragen" : null, firstTime ? "eerste keer" : null]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      onClick={onOpen}
      aria-label={`${kink.name}, ${status ? STATUS_LABEL[status] : "nog niet beoordeeld"}${tagSpeech ? `, ${tagSpeech}` : ""}, bewerken`}
      className="focus-ring w-full min-h-12 rounded-xl mb-1 px-3 py-2.5 flex items-center gap-2 text-left transition-colors"
      style={{
        background: status
          ? `color-mix(in srgb, ${colour} 5%, var(--surface))`
          : "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${colour}`,
      }}
    >
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium truncate">{kink.name}</span>
          {entry.curious && (
            <Star size={12} weight="fill" aria-label="Nieuwsgierig" className="flex-none" style={{ color: "var(--curious)" }} />
          )}
        </span>

        {(askFirst || firstTime) && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-tight">
            {askFirst && (
              <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--accent)" }}>
                <WarningCircle size={10} weight="fill" aria-hidden="true" />
                Eerst vragen
              </span>
            )}
            {askFirst && firstTime && (
              <span aria-hidden="true" style={{ color: "var(--text2)" }}>·</span>
            )}
            {firstTime && (
              <span style={{ color: "var(--text2)" }}>Eerste keer</span>
            )}
          </span>
        )}
      </span>

      {status ? (
        <span
          className="flex-none text-xs px-2 py-0.5 rounded-full border whitespace-nowrap min-w-[5.5rem] text-center inline-flex items-center justify-center gap-1"
          style={status === "hard_no"
            ? { color: colour, borderColor: colour, borderStyle: "dashed" }
            : { color: colour, borderColor: `color-mix(in srgb, ${colour} 45%, transparent)`, background: `color-mix(in srgb, ${colour} 12%, transparent)` }}
        >
          <StatusGlyph status={status} />
          {STATUS_LABEL[status]}
        </span>
      ) : (
        <span className="flex-none text-xs min-w-[5.5rem] text-center" style={{ color: "var(--text2)" }}>
          beoordeel
        </span>
      )}
      <CaretRight size={14} aria-hidden="true" className="flex-none" style={{ color: "var(--text2)" }} />
    </button>
  );
}
