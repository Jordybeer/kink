"use client";
import { EyeSlash, Star } from "@phosphor-icons/react";
import type { Kink, KinkEntry } from "@/types";
import { STATUS_LABEL, STATUS_VAR } from "@/lib/statusLabels";
import StatusGlyph from "./StatusGlyph";

interface Props {
  kink: Kink;
  entry: KinkEntry;
  onOpen: () => void;
}

const TAG_LABELS: Record<string, string> = {
  "vraag eerst": "Eerst vragen",
  "alleen privé": "Alleen privé",
  "scène specifiek": "Alleen afgesproken",
  "eerste keer": "Weinig ervaring",
};

export default function KinkListRow({ kink, entry, onOpen }: Props) {
  const status = entry.status;
  const colour = status ? STATUS_VAR[status] : "var(--text2)";
  const contextLabels = (entry.tags ?? [])
    .map((tag) => TAG_LABELS[tag])
    .filter((label): label is string => Boolean(label));
  if (entry.privateResponse) contextLabels.push("Privé");

  const contextSpeech = contextLabels.join(", ");

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${kink.name}, ${status ? STATUS_LABEL[status] : "nog niet beoordeeld"}${contextSpeech ? `, ${contextSpeech}` : ""}, bewerken`}
      className="focus-ring grid min-h-[54px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t px-1 py-2.5 text-left transition-colors"
      style={{ borderColor: "color-mix(in srgb, var(--border) 72%, transparent)" }}
    >
      <span className="min-w-0">
        <span className="flex min-w-0 items-start gap-1.5">
          <span className="min-w-0 text-sm font-medium leading-5 [overflow-wrap:anywhere]">{kink.name}</span>
          {entry.curious && (
            <Star
              size={12}
              weight="fill"
              aria-label="Nieuwsgierig"
              className="mt-1 flex-none"
              style={{ color: "var(--curious)" }}
            />
          )}
        </span>

        {contextLabels.length > 0 && (
          <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-4" style={{ color: "var(--text2)" }}>
            {contextLabels.map((label, index) => (
              <span key={`${label}-${index}`} className="inline-flex items-center gap-1">
                {index > 0 && <span aria-hidden="true">·</span>}
                {label === "Privé" && <EyeSlash size={11} aria-hidden="true" />}
                <span>{label}</span>
              </span>
            ))}
          </span>
        )}
      </span>

      <span
        data-testid="kink-status-pill"
        className="inline-flex w-[6.75rem] flex-none items-center justify-end gap-1.5 text-right text-sm font-medium leading-5"
        style={{ color: colour }}
      >
        {status ? (
          <>
            <StatusGlyph status={status} />
            <span>{STATUS_LABEL[status]}</span>
          </>
        ) : (
          <span style={{ color: "var(--text2)" }}>Onbeoordeeld</span>
        )}
      </span>
    </button>
  );
}