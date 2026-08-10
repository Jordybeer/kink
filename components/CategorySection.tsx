"use client";
import { useState } from "react";
import { ArrowUp, CaretDown, CaretRight } from "@phosphor-icons/react";
import type { Kink, KinkCategoryId, KinkEntry } from "@/types";
import { kinkCategoryLabel } from "@/lib/kinkCategories";
import KinkListRow from "./KinkListRow";

interface Props {
  category: KinkCategoryId;
  kinks: Kink[];
  entries: Record<string, KinkEntry>;
  onEdit: (kink: Kink) => void;
  onExplore: () => void;
}

const MAX_PIPS = 12;

function countFilled(kinks: Kink[], entries: Record<string, KinkEntry>) {
  return kinks.filter((k) => entries[k.id]?.status != null).length;
}

export default function CategorySection({
  category, kinks, entries,
  onEdit, onExplore,
}: Props) {
  const filled = countFilled(kinks, entries);
  const [open, setOpen] = useState(() => filled > 0);
  const unratedCount = kinks.length - filled;
  const pipCount = Math.min(kinks.length, MAX_PIPS);
  const filledPips = Math.round((filled / kinks.length) * pipCount);
  const overflow = kinks.length > MAX_PIPS ? `+${kinks.length - MAX_PIPS}` : null;
  const label = kinkCategoryLabel(category);
  const headingId = `category-${category}`;

  return (
    <section className="mb-3" aria-labelledby={headingId}>
      <div
        className="sticky z-[5] flex items-center rounded-2xl transition-colors"
        style={{
          top: "calc(var(--nav-h) + var(--profile-subnav-h))",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderLeft: open ? "4px solid var(--accent)" : "4px solid transparent",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={`${headingId}-content`}
          className="focus-ring flex min-h-12 flex-1 items-center gap-2 px-3 py-2.5 text-left min-w-0"
        >
          <span className="text-[var(--accent)] flex-none">
            {open ? <CaretDown aria-hidden="true" size={16} /> : <CaretRight aria-hidden="true" size={16} />}
          </span>
          <h2
            id={headingId}
            className="text-base flex-1 text-left truncate"
            style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
          >
            {label}
          </h2>
          <div className="flex items-center gap-1.5 flex-none" aria-label={`${filled} van ${kinks.length} beoordeeld`}>
            <div className="flex gap-0.5 items-center" aria-hidden="true">
              {Array.from({ length: pipCount }, (_, index) => (
                <div
                  key={index}
                  className="w-1.5 h-1.5 rounded-full transition-colors"
                  style={{ background: index < filledPips ? "var(--accent)" : "var(--border)" }}
                />
              ))}
              {overflow && <span className="text-xs ml-0.5" style={{ color: "var(--text2)" }}>{overflow}</span>}
            </div>
            <span className="text-xs tabular-nums" style={{ color: "var(--text2)" }}>
              {filled}/{kinks.length}
            </span>
          </div>
        </button>
        {unratedCount > 0 && (
          <button
            type="button"
            onClick={onExplore}
            aria-label={`Meer uit ${label} beoordelen`}
            className="focus-ring mr-2 min-h-11 flex-none rounded-full px-3 text-xs transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor = "var(--accent)";
              event.currentTarget.style.color = "var(--accent-text)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor = "var(--border)";
              event.currentTarget.style.color = "var(--text2)";
            }}
          >
            Meer
          </button>
        )}
      </div>

      <div id={`${headingId}-content`} className={`accordion-content ${open ? "open" : ""}`}>
        <div className="accordion-inner">
          <div className="mt-1 flex flex-col pl-1">
            {kinks
              .filter((kink) => entries[kink.id]?.status != null)
              .map((kink) => (
                <KinkListRow
                  key={kink.id}
                  kink={kink}
                  entry={entries[kink.id]}
                  onOpen={() => onEdit(kink)}
                />
              ))}
            {unratedCount > 0 && (
              <button
                type="button"
                onClick={onExplore}
                className="focus-ring w-full min-h-12 rounded-xl mb-1 px-3 flex items-center gap-2 text-left transition-colors"
                style={{
                  border: "1px dashed color-mix(in srgb, var(--accent) 45%, transparent)",
                  color: "var(--accent-text)",
                  background: "transparent",
                }}
              >
                <span className="flex-1 text-xs font-medium">
                  Nog <span className="tabular-nums">{unratedCount}</span> onbeantwoord
                </span>
                <span className="inline-flex items-center gap-1 text-xs"><ArrowUp size={12} aria-hidden="true" />meer uit deze categorie</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
