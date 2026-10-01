"use client";
import { CaretRight, Star } from "@phosphor-icons/react";
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
  const colour = status ? STATUS_VAR[status] : "var(--text2)";
  const askFirst = entry.tags?.includes("vraag eerst") ?? false;
  const firstTime = entry.tags?.includes("eerste keer") ?? false;
  const tagSpeech = [askFirst ? "eerst vragen" : null, firstTime ? "eerste keer" : null]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${kink.name}, ${status ? STATUS_LABEL[status] : "nog niet beoordeeld"}${tagSpeech ? `, ${tagSpeech}` : ""}, bewerken`}
      className="focus-ring flex min-h-[58px] w-full items-center gap-3 border-b py-2.5 text-left"
      style={{ borderColor: "color-mix(in srgb, var(--border) 68%, transparent)" }}
    >
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[15px] font-medium leading-5">{kink.name}</span>
          {entry.curious && (
            <Star
              size={12}
              weight="fill"
              aria-label="Nieuwsgierig"
              className="flex-none"
              style={{ color: "var(--curious)" }}
            />
          )}
        </span>

        {(askFirst || firstTime) && (
          <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-4">
            {askFirst && (
              <span className="font-semibold" style={{ color: "var(--accent-text)" }}>
                Eerst vragen
              </span>
            )}
            {askFirst && firstTime && (
              <span aria-hidden="true" style={{ color: "var(--text2)" }}>·</span>
            )}
            {firstTime && <span style={{ color: "var(--text2)" }}>Eerste keer</span>}
          </span>
        )}
      </span>

      <span
        data-testid="kink-status-label"
        className="flex min-w-[5.6rem] flex-none items-center justify-end gap-1.5 text-right text-xs font-semibold leading-5"
        style={{ color: colour }}
      >
        {status ? (
          <>
            <StatusGlyph status={status} />
            <span>{STATUS_LABEL[status]}</span>
          </>
        ) : (
          <span style={{ color: "var(--text2)" }}>Beoordeel</span>
        )}
      </span>

      <CaretRight size={14} aria-hidden="true" className="flex-none" style={{ color: "var(--text2)" }} />
    </button>
  );
}
