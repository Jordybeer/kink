"use client";
import type { KinkStatus } from "@/types";
import { STATUS_HINT, STATUS_LABEL, STATUS_ORDER, STATUS_VAR } from "@/lib/statusLabels";

// The five verdicts, stacked full-width for thumbs — labels and hints come
// from lib/statusLabels so the vocabulary stays one voice.
const OPTIONS = STATUS_ORDER.map((status) => ({
  status,
  label: STATUS_LABEL[status],
  hint: STATUS_HINT[status],
  danger: status === "hard_no",
}));

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
