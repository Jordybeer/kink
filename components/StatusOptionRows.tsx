"use client";
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
      className="mt-3 grid grid-cols-2 gap-2"
      role="group"
      aria-label="Status kiezen"
    >
      {OPTIONS.map(({ status: s, label, hint, danger }) => {
        const active = current === s;
        const colour = STATUS_VAR[s];

        return (
          <button
            key={s}
            data-tour={danger ? "hard-no" : undefined}
            onClick={() => onSelect(active ? null : s)}
            aria-pressed={active}
            className={`focus-ring min-h-16 rounded-xl px-3 py-2.5 text-left transition-colors ${danger ? "col-span-2" : ""}`}
            style={{
              color: "var(--text)",
              background: active
                ? `color-mix(in srgb, ${colour} 13%, var(--surface2))`
                : "var(--surface2)",
              border: `1px ${danger ? "dashed" : "solid"} ${
                active
                  ? `color-mix(in srgb, ${colour} 72%, var(--border))`
                  : "var(--border)"
              }`,
            }}
          >
            <span className={`flex gap-2.5 ${danger ? "items-center" : "items-start"}`}>
              <span
                aria-hidden="true"
                className="mt-1 h-2.5 w-2.5 flex-none rounded-full"
                style={
                  danger
                    ? { border: `1.5px dashed ${colour}`, background: "transparent" }
                    : {
                        background: colour,
                        boxShadow: active
                          ? `0 0 0 3px color-mix(in srgb, ${colour} 14%, transparent)`
                          : "none",
                      }
                }
              />
              <span className={`min-w-0 ${danger ? "flex flex-1 items-baseline justify-between gap-3" : ""}`}>
                <span
                  className="block text-sm font-semibold leading-5"
                  style={{ color: active ? colour : "var(--text)" }}
                >
                  {label}
                </span>
                <span
                  className={`${danger ? "text-right" : "mt-0.5 block"} text-xs leading-4`}
                  style={{ color: "var(--text2)" }}
                >
                  {hint}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
