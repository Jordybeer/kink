"use client";
import type { KinkStatus } from "@/types";

// The five verdicts, stacked full-width for thumbs — hints echo the
// "Wat betekenen deze keuzes?" explainer so the vocabulary stays one voice.
const OPTIONS: { status: NonNullable<KinkStatus>; label: string; hint: string; danger?: boolean }[] = [
  { status: "yes",     label: "Heel graag", hint: "zoek ik actief op" },
  { status: "willing", label: "Ja",         hint: "geen probleem mee" },
  { status: "maybe",   label: "Misschien",  hint: "hangt af van context" },
  { status: "no",      label: "Voor hen",   hint: "geef ik mijn partner" },
  { status: "hard_no", label: "Grens",      hint: "niet bespreekbaar", danger: true },
];

const STATUS_VAR: Record<NonNullable<KinkStatus>, string> = {
  yes: "var(--yes)",
  willing: "var(--willing)",
  maybe: "var(--maybe)",
  no: "var(--no)",
  hard_no: "var(--hard-no)",
};

interface Props {
  current: KinkStatus;
  onSelect: (s: KinkStatus) => void;
}

export default function StatusOptionRows({ current, onSelect }: Props) {
  return (
    <div data-tour="pills" className="flex flex-col gap-1.5" role="group" aria-label="Status kiezen">
      {OPTIONS.map(({ status: s, label, hint, danger }) => {
        const active = current === s;
        const colour = STATUS_VAR[s];
        return (
          <button
            key={s}
            data-tour={danger ? "hard-no" : undefined}
            onClick={() => onSelect(active ? null : s)}
            aria-pressed={active}
            className={`focus-ring w-full h-12 rounded-xl px-3 flex items-center gap-3 text-left transition-colors${active ? ` status-${s}` : ""}`}
            style={
              active
                ? { border: `1px ${danger ? "dashed" : "solid"} ${colour}` }
                : {
                    color: colour,
                    background: "transparent",
                    border: `1px ${danger ? "dashed" : "solid"} color-mix(in srgb, ${colour} 40%, transparent)`,
                  }
            }
          >
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full flex-none"
              style={
                danger
                  ? { border: "1.5px dashed currentColor", background: "transparent" }
                  : { background: "currentColor" }
              }
            />
            <span className="text-sm font-medium flex-none">{label}</span>
            <span className="text-xs flex-1 text-right truncate" style={{ opacity: active ? 0.85 : 0.55 }}>
              {hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
