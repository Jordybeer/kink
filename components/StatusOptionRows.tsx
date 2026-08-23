"use client";
import { Check } from "@phosphor-icons/react";
import type { KinkStatus } from "@/types";
import { STATUS_HINT, STATUS_LABEL, STATUS_ORDER, STATUS_VAR } from "@/lib/statusLabels";

const OPTIONS = STATUS_ORDER.map((status) => ({ status, label: STATUS_LABEL[status], hint: STATUS_HINT[status], danger: status === "hard_no" }));

interface Props { current: KinkStatus; onSelect: (s: KinkStatus) => void; }

export default function StatusOptionRows({ current, onSelect }: Props) {
  return (
    <div data-tour="pills" className="grid h-full min-h-0 grid-rows-5 gap-1" role="group" aria-label="Status kiezen">
      {OPTIONS.map(({ status: s, label, hint, danger }) => {
        const active = current === s;
        const colour = STATUS_VAR[s];
        // De harde grens leest zijn label in een opgelichte tint; zie
        // --hard-no-text in globals.css. Rand, vulling en glyph blijven op
        // --hard-no, dus de ingetogen behandeling van principe 10 verandert niet.
        const labelColour = danger ? "var(--hard-no-text)" : colour;
        return (
          <button
            key={s}
            type="button"
            data-tour={danger ? "hard-no" : undefined}
            onClick={() => onSelect(active ? null : s)}
            aria-pressed={active}
            className="focus-ring h-full min-h-11 w-full rounded-xl px-3.5 py-1.5 text-left transition-[transform,background-color,border-color,box-shadow] duration-150 active:scale-[0.994] motion-reduce:active:scale-100 motion-reduce:transition-none"
            style={{
              color: "var(--text)",
              background: active
                ? `color-mix(in srgb, ${colour} ${danger ? 17 : 19}%, var(--surface2))`
                : `color-mix(in srgb, ${colour} ${danger ? 5 : 6}%, var(--surface2))`,
              border: `1px ${danger ? "dashed" : "solid"} ${active
                ? `color-mix(in srgb, ${colour} ${danger ? 46 : 52}%, var(--border))`
                : `color-mix(in srgb, ${colour} ${danger ? 20 : 12}%, var(--border))`}`,
              boxShadow: active
                ? `inset 0 1px 0 color-mix(in srgb, ${colour} 22%, transparent), 0 8px 24px color-mix(in srgb, ${colour} ${danger ? 8 : 13}%, transparent)`
                : `inset 0 1px 0 color-mix(in srgb, ${colour} 8%, transparent)`,
            }}
          >
            <span className="grid h-full min-w-0 grid-cols-[1.25rem_auto_minmax(0,1fr)] items-center gap-3">
              <span
                data-status-indicator={s}
                aria-hidden="true"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full transition-[background-color,border-color,box-shadow,color] duration-100 motion-reduce:transition-none"
                style={active
                  ? {
                      color: colour,
                      background: `color-mix(in srgb, ${colour} ${danger ? 14 : 20}%, var(--surface3))`,
                      border: `1px ${danger ? "dashed" : "solid"} color-mix(in srgb, ${colour} ${danger ? 34 : 44}%, var(--border))`,
                      boxShadow: `0 0 0 3px color-mix(in srgb, ${colour} ${danger ? 6 : 10}%, transparent), 0 0 12px color-mix(in srgb, ${colour} ${danger ? 8 : 14}%, transparent)`,
                    }
                  : { color: colour, background: "transparent", border: "1px solid transparent" }}
              >
                {active ? <Check size={11} weight="bold" /> : <span className="h-2.5 w-2.5 rounded-full" style={danger ? { border: `1.5px dashed ${colour}` } : { background: colour, boxShadow: `0 0 8px color-mix(in srgb, ${colour} 20%, transparent)` }} />}
              </span>
              <span className="whitespace-nowrap text-sm font-semibold leading-5" style={{ color: active ? labelColour : "var(--text)" }}>{label}</span>
              <span data-status-hint={s} className="min-w-0 justify-self-end text-right text-xs leading-4" style={{ color: "var(--text2)" }}>{hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
