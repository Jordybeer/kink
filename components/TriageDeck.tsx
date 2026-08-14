"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CaretRight, Check, Circle, Eye, EyeSlash, ShieldCheck, Star } from "@phosphor-icons/react";
import type { Kink, KinkCategoryId, KinkEntry, KinkStatus } from "@/types";
import { KINKS, kinkCategoryLabel } from "@/lib/kinks";
import {
  isConversationContinuation,
  selectConversationQuestion,
  type ConversationPhase,
  type QuestionnaireQueueItem,
} from "@/lib/questionnaireEngine";
import StatusOptionRows from "./StatusOptionRows";
import Sheet, { SheetContent } from "./Sheet";
import ClampText from "./ui/ClampText";

const AGREEMENTS = [
  { value: "vraag eerst", label: "Eerst vragen", emphasized: true, tour: "agreement-ask-first" },
  { value: "eerste keer", label: "Eerste keer", emphasized: false, tour: "agreement-first-time" },
] as const;

const CARD_FEEDBACK_MS = 200;
const CARD_FADE_SECONDS = 0.17;

interface Props {
  kinks: Kink[];
  queueItems?: QuestionnaireQueueItem[];
  entries: Record<string, KinkEntry>;
  focusCategory?: KinkCategoryId | null;
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
  const [conversationPhase, setConversationPhase] = useState<ConversationPhase>("normal");
  const [safetyKinkId, setSafetyKinkId] = useState<string | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    lane: "coverage",
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
  if (queue.length === 0 && unanswered.length > 0) {
    const deferredFocus = focusCategory
      ? unanswered.filter((item) => item.kink.category === focusCategory)
      : [];
    queue = deferredFocus.length ? deferredFocus : unanswered;
  }
  const currentItem = selectConversationQuestion(queue, KINKS, {
    phase: conversationPhase,
    lastKinkId: lastAnsweredId,
  });
  const held = holding ? kinks.find((kink) => kink.id === holding) : null;
  const current = held ?? currentItem?.kink ?? null;

  function handleSelect(kink: Kink, status: KinkStatus) {
    const answeredWasContinuation = isConversationContinuation(currentItem, lastAnsweredId);
    onStatusChange(kink.id, status);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (status == null) {
      setHolding(null);
      setConversationPhase("normal");
      return;
    }
    setLastAnsweredId(kink.id);
    setConversationPhase(
      answeredWasContinuation
        ? "topicBreakRequired"
        : status === "yes" || status === "willing"
          ? "preferContinuation"
          : "preferComplement",
    );
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
    setConversationPhase("normal");
    setSkipped((previous) => new Set(previous).add(kink.id));
  }

  const remainingInCat = current
    ? queue.filter((item) => item.kink.category === current.category).length
    : 0;
  const totalDone = kinks.filter((kink) => entries[kink.id]?.status != null).length;
  const currentEntry = current ? entries[current.id] : undefined;
  const safetyOpen = Boolean(current?.safetyNote && safetyKinkId === current.id);

  return (
    <>
      <div aria-live="polite">
      {current ? (
        <div
          data-tour="kink-card"
          className="rounded-2xl p-4"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            scrollMarginTop: "calc(var(--nav-h) + 12px)",
          }}
        >
          <motion.div
            key={current.id}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={fadeTransition}
          >
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-xs" style={{ color: "var(--text2)" }}>
                {kinkCategoryLabel(current.category)} · <span className="tabular-nums">nog {remainingInCat}</span>
              </p>
              <button
                type="button"
                data-tour="curious"
                onClick={() => onCuriousChange(current.id, !currentEntry?.curious)}
                aria-pressed={!!currentEntry?.curious}
                aria-label={currentEntry?.curious ? "Verwijder nieuwsgierig markering" : "Markeer als nieuwsgierig"}
                title={currentEntry?.curious ? "Niet meer nieuwsgierig" : "Nieuwsgierig"}
                className="focus-ring inline-flex h-11 w-11 flex-none items-center justify-center rounded-full border transition-colors"
                style={currentEntry?.curious
                  ? { background: "color-mix(in srgb, var(--curious) 14%, var(--surface2))", borderColor: "color-mix(in srgb, var(--curious) 55%, var(--border))", color: "var(--curious)" }
                  : { background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text2)" }}
              >
                <Star size={17} weight={currentEntry?.curious ? "fill" : "regular"} aria-hidden="true" />
              </button>
              <button
                type="button"
                data-tour="private"
                onClick={() => onPrivateChange(current.id, !currentEntry?.privateResponse)}
                aria-pressed={!!currentEntry?.privateResponse}
                aria-label={currentEntry?.privateResponse ? "Antwoord niet langer verbergen" : "Antwoord verbergen"}
                title={currentEntry?.privateResponse ? "Verborgen antwoord" : "Antwoord verbergen"}
                className="focus-ring inline-flex h-11 w-11 flex-none items-center justify-center rounded-full border transition-colors"
                style={currentEntry?.privateResponse
                  ? { color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 55%, var(--border))", background: "color-mix(in srgb, var(--accent) 12%, var(--surface2))" }
                  : { color: "var(--text2)", borderColor: "var(--border)", background: "var(--surface2)" }}
              >
                {currentEntry?.privateResponse
                  ? <EyeSlash size={17} weight="bold" aria-hidden="true" />
                  : <Eye size={17} aria-hidden="true" />}
              </button>
            </div>

            <div className="mt-2">
              <h3
                className="text-2xl leading-tight"
                style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
              >
                {current.name}
              </h3>
              {current.description ? (
                <ClampText
                  text={current.description}
                  className="mt-1 text-sm leading-relaxed"
                  style={{ color: "var(--text2)" }}
                />
              ) : (
                <div />
              )}
              {current.safetyNote && (
                <button
                  type="button"
                  data-testid="safety-disclosure"
                  aria-haspopup="dialog"
                  aria-expanded={safetyOpen}
                  onClick={() => setSafetyKinkId(current.id)}
                  className="focus-ring mt-2 flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left transition-colors"
                  style={{ background: "var(--surface2)", color: "var(--text2)" }}
                >
                  <ShieldCheck size={16} weight="duotone" style={{ color: "var(--accent-text)" }} aria-hidden="true" />
                  <span className="flex-1 text-xs font-semibold" style={{ color: "var(--text)" }}>Veiligheid</span>
                  <span className="text-xs">Bekijk</span>
                  <CaretRight size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            <StatusOptionRows
              current={currentEntry?.status ?? null}
              onSelect={(status) => handleSelect(current, status)}
            />

            <section className="mt-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>Afspraken</p>
                <span className="text-xs" style={{ color: "var(--text2)" }}>optioneel</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {AGREEMENTS.map((agreement) => {
                  const active = currentEntry?.tags?.includes(agreement.value) ?? false;
                  return (
                    <button
                      key={agreement.value}
                      type="button"
                      data-tour={agreement.tour}
                      onClick={() => toggleAgreement(agreement.value)}
                      aria-pressed={active}
                      className="focus-ring inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold"
                      style={active
                        ? {
                            color: agreement.emphasized ? "var(--accent)" : "var(--text)",
                            background: agreement.emphasized
                              ? "color-mix(in srgb, var(--accent) 11%, var(--surface2))"
                              : "var(--surface3)",
                            border: `1px solid ${agreement.emphasized ? "color-mix(in srgb, var(--accent) 55%, var(--border))" : "var(--border-accent)"}`,
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

            <div className="mt-3 flex items-center">
              <span className="flex-1 text-xs tabular-nums" style={{ color: "var(--text2)" }}>
                {progressLabel ?? `${totalDone} van ${kinks.length} beoordeeld`}
              </span>
              <button
                type="button"
                onClick={() => skip(current)}
                className="focus-ring inline-flex h-9 items-center gap-1 rounded-lg px-3 text-xs transition-colors"
                style={{ color: "var(--text2)" }}
              >
                Later <ArrowRight size={13} aria-hidden="true" />
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
          <p className="mt-1 text-xs tabular-nums" style={{ color: "var(--text2)" }}>
            {progressLabel ?? `${totalDone} van ${kinks.length} beoordeeld`} — tik een kink hieronder om bij te stellen.
          </p>
          {skippedUnansweredCount > 0 && (
            <button
              onClick={() => setSkipped(new Set())}
              className="focus-ring mt-3 h-9 rounded-lg border px-4 text-xs transition-colors"
              style={{ color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)" }}
            >
              {skippedUnansweredCount} overgeslagen — toon opnieuw
            </button>
          )}
        </motion.div>
      )}
      </div>

      {current?.safetyNote && (
        <Sheet
          open={safetyOpen}
          onClose={() => setSafetyKinkId(null)}
          scrollable
          aria-label={`Veiligheid bij ${current.name}`}
        >
          <SheetContent
            className="overflow-y-auto overscroll-contain px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3"
            style={{ maxHeight: "min(calc(var(--visual-viewport-height, 100dvh) * 0.7), 32rem)" }}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} weight="duotone" style={{ color: "var(--accent-text)" }} aria-hidden="true" />
              <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Veiligheid</h3>
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{current.name}</p>
            <p className="mt-4 text-sm leading-6" style={{ color: "var(--text)" }}>{current.safetyNote}</p>
            <button
              type="button"
              onClick={() => setSafetyKinkId(null)}
              className="focus-ring mt-5 min-h-12 w-full rounded-xl text-sm font-semibold"
              style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              Sluit
            </button>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
