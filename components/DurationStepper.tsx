"use client";
import { useState } from "react";
import { parseDurationMinutes, formatDurationMinutes } from "@/lib/timeUtils";

interface DurationStepperProps {
  value: string;
  onChange: (v: string) => void;
}

const PRESETS = [15, 30, 60];

export default function DurationStepper({ value, onChange }: DurationStepperProps) {
  const parsed = parseDurationMinutes(value);
  const [interacted, setInteracted] = useState(false);

  // Raw free-text fallback until the user first touches this stepper
  const showRaw = !interacted && parsed === null && value.trim() !== "";
  const currentMinutes = parsed;

  function set(m: number) {
    setInteracted(true);
    onChange(formatDurationMinutes(m));
  }

  function nudge(delta: number) {
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
          onClick={() => set(p)}
          aria-pressed={currentMinutes === p && !showRaw}
          className="focus-ring px-3 py-1.5 rounded-full text-xs font-medium border"
          style={
            currentMinutes === p && !showRaw
              ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
              : { color: "var(--text2)", borderColor: "var(--border)" }
          }
        >
          {formatDurationMinutes(p)}
        </button>
      ))}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => nudge(-5)}
          aria-label="5 minuten minder"
          className="focus-ring rounded text-xs font-medium border"
          style={{ color: "var(--text2)", borderColor: "var(--border)", minWidth: 40, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          −5
        </button>
        {showRaw && (
          <span className="text-xs px-2 py-2" style={{ color: "var(--text2)" }}>{value}</span>
        )}
        {!showRaw && currentMinutes !== null && !PRESETS.includes(currentMinutes) && (
          <span className="text-xs tabular-nums px-2 py-2" style={{ color: "var(--text)" }}>
            {formatDurationMinutes(currentMinutes)}
          </span>
        )}
        <button
          type="button"
          onClick={() => nudge(5)}
          aria-label="5 minuten meer"
          className="focus-ring rounded text-xs font-medium border"
          style={{ color: "var(--text2)", borderColor: "var(--border)", minWidth: 40, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          +5
        </button>
      </div>
    </div>
  );
}
