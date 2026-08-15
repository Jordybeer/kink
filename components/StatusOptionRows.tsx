"use client";
import { Check } from "@phosphor-icons/react";
import type { KinkStatus } from "@/types";
import { STATUS_HINT, STATUS_LABEL, STATUS_ORDER, STATUS_VAR } from "@/lib/statusLabels";

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
    <div
      data-tour="pills"
      className="mt-4 flex flex-col gap-2"
      role="group"
      aria-label="Status kiezen"
    >
      {OPTIONS.map(({ status: s, label, hint, danger }) => {
        const active = current === s;
        const colour = STATUS_VAR[s];

        return (
          <button
            key={s}
            type="button"
            data-tour={danger ? "hard-no" : undefined}
            onClick={() => onSelect(active ? null : s)}
            aria-pressed={active}
            className="focus-ring min-h-12 w-full rounded-xl px-3.5 py-2.5 text-left transition-[transform,background-color,border-color,box-shadow] duration-150 active:scale-[0.995] motion-reduce:transition-none"
            style={{
              color: "var(--text)",
              background: active
                ? `color-mix(in srgb, ${colour} 13%, var(--surface2))`
                : `color-mix(in srgb, ${colour} ${danger ? 3 : 4}%, var(--surface2))`,
              border: `1px ${danger ? "dashed" : "solid"} ${
                active
                  ? `color-mix(in srgb, ${colour} ${danger ? 52 : 58}%, var(--border))`
                  : `color-mix(in srgb, ${colour} ${danger ? 22 : 13}%, var(--border))`
              }`,
              boxShadow: active
                ? `inset 0 1px 0 color-mix(in srgb, ${colour} 16%, transparent), 0 8px 22px color-mix(in srgb, ${colour} 9%, transparent)`
                : "inset 0 1px 0 color-mix(in srgb, white 3%, transparent)",
            }}
          >
            <span className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 flex-none rounded-full"
                style={
                  danger
                    ? {
                        border: `1.5px dashed ${colour}`,
                        background: active
                          ? `color-mix(in srgb, ${colour} 18%, transparent)`
                          : "transparent",
                      }
                    : {
                        background: colour,
                        boxShadow: active
                          ? `0 0 0 3px color-mix(in srgb, ${colour} 12%, transparent)`
                          : `0 0 8px color-mix(in srgb, ${colour} 18%, transparent)`,
                      }
                }
              />
              <span className="min-w-0 flex flex-1 items-center justify-between gap-3">
                <span
                  className="flex-none text-sm font-semibold leading-5"
                  style={{ color: active ? colour : "var(--text)" }}
                >
                  {label}
                </span>
                <span className="min-w-0 text-right text-xs leading-4" style={{ color: "var(--text2)" }}>
                  {hint}
                </span>
                <span
                  data-status-check={active ? s : undefined}
                  className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full transition-opacity duration-100 motion-reduce:transition-none"
                  style={{
                    opacity: active ? 1 : 0,
                    color: colour,
                    background: `color-mix(in srgb, ${colour} 13%, var(--surface3))`,
                    border: `1px solid color-mix(in srgb, ${colour} 36%, var(--border))`,
                  }}
                  aria-hidden="true"
                >
                  <Check size={11} weight="bold" />
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
