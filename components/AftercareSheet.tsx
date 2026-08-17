"use client";
import { useState } from "react";
import type { AftercareEntry } from "@/types";
import Sheet, { SheetContent } from "@/components/Sheet";

interface AftercareSheetProps {
  onSave: (entry: AftercareEntry) => void;
  onClose: () => void;
  existing?: AftercareEntry;
}

const LIGHTS = [
  { value: "green" as const, label: "Geweldig", color: "var(--yes)" },
  { value: "amber" as const, label: "Goed, maar…", color: "var(--maybe)" },
  { value: "red" as const, label: "Zwaar", color: "var(--hard-no)" },
];

export default function AftercareSheet({ onSave, onClose, existing }: AftercareSheetProps) {
  const [light, setLight] = useState<AftercareEntry["trafficLight"] | null>(existing?.trafficLight ?? null);
  const [wentWell, setWentWell] = useState(existing?.wentWell ?? "");
  const [remember, setRemember] = useState(existing?.remember ?? "");

  function handleSave() {
    if (!light) return;
    onSave({ trafficLight: light, wentWell, remember, completedAt: existing?.completedAt ?? Date.now() });
  }

  return (
    <Sheet open onClose={onClose} scrollable aria-label={existing ? "Aftercare bewerken" : "Aftercare check-in"}>
      <SheetContent className="max-h-[88dvh] overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <h2 className="text-lg font-bold mb-5">{existing ? "Aftercare bewerken" : "Aftercare check-in"}</h2>

        <div>
          <p className="text-sm mb-3" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", color: "var(--text2)" }}>
            Hoe voelde het?
          </p>
          <div className="flex gap-3">
            {LIGHTS.map(({ value, label, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setLight(value)}
                aria-pressed={light === value}
                className="focus-ring flex-1 flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all"
                style={{
                  minHeight: 80,
                  borderColor: light === value ? color : "var(--border)",
                  background: light === value ? `color-mix(in srgb, ${color} 12%, transparent)` : "transparent",
                }}
              >
                <span
                  className="w-6 h-6 rounded-full"
                  style={{ background: color, boxShadow: light === value ? `0 0 14px ${color}` : "none" }}
                  aria-hidden="true"
                />
                <span className="text-xs" style={{ color: light === value ? "var(--text)" : "var(--text2)" }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-5">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text2)" }}>Wat werkte goed?</label>
            <textarea
              rows={2}
              value={wentWell}
              onChange={(event) => setWentWell(event.target.value)}
              placeholder="Bijvoorbeeld het tempo of de communicatie…"
              className="focus-ring w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none resize-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text2)" }}>Onthouden voor volgende keer</label>
            <textarea
              rows={2}
              value={remember}
              onChange={(event) => setRemember(event.target.value)}
              placeholder="Bijvoorbeeld meer tijd nemen voor…"
              className="focus-ring w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none resize-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring min-h-12 rounded-xl text-sm font-semibold"
            style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
          >
            Annuleer
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!light}
            className="focus-ring min-h-12 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            {existing ? "Bijwerken" : "Opslaan"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
