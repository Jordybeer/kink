"use client";
import { useState, useEffect } from "react";
import { formatTime, parseTime } from "@/lib/timeUtils";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TimePicker({ value, onChange }: TimePickerProps) {
  const parsed = parseTime(value);
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(parsed?.hour ?? 20);
  const [minute, setMinute] = useState(parsed?.minute ?? 0);

  useEffect(() => {
    const p = parseTime(value);
    if (p) { setHour(p.hour); setMinute(p.minute); }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  function confirm() {
    onChange(formatTime(hour, minute));
    setOpen(false);
  }

  return (
    <div className="relative flex-none">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Tijd kiezen"
        className="focus-ring rounded-lg px-2 tabular-nums"
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          color: value ? "var(--text)" : "var(--text2)",
          fontSize: 12,
          height: 36,
          minWidth: 60,
        }}
      >
        {value || "--:--"}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed z-50 rounded-xl p-4 shadow-xl"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 288,
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text2)" }}>
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
                    className="focus-ring rounded py-1.5 text-xs tabular-nums font-medium"
                    style={
                      hour === h
                        ? { background: "var(--accent)", color: "#000" }
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
                    className="focus-ring rounded py-1.5 px-2 text-xs tabular-nums font-medium"
                    style={
                      minute === m
                        ? { background: "var(--accent)", color: "#000" }
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
                className="focus-ring px-4 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "var(--accent)", color: "#000" }}
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
