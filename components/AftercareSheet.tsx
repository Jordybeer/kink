"use client";
import { useState } from "react";
import type { AftercareEntry } from "@/types";

interface AftercareSheetProps {
  onSave: (entry: AftercareEntry) => void;
  onClose: () => void;
  existing?: AftercareEntry;
}

const LIGHTS = [
  { value: "green" as const, label: "Geweldig",    color: "var(--yes)",     emoji: "🟢" },
  { value: "amber" as const, label: "Goed, maar…", color: "var(--maybe)",   emoji: "🟡" },
  { value: "red"   as const, label: "Zwaar",        color: "var(--hard-no)", emoji: "🔴" },
];

export default function AftercareSheet({ onSave, onClose, existing }: AftercareSheetProps) {
  const [light, setLight]       = useState<AftercareEntry["trafficLight"] | null>(existing?.trafficLight ?? null);
  const [wentWell, setWentWell] = useState(existing?.wentWell ?? "");
  const [remember, setRemember] = useState(existing?.remember ?? "");

  function handleSave() {
    if (!light) return;
    onSave({ trafficLight: light, wentWell, remember, completedAt: existing?.completedAt ?? Date.now() });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl p-6 pb-10 flex flex-col gap-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">{existing ? "Aftercare bewerken" : "Aftercare check-in"}</h2>
          <button onClick={onClose} className="focus-ring rounded-lg" style={{ minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }} aria-label="Sluiten">✕</button>
        </div>

        {/* Traffic light */}
        <div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text2)" }}>Hoe voelde het?</p>
          <div className="flex gap-3">
            {LIGHTS.map(({ value, label, color, emoji }) => (
              <button
                key={value}
                onClick={() => setLight(value)}
                aria-pressed={light === value}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all focus-ring"
                style={light === value
                  ? { borderColor: color, background: `color-mix(in srgb, ${color} 12%, transparent)` }
                  : { borderColor: "var(--border)", background: "transparent" }}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-xs" style={{ color: light === value ? "var(--text)" : "var(--text2)" }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tekstvelden */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text2)" }}>Wat werkte goed?</label>
            <textarea
              rows={2}
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              placeholder="Bijv. het tempo, de communicatie…"
              className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none resize-none focus-ring"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text2)" }}>Onthouden voor volgende keer</label>
            <textarea
              rows={2}
              value={remember}
              onChange={(e) => setRemember(e.target.value)}
              placeholder="Bijv. meer time voor…"
              className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none resize-none focus-ring"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!light}
          className="w-full py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40 focus-ring"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {existing ? "Bijwerken" : "Opslaan"}
        </button>
      </div>
    </div>
  );
}
