"use client";
import { useState } from "react";
import { parseDurationMinutes, formatDurationMinutes } from "@/lib/timeUtils";

interface DurationStepperProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

const PRESETS = [15, 30, 60];

export default function DurationStepper({ value, onChange, disabled = false }: DurationStepperProps) {
  const parsed = parseDurationMinutes(value);
  const [interacted, setInteracted] = useState(false);

  // Raw free-text fallback until the user first touches this stepper
  const showRaw = !interacted && parsed === null && value.trim() !== "";
  const currentMinutes = parsed;

  function set(m: number) {
    if (disabled) return;
    setInteracted(true);
    onChange(formatDurationMinutes(m));
  }

  function nudge(delta: number) {
    if (disabled) return;
    setInteracted(true);
    const base = parsed ?? 30;
    const next = Math.max(5, base + delta);
    onChange(formatDurationMinutes(next));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((p) => (
        <button
          key={p}
          type="button"
          disabled={disabled}
          onClick={() => set(p)}
          aria-pressed={currentMinutes === p && !showRaw}
          className="focus-ring min-h-11 px-3 py-1.5 rounded-full text-sm font-medium border disabled:opacity-50"
          style={
            currentMinutes === p && !showRaw
              ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)", borderColor: "var(--accent-fill)" }
              : { color: "var(--text2)", borderColor: "var(--border)" }
          }
        >
          {formatDurationMinutes(p)}
        </button>
      ))}
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => nudge(-5)}
          aria-label="5 minuten minder"
          className="focus-ring rounded-lg text-sm font-medium border disabled:opacity-50"
          style={{ color: "var(--text2)", borderColor: "var(--border)", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          −5
        </button>
        {showRaw && (
          <span className="text-sm px-2 py-2" style={{ color: "var(--text2)" }}>{value}</span>
        )}
        {!showRaw && currentMinutes !== null && !PRESETS.includes(currentMinutes) && (
          <span className="text-sm tabular-nums px-2 py-2" style={{ color: "var(--text)" }}>
            {formatDurationMinutes(currentMinutes)}
          </span>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => nudge(5)}
          aria-label="5 minuten meer"
          className="focus-ring rounded-lg text-sm font-medium border disabled:opacity-50"
          style={{ color: "var(--text2)", borderColor: "var(--border)", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          +5
        </button>
      </div>
    </div>
  );
}
