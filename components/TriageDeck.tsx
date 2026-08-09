"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Circle, Eye, EyeSlash, Star, WarningCircle } from "@phosphor-icons/react";
import type { Kink, KinkEntry, KinkStatus } from "@/types";
import { KINKS } from "@/lib/kinks";
import {
  selectConversationQuestion,
  type QuestionnaireQueueItem,
} from "@/lib/questionnaireEngine";
import StatusOptionRows from "./StatusOptionRows";
import InfoSheet from "./InfoSheet";

const AGREEMENTS = [
  { value: "vraag eerst", label: "Eerst vragen", emphasized: true },
  { value: "eerste keer", label: "Eerste keer", emphasized: false },
] as const;

const CARD_FEEDBACK_MS = 200;
const CARD_FADE_SECONDS = 0.17;

interface Props {
  kinks: Kink[];
  queueItems?: QuestionnaireQueueItem[];
  entries: Record<string, KinkEntry>;
  focusCategory?: string | null;
  progressLabel?: string;
  onStatusChange: (kinkId: string, s: KinkStatus) => void;
  onCuriousChange: (kinkId: string, v: boolean) => void;
  onPrivateChange: (kinkId: string, v: boolean) => void;
  onTagsChange: (kinkId: string, tags: string[]) => void;
}

export default function TriageDeck({
  kinks,
  queueItems,
  entries,
  focusCategory,
  progressLabel,
  onStatusChange,
  onCuriousChange,
  onPrivateChange,
  onTagsChange,
}: Props) {
  const reducedMotion = useReducedMotion();
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [holding, setHolding] = useState<string | null>(null);
  const [lastAnsweredId, setLastAnsweredId] = useState<string | null>(null);
  const [requireNonProbe, setRequireNonProbe] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [infoOpen, setInfoOpen] = useState<Kink | null>(null);
  const fadeTransition = reducedMotion
    ? { duration: 0 }
    : { duration: CARD_FADE_SECONDS, ease: "easeOut" as const };

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  }, []);

  const sourceItems = queueItems ?? kinks.map((kink): QuestionnaireQueueItem => ({
    kink,
    lane: "legacy",
    isProbe: false,
    coversAnchor: false,
    reasons: [],
  }));
  const unanswered = sourceItems.filter((item) => entries[item.kink.id]?.status == null);
  const skippedUnansweredCount = unanswered.filter((item) => skipped.has(item.kink.id)).length;
  const unskipped = unanswered.filter((item) => !skipped.has(item.kink.id));
  const focused = focusCategory
    ? unskipped.filter((item) => item.kink.category === focusCategory)
    : [];
  let queue = focused.length ? focused : unskipped;
  // "Sla over" means later, not never. Once everything else has had a turn,
  // skipped cards become eligible again instead of deadlocking Dynamic coverage.
  if (queue.length === 0 && unanswered.length > 0) {
    const deferredFocus = focusCategory
      ? unanswered.filter((item) => item.kink.category === focusCategory)
      : [];
    queue = deferredFocus.length ? deferredFocus : unanswered;
  }
  const currentItem = selectConversationQuestion(queue, KINKS, {
    requireNonProbe,
    lastKinkId: lastAnsweredId,
  });
  const held = holding ? kinks.find((kink) => kink.id === holding) : null;
  const current = held ?? currentItem?.kink ?? null;

  function handleSelect(kink: Kink, status: KinkStatus) {
    const answeredWasProbe = currentItem?.kink.id === kink.id && currentItem.isProbe;
    onStatusChange(kink.id, status);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (status == null) {
      setHolding(null);
      return;
    }
    setLastAnsweredId(kink.id);
    setRequireNonProbe(answeredWasProbe);
    setHolding(kink.id);
    holdTimer.current = setTimeout(() => setHolding(null), CARD_FEEDBACK_MS);
  }

  function toggleAgreement(tag: string) {
    if (!current) return;
    const tags = entries[current.id]?.tags ?? [];
    onTagsChange(
      current.id,
      tags.includes(tag)
        ? tags.filter((candidate) => candidate !== tag)
        : [...tags, tag],
    );
  }

  function skip(kink: Kink) {
    setHolding(null);
    setLastAnsweredId(kink.id);
    if (currentItem?.kink.id === kink.id && !currentItem.isProbe) setRequireNonProbe(false);
    setSkipped((previous) => new Set(previous).add(kink.id));
  }

  const remainingInCat = current
    ? queue.filter((item) => item.kink.category === current.category).length
    : 0;
  const totalDone = kinks.filter((kink) => entries[kink.id]?.status != null).length;
  const currentEntry = current ? entries[current.id] : undefined;

  return (
    <div aria-live="polite">
      {current ? (
        <div
          data-tour="kink-card"
          className="rounded-2xl p-4"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-accent)",
            scrollMarginTop: "calc(var(--nav-h) + 12px)",
          }}
        >
          <motion.div
            key={current.id}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={fadeTransition}
          >
            <div className="flex items-center gap-1.5">
              <p className="flex-1 text-xs truncate" style={{ color: "var(--text2)" }}>
                {current.category} · <span className="tabular-nums">nog {remainingInCat}</span>
              </p>
              <button
                data-tour="curious"
                onClick={() => onCuriousChange(current.id, !currentEntry?.curious)}
                aria-pressed={!!currentEntry?.curious}
                aria-label={currentEntry?.curious ? "Verwijder nieuwsgierig markering" : "Markeer als nieuwsgierig"}
                className="focus-ring rounded-full border transition-colors text-xs px-2.5 min-h-9 inline-flex items-center gap-1 flex-none"
                style={currentEntry?.curious
                  ? { background: "color-mix(in srgb, var(--curious) 20%, transparent)", borderColor: "var(--curious)", color: "var(--curious)" }
                  : { background: "var(--tag-muted)", borderColor: "var(--border)", color: "var(--text2)" }}
              >
                <Star size={11} weight={currentEntry?.curious ? "fill" : "regular"} aria-hidden="true" />
                Nieuwsgierig
              </button>
              <button
                type="button"
                data-tour="private"
                onClick={() => onPrivateChange(current.id, !currentEntry?.privateResponse)}
                aria-pressed={!!currentEntry?.privateResponse}
                aria-label={currentEntry?.privateResponse ? "Antwoord niet langer verbergen" : "Antwoord verbergen"}
                className="focus-ring px-2.5 min-h-9 inline-flex items-center justify-center gap-1 rounded-lg border transition-colors flex-none text-xs"
                style={currentEntry?.privateResponse
                  ? { color: "var(--accent)", borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 12%, transparent)" }
                  : { color: "var(--text2)", borderColor: "var(--border)", background: "var(--tag-muted)" }}
              >
                {currentEntry?.privateResponse
                  ? <EyeSlash size={13} weight="bold" aria-hidden="true" />
                  : <Eye size={13} aria-hidden="true" />}
                <span>{currentEntry?.privateResponse ? "Verborgen" : "Verberg"}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setInfoOpen(current)}
              aria-label={`Informatie over ${current.name}`}
              aria-haspopup="dialog"
              className="focus-ring block w-full text-left rounded-lg mt-1"
            >
              <h3
                className="text-2xl leading-tight"
                style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
              >
                {current.name}
              </h3>
              {current.description ? (
                <p className="text-sm mt-1 mb-3 line-clamp-2" style={{ color: "var(--text2)" }}>
                  {current.description}
                </p>
              ) : (
                <div className="mb-3" />
              )}
            </button>

            <StatusOptionRows
              current={currentEntry?.status ?? null}
              onSelect={(status) => handleSelect(current, status)}
            />

            <section className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center gap-1.5 mb-2">
                <WarningCircle size={14} weight="duotone" style={{ color: "var(--accent)" }} aria-hidden="true" />
                <p className="text-xs font-semibold">Afspraken</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {AGREEMENTS.map((agreement) => {
                  const active = currentEntry?.tags?.includes(agreement.value) ?? false;
                  return (
                    <button
                      key={agreement.value}
                      type="button"
                      onClick={() => toggleAgreement(agreement.value)}
                      aria-pressed={active}
                      className="focus-ring min-h-10 rounded-xl px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold"
                      style={active
                        ? {
                            color: agreement.emphasized ? "var(--accent)" : "var(--text)",
                            background: agreement.emphasized
                              ? "color-mix(in srgb, var(--accent) 13%, var(--surface2))"
                              : "var(--surface3)",
                            border: `1px solid ${agreement.emphasized ? "var(--accent)" : "var(--border-accent)"}`,
                          }
                        : { color: "var(--text2)", background: "var(--surface2)", border: "1px solid var(--border)" }}
                    >
                      {active ? <Check size={13} weight="bold" aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />}
                      {agreement.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="flex items-center mt-2">
              <span className="flex-1 text-xs tabular-nums" style={{ color: "var(--text2)" }}>
                {progressLabel ?? `${totalDone} van ${kinks.length} beoordeeld`}
              </span>
              <button
                onClick={() => skip(current)}
                className="focus-ring h-9 px-3 rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                style={{ color: "var(--text2)" }}
              >
                Sla over <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        <motion.div
          key="deck-done"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={fadeTransition}
          className="rounded-2xl p-5 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p
            className="text-lg italic"
            style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--text)" }}
          >
            {skippedUnansweredCount > 0 ? "Voor nu klaar." : "Alles beoordeeld."}
          </p>
          <p className="text-xs mt-1 tabular-nums" style={{ color: "var(--text2)" }}>
            {progressLabel ?? `${totalDone} van ${kinks.length} beoordeeld`} — tik een kink hieronder om bij te stellen.
          </p>
          {skippedUnansweredCount > 0 && (
            <button
              onClick={() => setSkipped(new Set())}
              className="focus-ring mt-3 h-9 px-4 rounded-lg text-xs border transition-colors"
              style={{ color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)" }}
            >
              {skippedUnansweredCount} overgeslagen — toon opnieuw
            </button>
          )}
        </motion.div>
      )}
      <InfoSheet kink={infoOpen} onClose={() => setInfoOpen(null)} />
    </div>
  );
}
