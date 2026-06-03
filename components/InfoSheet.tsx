"use client";
import type { Kink } from "@/types";
import Sheet, { SheetContent } from "./Sheet";

interface Props {
  kink: Kink | null;
  onClose: () => void;
}

const LEVEL_BADGE: Record<1 | 2 | 3 | 4, { label: string; colorVar: string }> = {
  1: { label: "Niveau 1", colorVar: "var(--yes)" },
  2: { label: "Niveau 2", colorVar: "var(--willing)" },
  3: { label: "Niveau 3", colorVar: "var(--maybe)" },
  4: { label: "Niveau 4", colorVar: "var(--accent)" },
};

export default function InfoSheet({ kink, onClose }: Props) {
  const badge = kink ? LEVEL_BADGE[kink.level] : null;

  return (
    <Sheet open={kink !== null} onClose={onClose} aria-label={kink?.name ?? "Kink informatie"}>
      <SheetContent>
        {badge && (
          <span
            className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-3 border"
            style={{
              background: `color-mix(in srgb, ${badge.colorVar} 15%, transparent)`,
              color: badge.colorVar,
              borderColor: `color-mix(in srgb, ${badge.colorVar} 40%, transparent)`,
            }}
          >
            {badge.label}
          </span>
        )}

        <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>
          {kink?.name ?? ""}
        </h2>

        <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--text2)" }}>
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
      </SheetContent>
    </Sheet>
  );
}
