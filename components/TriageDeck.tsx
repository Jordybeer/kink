"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CaretDown, Check, Circle, Info, ShieldCheck } from "@phosphor-icons/react";
import type { Kink, KinkCategory, KinkCategoryId, KinkEntry, KinkStatus } from "@/types";
import { KINKS, kinkCategoryLabel } from "@/lib/kinks";
import { kinkCategoryExplainer } from "@/lib/kinkCategories";
import { getQuestionnairePresentation } from "@/lib/questionnairePresentation";
import { isConversationContinuation, positiveQuestionnaireStatus, selectConversationQuestion, type ConversationPhase, type QuestionnaireQueueItem } from "@/lib/questionnaireEngine";
import QuestionMarkers from "./QuestionMarkers";
import StatusOptionRows from "./StatusOptionRows";
import Sheet from "./Sheet";
import EditorialHeading from "./ui/EditorialHeading";
import { ExplanationContent, ExplanationProse, ExplanationSection } from "./ExplanationContent";

const AGREEMENTS = [
  { value: "vraag eerst", label: "Eerst vragen" },
  { value: "eerste keer", label: "Eerste keer" },
] as const;

const CATEGORY_ACCENT: Record<Kink["category"], string> = {
  impact: "var(--category-impact)", bondage: "var(--category-bondage)", power: "var(--category-power)", rituals: "var(--category-rituals)", discipline: "var(--category-discipline)",
  roleplay: "var(--category-roleplay)", interaction: "var(--category-interaction)", sensation: "var(--category-sensation)", sexual_acts: "var(--category-sexual-acts)", exhibition: "var(--category-exhibition)", media: "var(--category-media)", group_partner: "var(--category-group-partner)",
  body_focus: "var(--category-body-focus)", materials_scent: "var(--category-materials-scent)", pet_play: "var(--category-pet-play)", fluids: "var(--category-fluids)", toys: "var(--category-toys)",
  penetration: "var(--category-penetration)", aftercare: "var(--category-aftercare)", appearance: "var(--category-appearance)", adult_ageplay: "var(--category-adult-ageplay)", custom: "var(--category-custom)",
};

const CARD_FEEDBACK_MS = 200;
const SEEN_CATEGORY_KEY = "kinksync-questionnaire-category-explainers-v1";

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

export default function TriageDeck({ kinks, queueItems, entries, focusCategory, progressLabel, onStatusChange, onCuriousChange, onPrivateChange, onTagsChange }: Props) {
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [holding, setHolding] = useState<{ id: string; wasContinuation: boolean } | null>(null);
  const [lastAnsweredId, setLastAnsweredId] = useState<string | null>(null);
  const [conversationPhase, setConversationPhase] = useState<ConversationPhase>("normal");
  const [safetyKinkId, setSafetyKinkId] = useState<string | null>(null);
  const [detailKinkId, setDetailKinkId] = useState<string | null>(null);
  const [categoryDetail, setCategoryDetail] = useState<KinkCategory | null>(null);
  const [seenCategories, setSeenCategories] = useState<Set<string>>(new Set());
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SEEN_CATEGORY_KEY) ?? "[]") as unknown;
      if (Array.isArray(stored)) setSeenCategories(new Set(stored.filter((value): value is string => typeof value === "string")));
    } catch {
      // Optional learning memory must never block the questionnaire.
    }
    return () => { if (holdTimer.current) clearTimeout(holdTimer.current); };
  }, []);

  const sourceItems = queueItems ?? kinks.map((kink): QuestionnaireQueueItem => ({ kink, lane: "coverage", isProbe: false, coversAnchor: false, reasons: [] }));
  const unanswered = sourceItems.filter((item) => entries[item.kink.id]?.status == null);
  const skippedUnansweredCount = unanswered.filter((item) => skipped.has(item.kink.id)).length;
  const unskipped = unanswered.filter((item) => !skipped.has(item.kink.id));
  const focused = focusCategory ? unskipped.filter((item) => item.kink.category === focusCategory) : [];
  let queue = focused.length ? focused : unskipped;
  if (queue.length === 0 && unanswered.length > 0) {
    const deferredFocus = focusCategory ? unanswered.filter((item) => item.kink.category === focusCategory) : [];
    queue = deferredFocus.length ? deferredFocus : unanswered;
  }
  const currentItem = selectConversationQuestion(queue, KINKS, { phase: conversationPhase, lastKinkId: lastAnsweredId });
  const held = holding ? kinks.find((kink) => kink.id === holding.id) : null;
  const current = held ?? currentItem?.kink ?? null;

  function clearHoldTimer() {
    if (!holdTimer.current) return;
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  function handleSelect(kink: Kink, status: KinkStatus) {
    const answeredWasContinuation = holding?.id === kink.id
      ? holding.wasContinuation
      : isConversationContinuation(currentItem, lastAnsweredId);
    clearHoldTimer();
    if (status == null) {
      setHolding(null);
      onStatusChange(kink.id, status);
      setConversationPhase("normal");
      return;
    }
    setHolding({ id: kink.id, wasContinuation: answeredWasContinuation });
    onStatusChange(kink.id, status);
    setLastAnsweredId(kink.id);
    if (answeredWasContinuation || status === "hard_no") setConversationPhase("topicBreakRequired");
    else setConversationPhase(positiveQuestionnaireStatus(status) ? "preferContinuation" : "preferComplement");
    holdTimer.current = setTimeout(() => { holdTimer.current = null; setHolding(null); }, CARD_FEEDBACK_MS);
  }

  function toggleAgreement(tag: string) {
    if (!current) return;
    const tags = entries[current.id]?.tags ?? [];
    onTagsChange(current.id, tags.includes(tag) ? tags.filter((candidate) => candidate !== tag) : [...tags, tag]);
  }

  function skip(kink: Kink) {
    clearHoldTimer();
    setHolding(null);
    setLastAnsweredId(kink.id);
    setConversationPhase("normal");
    setSkipped((previous) => new Set(previous).add(kink.id));
  }

  function openCategoryExplainer(category: KinkCategory) {
    setCategoryDetail(category);
    if (category === "custom" || seenCategories.has(category)) return;
    const next = new Set(seenCategories).add(category);
    setSeenCategories(next);
    try { localStorage.setItem(SEEN_CATEGORY_KEY, JSON.stringify([...next])); } catch { /* optional UI memory */ }
  }

  const remainingInCat = current ? queue.filter((item) => item.kink.category === current.category).length : 0;
  const totalDone = kinks.filter((kink) => entries[kink.id]?.status != null).length;
  const currentEntry = current ? entries[current.id] : undefined;
  const selectedAgreements = AGREEMENTS.filter(({ value }) => currentEntry?.tags?.includes(value));
  const safetyOpen = Boolean(current?.safetyNote && safetyKinkId === current.id);
  const detailOpen = Boolean(current && detailKinkId === current.id);
  const categoryAccent = current ? CATEGORY_ACCENT[current.category] : "var(--category-custom)";
  const categoryUnseen = Boolean(current && current.category !== "custom" && !seenCategories.has(current.category));
  const presentation = current ? getQuestionnairePresentation(current) : { title: "", essence: "", details: null, hasDetails: false };
  const categoryCopy = categoryDetail ? kinkCategoryExplainer(categoryDetail) : null;
  const announcement = current
    ? `Nieuwe vraag: ${presentation.title}. Categorie ${kinkCategoryLabel(current.category)}.`
    : skippedUnansweredCount > 0 ? "Voor nu klaar." : "Alles beoordeeld.";

  return (
    <>
      <p key={current?.id ?? "complete"} data-testid="question-announcement" className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <div className="h-full min-h-0">
        {current ? (
          <div data-tour="kink-card" className="questionnaire-stage relative isolate h-full min-h-0 overflow-y-auto overscroll-contain">
            <div data-testid="question-content" className="question-content relative z-[1] grid min-w-0 gap-1">
              <div className="flex min-h-0 min-w-0 items-center gap-2">
                <button type="button" data-testid="question-category-meta" onClick={() => openCategoryExplainer(current.category)} className="ks-motion-choice focus-ring flex h-11 min-w-0 flex-1 touch-manipulation items-center gap-2.5 rounded-lg text-left" aria-label={`Uitleg over ${kinkCategoryLabel(current.category)}`}>
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 flex-none rounded-full"
                    style={{
                      background: categoryAccent,
                      boxShadow: categoryUnseen
                        ? `0 0 0 3px color-mix(in srgb, ${categoryAccent} 16%, transparent), 0 0 10px color-mix(in srgb, ${categoryAccent} 34%, transparent)`
                        : `0 0 10px color-mix(in srgb, ${categoryAccent} 28%, transparent)`,
                    }}
                  />
                  <span className="min-w-0 truncate text-xs" style={{ color: "var(--text2)" }}>{kinkCategoryLabel(current.category)} · <span className="tabular-nums">nog {remainingInCat}</span></span>
                  {current.category !== "custom" && <Info size={13} className="flex-none" aria-hidden="true" style={{ color: "var(--text2)" }} />}
                </button>

                <span data-testid="question-progress" className="min-w-0 text-right text-xs tabular-nums text-[var(--text2)]">
                  {progressLabel ?? `${totalDone} van ${kinks.length} beoordeeld`}
                </span>
              </div>

              <header className="question-prompt">
                <div data-testid="question-title-slot">
                  <h2 key={current.id} data-testid="question-title" className="question-heading">{presentation.title}</h2>
                </div>
                <p data-testid="question-essence" className="break-words text-[var(--text2)]">{presentation.essence}</p>
                <div data-testid="question-detail-slot" className="flex flex-wrap gap-x-5">
                  {presentation.hasDetails && (
                    <button type="button" data-testid="question-info-disclosure" onClick={() => setDetailKinkId(current.id)}
                      aria-haspopup="dialog" aria-expanded={detailOpen} className="question-context-action ks-motion-choice focus-ring">
                      <Info size={16} aria-hidden="true" /> Info &amp; uitleg
                    </button>
                  )}
                  {current.safetyNote && (
                    <button type="button" data-testid="safety-disclosure" onClick={() => setSafetyKinkId(current.id)}
                      aria-haspopup="dialog" aria-expanded={safetyOpen} className="question-context-action ks-motion-choice focus-ring">
                      <ShieldCheck size={16} weight="duotone" aria-hidden="true" /> Veiligheid
                    </button>
                  )}
                </div>
              </header>

              <StatusOptionRows current={currentEntry?.status ?? null} onSelect={(status) => handleSelect(current, status)} />

              <QuestionMarkers
                curious={!!currentEntry?.curious}
                concealed={!!currentEntry?.privateResponse}
                onCurious={() => onCuriousChange(current.id, !currentEntry?.curious)}
                onPrivacy={() => onPrivateChange(current.id, !currentEntry?.privateResponse)}
              />

              <details key={current.id} data-testid="question-agreements" className="question-agreements">
                <summary data-tour="question-agreements" data-testid="question-agreements-label" className="focus-ring">
                  <span>Afspraak of ervaring</span>
                  <span className="ml-auto text-right font-normal text-[var(--text2)]">
                    {selectedAgreements.map(({ label }) => label).join(" · ") || "Optioneel"}
                  </span>
                  <CaretDown size={16} aria-hidden="true" />
                </summary>
                <div className="flex flex-wrap gap-x-5 pb-1">
                  {AGREEMENTS.map(agreement => {
                    const active = selectedAgreements.includes(agreement);
                    return (
                      <button key={agreement.value} type="button" onClick={() => toggleAgreement(agreement.value)}
                        aria-pressed={active} className="question-context-action ks-motion-choice focus-ring">
                        {active ? <Check size={15} weight="bold" aria-hidden="true" /> : <Circle size={15} aria-hidden="true" />}
                        {agreement.label}
                      </button>
                    );
                  })}
                </div>
              </details>

              <button type="button" onClick={() => skip(current)}
                className="ks-motion-choice focus-ring inline-flex min-h-11 items-center gap-1 justify-self-end rounded-full px-3 text-xs text-[var(--text2)]">
                Later <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div data-testid="question-finish-state" className="rounded-2xl p-5 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}><p className="text-lg italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--text)" }}>{skippedUnansweredCount > 0 ? "Voor nu klaar." : "Alles beoordeeld."}</p><p className="mt-1 text-xs tabular-nums" style={{ color: "var(--text2)" }}>{progressLabel ?? `${totalDone} van ${kinks.length} beoordeeld`}. Tik een kink hieronder om bij te stellen.</p>{skippedUnansweredCount > 0 && <button onClick={() => setSkipped(new Set())} className="ks-motion-choice focus-ring mt-3 min-h-11 rounded-lg border px-4 text-xs" style={{ color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)" }}>{skippedUnansweredCount} overgeslagen. Toon opnieuw</button>}</div>
        )}
      </div>

      {current && presentation.hasDetails && (
        <Sheet open={detailOpen} onClose={() => setDetailKinkId(null)} title="Info & uitleg" headerIcon={<Info size={20} weight="duotone" />} variant="surface" contentSized scrollable aria-label={`Info en uitleg bij ${presentation.title}`}>
          <ExplanationContent>
            <EditorialHeading title={presentation.title} size="compact" level={3} />
            <ExplanationSection title="In het kort" emphasis>
              <ExplanationProse testId="question-detail-essence">{presentation.essence}</ExplanationProse>
            </ExplanationSection>
            {presentation.details && (
              <ExplanationSection title="Meer context">
                <ExplanationProse>{presentation.details}</ExplanationProse>
              </ExplanationSection>
            )}
            {current.aliases && current.aliases.length > 0 && (
              <ExplanationSection title="Ook bekend als">
                <ExplanationProse secondary>{current.aliases.join(" · ")}</ExplanationProse>
              </ExplanationSection>
            )}
          </ExplanationContent>
        </Sheet>
      )}
      {current?.safetyNote && (
        <Sheet open={safetyOpen} onClose={() => setSafetyKinkId(null)} title="Veiligheid" headerIcon={<ShieldCheck size={20} weight="duotone" />} variant="surface" contentSized scrollable aria-label={`Veiligheid bij ${presentation.title}`}>
          <ExplanationContent>
            <EditorialHeading title={presentation.title} size="compact" level={3} />
            <ExplanationProse>{current.safetyNote}</ExplanationProse>
          </ExplanationContent>
        </Sheet>
      )}
      {categoryDetail && categoryCopy && (
        <Sheet open onClose={() => setCategoryDetail(null)} title={kinkCategoryLabel(categoryDetail)} headerIcon={<span className="h-[8px] w-[8px] rounded-full" style={{ background: CATEGORY_ACCENT[categoryDetail] }} />} variant="surface" contentSized scrollable aria-label={`Over ${kinkCategoryLabel(categoryDetail)}`}>
          <ExplanationContent>
            <ExplanationProse>{categoryCopy}</ExplanationProse>
            <ExplanationProse secondary>Deze uitleg helpt termen herkennen. Ze vult niets voor je in en verandert geen antwoorden.</ExplanationProse>
          </ExplanationContent>
        </Sheet>
      )}
    </>
  );
}
