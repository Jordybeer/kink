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
      role="group"
      aria-label="Status kiezen"
      className="border-y"
      style={{ borderColor: "var(--border)" }}
    >
      {OPTIONS.map(({ status, label, hint, danger }, index) => {
        const active = current === status;
        const colour = STATUS_VAR[status];
        return (
          <button
            key={status}
            type="button"
            data-tour={danger ? "hard-no" : undefined}
            onClick={() => { if (!active) onSelect(status); }}
            aria-pressed={active}
            className="focus-ring flex min-h-[52px] w-full items-center gap-3 px-1 py-2 text-left transition-colors duration-150"
            style={{
              borderTop: index > 0 ? "1px solid color-mix(in srgb, var(--border) 72%, transparent)" : undefined,
              background: active
                ? `color-mix(in srgb, ${colour} ${danger ? 5 : 6}%, var(--surface))`
                : "transparent",
            }}
          >
            <span
              data-status-indicator={status}
              aria-hidden="true"
              className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full"
              style={{
                color: active ? "var(--bg)" : colour,
                background: active ? colour : "transparent",
                border: active
                  ? `1px solid ${colour}`
                  : `1px ${danger ? "dashed" : "solid"} color-mix(in srgb, ${colour} 62%, var(--border))`,
              }}
            >
              {active
                ? <Check size={11} weight="bold" />
                : <span className="h-2 w-2 rounded-full" style={{ background: danger ? "transparent" : colour }} />}
            </span>

            <span className="min-w-0 flex-1">
              <span
                className="block text-sm font-semibold leading-5"
                style={{ color: danger && active ? "var(--hard-no-text)" : "var(--text)" }}
              >
                {label}
              </span>
              <span
                data-status-hint={status}
                className="mt-0.5 block text-[13px] leading-4"
                style={{ color: active ? "color-mix(in srgb, var(--text) 25%, var(--text2))" : "var(--text2)" }}
              >
                {hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
