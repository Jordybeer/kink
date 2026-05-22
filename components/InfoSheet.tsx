"use client";
import type { Kink } from "@/types";

interface Props {
  kink: Kink | null;
  onClose: () => void;
}

const LEVEL_BADGE: Record<1 | 2 | 3 | 4, { label: string; bg: string; color: string }> = {
  1: { label: "Niveau 1", bg: "rgba(74,222,128,0.15)",  color: "#4ade80" },
  2: { label: "Niveau 2", bg: "rgba(96,165,250,0.15)",  color: "#60a5fa" },
  3: { label: "Niveau 3", bg: "rgba(251,191,36,0.15)",  color: "#fbbf24" },
  4: { label: "Niveau 4", bg: "rgba(192,132,252,0.15)", color: "#c084fc" },
};

export default function InfoSheet({ kink, onClose }: Props) {
  const open = kink !== null;
  const badge = kink ? LEVEL_BADGE[kink.level] : null;

  return (
    <>
      <div
        className={`sheet-overlay ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`sheet-panel ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={kink?.name ?? "Kink informatie"}
      >
        <div
          className="rounded-t-2xl p-6"
          style={{ background: "var(--surface)" }}
        >
          {/* Drag handle */}
          <div
            className="w-10 h-1 rounded-full mx-auto mb-5"
            style={{ background: "var(--border)" }}
          />

          {badge && (
            <span
              className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-3 border"
              style={{ background: badge.bg, color: badge.color, borderColor: badge.color }}
            >
              {badge.label}
            </span>
          )}

          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>
            {kink?.name ?? ""}
          </h2>

          <p
            className="text-xs uppercase tracking-widest mb-4"
            style={{ color: "var(--text2)" }}
          >
            {kink?.category ?? ""}
          </p>

          <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text)" }}>
            {kink?.description ?? "Geen beschrijving beschikbaar."}
          </p>

          <button
            onClick={onClose}
            className="focus-ring w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Sluit
          </button>
        </div>
      </div>
    </>
  );
}
