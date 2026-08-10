"use client";
import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TAP_SPRING, useMotionSafe } from "@/lib/motion";
import { ArrowUp, CaretDown, CaretRight } from "@phosphor-icons/react";
import type { Kink, KinkCategoryId, KinkEntry } from "@/types";
import { kinkCategoryLabel } from "@/lib/kinkCategories";
import KinkListRow from "./KinkListRow";

interface Props {
  category: KinkCategoryId;
  kinks: Kink[];
  entries: Record<string, KinkEntry>;
  onEdit: (kink: Kink) => void;
  onTriage: () => void;
  onBulkSkip: () => void;
  onBulkRestore?: (snapshot: Record<string, KinkEntry>) => void;
}

const MAX_PIPS = 12;

function countFilled(kinks: Kink[], entries: Record<string, KinkEntry>) {
  return kinks.filter((k) => entries[k.id]?.status != null).length;
}

export default function CategorySection({
  category, kinks, entries,
  onEdit, onTriage,
  onBulkSkip, onBulkRestore,
}: Props) {
  const t = useMotionSafe();
  const [open, setOpen] = useState(true);
  const [undoPending, setUndoPending] = useState(false);
  const undoSnapshot = useRef<Record<string, KinkEntry>>({});
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filled = countFilled(kinks, entries);
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
        <button
          type="button"
          onClick={() => {
            const snapshot: Record<string, KinkEntry> = {};
            for (const kink of kinks) snapshot[kink.id] = entries[kink.id] ?? { status: null, comment: "" };
            undoSnapshot.current = snapshot;
            onBulkSkip();
            setUndoPending(true);
            if (undoTimer.current) clearTimeout(undoTimer.current);
            undoTimer.current = setTimeout(() => setUndoPending(false), 3000);
          }}
          aria-label={`Alle kinks in ${label} overslaan`}
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
          Sla over
        </button>
      </div>

      <AnimatePresence>
        {undoPending && onBulkRestore && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={t.fast}
            className="fixed bottom-20 left-4 right-4 z-[300] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg"
            style={{ background: "var(--surface2)", border: "1px solid var(--border-accent)", maxWidth: "28rem", margin: "0 auto" }}
          >
            <span className="flex-1 text-sm" style={{ color: "var(--text2)" }}>Categorie overgeslagen.</span>
            <motion.button
              type="button"
              onClick={() => {
                onBulkRestore(undoSnapshot.current);
                setUndoPending(false);
                if (undoTimer.current) clearTimeout(undoTimer.current);
              }}
              whileTap={TAP_SPRING}
              className="focus-ring min-h-11 flex-none px-2 text-sm font-semibold"
              style={{ color: "var(--accent-text)" }}
            >
              Ongedaan maken
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

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
                onClick={onTriage}
                className="focus-ring w-full min-h-12 rounded-xl mb-1 px-3 flex items-center gap-2 text-left transition-colors"
                style={{
                  border: "1px dashed color-mix(in srgb, var(--accent) 45%, transparent)",
                  color: "var(--accent-text)",
                  background: "transparent",
                }}
              >
                <span className="flex-1 text-xs font-medium">
                  Nog <span className="tabular-nums">{unratedCount}</span> te beoordelen
                </span>
                <span className="inline-flex items-center gap-1 text-xs"><ArrowUp size={12} aria-hidden="true" />verder in de stapel</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
