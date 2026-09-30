"use client";
import { useState, useEffect, useRef } from "react";
import { formatTime, parseTime } from "@/lib/timeUtils";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function TimePicker({ value, onChange, disabled = false }: TimePickerProps) {
  const parsed = parseTime(value);
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(parsed?.hour ?? 20);
  const [minute, setMinute] = useState(parsed?.minute ?? 0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const p = parseTime(value);
    if (p) { setHour(p.hour); setMinute(p.minute); }
  }, [value]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  function confirm() {
    if (disabled) return;
    onChange(formatTime(hour, minute));
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div className="relative flex-none">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label="Tijd kiezen"
        className="focus-ring rounded-lg px-2 text-sm tabular-nums disabled:opacity-50"
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

      {open && !disabled && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed z-50 rounded-xl p-4 shadow-xl max-w-xs"
            role="dialog"
            aria-labelledby="time-picker-label"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "calc(100vw - 2rem)",
              maxWidth: 288,
            }}
          >
            <p id="time-picker-label" className="text-sm mb-3" style={{ color: "var(--text2)" }}>
              Starttijd
            </p>
            <div className="flex gap-3">
              {/* Hour grid: 4 cols × 6 rows */}
              <div className="grid grid-cols-4 gap-1 flex-1">
                {Array.from({ length: 24 }, (_, h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHour(h)}
                    aria-pressed={hour === h}
                    className="focus-ring min-h-11 rounded-lg py-2 text-sm tabular-nums font-medium"
                    style={
                      hour === h
                        ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)" }
                        : { background: "var(--surface2)", color: "var(--text2)" }
                    }
                  >
                    {String(h).padStart(2, "0")}
                  </button>
                ))}
              </div>
              {/* Minute column */}
              <div className="flex flex-col gap-1">
                {[0, 15, 30, 45].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinute(m)}
                    aria-pressed={minute === m}
                    className="focus-ring min-h-11 rounded-lg py-2 px-2 text-sm tabular-nums font-medium"
                    style={
                      minute === m
                        ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)" }
                        : { background: "var(--surface2)", color: "var(--text2)" }
                    }
                  >
                    :{String(m).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-base tabular-nums font-semibold" style={{ color: "var(--text)" }}>
                {formatTime(hour, minute)}
              </span>
              <button
                type="button"
                onClick={confirm}
                className="focus-ring min-h-11 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
              >
                Bevestigen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
