"use client";
import { useState, useEffect } from "react";
import Sheet from "@/components/Sheet";
import { formatTime, parseTime } from "@/lib/timeUtils";

interface TimePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function TimePicker({ id, value, onChange, disabled = false }: TimePickerProps) {
  const parsed = parseTime(value);
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(parsed?.hour ?? 20);
  const [minute, setMinute] = useState(parsed?.minute ?? 0);

  useEffect(() => {
    const p = parseTime(value);
    if (p) { setHour(p.hour); setMinute(p.minute); }
  }, [value]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  function confirm() {
    if (disabled) return;
    onChange(formatTime(hour, minute));
    setOpen(false);
  }

  return (
    <div className="relative flex-none">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open && !disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label={id ? undefined : "Tijd kiezen"}
        className="ks-motion-choice focus-ring rounded-lg px-2 text-sm tabular-nums disabled:opacity-50"
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          color: value ? "var(--text)" : "var(--text2)",
          height: 44,
          minWidth: 60,
        }}
      >
        {value || "--:--"}
      </button>

      <Sheet
        open={open && !disabled}
        onClose={() => setOpen(false)}
        title="Starttijd"
        variant="task"
        scrollable
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-base tabular-nums font-semibold" style={{ color: "var(--text)" }}>
              {formatTime(hour, minute)}
            </span>
            <button
              type="button"
              onClick={confirm}
              className="ks-motion-choice focus-ring min-h-11 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
            >
              Bevestigen
            </button>
          </div>
        }
      >
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-medium" style={{ color: "var(--text2)" }}>Uur</legend>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(44px,1fr))] gap-1">
            {Array.from({ length: 24 }, (_, h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHour(h)}
                aria-pressed={hour === h}
                className="ks-motion-choice focus-ring min-h-11 min-w-[44px] rounded-lg py-2 text-sm tabular-nums font-medium"
                style={hour === h
                  ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)" }
                  : { background: "var(--surface2)", color: "var(--text2)" }}
              >
                {String(h).padStart(2, "0")}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-4 min-w-0">
          <legend className="mb-2 text-sm font-medium" style={{ color: "var(--text2)" }}>Minuten</legend>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(max(44px,3ch),1fr))] gap-1">
            {[0, 15, 30, 45].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinute(m)}
                aria-pressed={minute === m}
                className="ks-motion-choice focus-ring min-h-11 min-w-[44px] rounded-lg py-2 text-sm tabular-nums font-medium"
                style={minute === m
                  ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)" }
                  : { background: "var(--surface2)", color: "var(--text2)" }}
              >
                :{String(m).padStart(2, "0")}
              </button>
            ))}
          </div>
        </fieldset>
      </Sheet>
    </div>
  );
}
