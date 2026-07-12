"use client";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Star } from "@phosphor-icons/react";
import { useMotionSafe } from "@/lib/motion";
import type { Kink, KinkEntry, KinkStatus } from "@/types";
import StatusOptionRows from "./StatusOptionRows";
import InfoSheet from "./InfoSheet";
import ClampText from "./ui/ClampText";

interface Props {
  kinks: Kink[]; // ordered, level-filtered — the full visible deck
  entries: Record<string, KinkEntry>;
  focusCategory?: string | null;
  onStatusChange: (kinkId: string, s: KinkStatus) => void;
  onCuriousChange: (kinkId: string, v: boolean) => void;
}

// One desire at a time. Unrated kinks queue up; a verdict lands, the card
// bows out, the next steps into the light. Skips stay session-local — the
// store never hears about hesitation.
export default function TriageDeck({
  kinks, entries, focusCategory,
  onStatusChange, onCuriousChange,
}: Props) {
  const t = useMotionSafe();
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  // Holds the just-rated card on stage for a beat so the choice is seen landing.
  const [holding, setHolding] = useState<string | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const unrated = kinks.filter((k) => entries[k.id]?.status == null && !skipped.has(k.id));
  const focused = focusCategory ? unrated.filter((k) => k.category === focusCategory) : [];
  const queue = focused.length ? focused : unrated;

  const held = holding ? kinks.find((k) => k.id === holding) : null;
  const current = held ?? queue[0] ?? null;

  function handleSelect(kink: Kink, s: KinkStatus) {
    onStatusChange(kink.id, s);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (s == null) {
      setHolding(null);
      return;
    }
    setHolding(kink.id);
    holdTimer.current = setTimeout(() => setHolding(null), 340);
  }

  function skip(kink: Kink) {
    setHolding(null);
    setSkipped((prev) => new Set(prev).add(kink.id));
  }

  const remainingInCat = current
    ? queue.filter((k) => k.category === current.category).length
    : 0;
  const totalDone = kinks.filter((k) => entries[k.id]?.status != null).length;

  return (
    <div aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {current ? (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={t.fast}
            className="rounded-2xl p-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-accent)",
            }}
          >
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs truncate" style={{ color: "var(--text2)" }}>
                {current.category} · <span className="tabular-nums">nog {remainingInCat}</span>
              </p>
              <button
                data-tour="curious"
                onClick={() => onCuriousChange(current.id, !entries[current.id]?.curious)}
                aria-pressed={!!entries[current.id]?.curious}
                aria-label={entries[current.id]?.curious ? "Verwijder nieuwsgierig markering" : "Markeer als nieuwsgierig"}
                className="focus-ring rounded-full border transition-colors text-xs px-2.5 min-h-9 inline-flex items-center gap-1 flex-none"
                style={
                  entries[current.id]?.curious
                    ? { background: "color-mix(in srgb, var(--curious) 20%, transparent)", borderColor: "var(--curious)", color: "var(--curious)" }
                    : { background: "var(--tag-muted)", borderColor: "var(--border)", color: "var(--text2)" }
                }
              >
                <Star size={11} weight={entries[current.id]?.curious ? "fill" : "regular"} aria-hidden="true" />
                Nieuwsgierig
              </button>
              <button
                data-tour="info"
                onClick={() => setInfoOpen(true)}
                aria-label={`Informatie over ${current.name}`}
                className="focus-ring w-9 h-9 flex items-center justify-center rounded-lg flex-none"
                style={{ background: "var(--info-ghost)", color: "var(--text2)" }}
              >
                <Info size={15} aria-hidden="true" />
              </button>
            </div>

            <h3
              className="text-2xl mt-1 leading-tight"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
            >
              {current.name}
            </h3>
            {current.description && (
              <ClampText
                text={current.description}
                className="text-sm mt-1 mb-3"
                style={{ color: "var(--text2)" }}
              />
            )}
            {!current.description && <div className="mb-3" />}

            <StatusOptionRows
              current={entries[current.id]?.status ?? null}
              onSelect={(s) => handleSelect(current, s)}
            />

            <div className="flex items-center mt-2">
              <span className="flex-1 text-xs tabular-nums" style={{ color: "var(--text2)" }}>
                {totalDone} van {kinks.length} beoordeeld
              </span>
              <button
                onClick={() => skip(current)}
                className="focus-ring h-9 px-3 rounded-lg text-xs transition-colors"
                style={{ color: "var(--text2)" }}
              >
                Sla over →
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="deck-done"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={t.fast}
            className="rounded-2xl p-5 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p
              className="text-lg italic"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--text)" }}
            >
              {skipped.size > 0 ? "Voor nu klaar." : "Alles beoordeeld."}
            </p>
            <p className="text-xs mt-1 tabular-nums" style={{ color: "var(--text2)" }}>
              {totalDone} van {kinks.length} — tik een kink hieronder om bij te stellen.
            </p>
            {skipped.size > 0 && (
              <button
                onClick={() => setSkipped(new Set())}
                className="focus-ring mt-3 h-9 px-4 rounded-lg text-xs border transition-colors"
                style={{ color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)" }}
              >
                {skipped.size} overgeslagen — toon opnieuw
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <InfoSheet kink={infoOpen && current ? current : null} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
