"use client";
import type { Kink } from "@/types";
import { kinkCategoryLabel } from "@/lib/kinkCategories";
import Sheet, { SheetContent } from "./Sheet";

interface Props {
  kink: Kink | null;
  onClose: () => void;
}

export default function InfoSheet({ kink, onClose }: Props) {
  return (
    <Sheet open={kink !== null} onClose={onClose} aria-label={kink?.name ?? "Kink informatie"}>
      <SheetContent>
        <p className="text-xs mb-0.5" style={{ color: "var(--text2)" }}>
          {kink ? kinkCategoryLabel(kink.category) : ""}
        </p>
        <h2
          className="text-xl italic leading-tight mb-2"
          style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
        >
          {kink?.name ?? ""}
        </h2>

        {/* Levels are depth markers, not verdicts — they wear neutral, never a
            status colour. Intensity speaks through the filled dots. */}
        {kink && (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full mb-4 border"
            style={{ background: "var(--tag-muted)", borderColor: "var(--border)", color: "var(--text2)" }}
          >
            <span className="inline-flex gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4].map((l) => (
                <span
                  key={l}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: l <= kink.level ? "var(--text2)" : "transparent",
                    border: "1px solid var(--text2)",
                    opacity: l <= kink.level ? 1 : 0.4,
                  }}
                />
              ))}
            </span>
            Niveau {kink.level}
          </span>
        )}

        <p className="text-base leading-relaxed mb-6" style={{ color: "var(--text)" }}>
          {kink?.description ?? "Geen beschrijving beschikbaar."}
        </p>

        <button
          onClick={onClose}
          className="focus-ring min-h-11 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ border: "1px solid var(--border)", color: "var(--text)" }}
        >
          Sluit
        </button>
      </SheetContent>
    </Sheet>
  );
}
