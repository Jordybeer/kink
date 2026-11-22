"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CaretDown, CaretRight, Check, Circle, Info, ShieldCheck } from "@phosphor-icons/react";
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
  { value: "vraag eerst", label: "Eerst vragen", emphasized: true, tour: "agreement-ask-first" },
  { value: "eerste keer", label: "Eerste keer", emphasized: false, tour: "agreement-first-time" },
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
  presentationStyle?: "classic" | "folio";
  /** Standalone sessions keep learning state in memory and omit the profile-list hint. */
  standalone?: boolean;
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

export default function TriageDeck({ presentationStyle = "classic", standalone = false, kinks, queueItems, entries, focusCategory, progressLabel, onStatusChange, onCuriousChange, onPrivateChange, onTagsChange }: Props) {
  const folio = presentationStyle === "folio";
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
      const stored = JSON.parse((!standalone && localStorage.getItem(SEEN_CATEGORY_KEY)) || "[]") as unknown;
      if (Array.isArray(stored)) setSeenCategories(new Set(stored.filter((value): value is string => typeof value === "string")));
    } catch {
      // Optional learning memory must never block the questionnaire.
    }
    return () => { if (holdTimer.current) clearTimeout(holdTimer.current); };
  }, [standalone]);

  const sourceItems = queueItems ?? kinks.map((kink): QuestionnaireQueueItem => ({ kink, lane: "coverage", isProbe: false, coversAnchor: false, reasons: [] }));
  const unanswered = sourceItems.filter((item) => entries[item.kink.id]?.status == null);
  const skippedUnansweredCount = unanswered.filter((item) => skipped.has(item.kink.id)).length;
  const unskipped = unanswered.filter((item) => !skipped.has(item.kink.id));
  const focused = focusCategory ? unskipped.filter((item) => item.kink.category === focusCategory) : [];
  let queue = focused.length ? focused : unskipped;
  if (!folio && queue.length === 0 && unanswered.length > 0) {
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
    if (standalone) return;
    try { localStorage.setItem(SEEN_CATEGORY_KEY, JSON.stringify([...next])); } catch { /* optional UI memory */ }
  }

  const remainingInCat = current ? queue.filter((item) => item.kink.category === current.category).length : 0;
  const totalDone = kinks.filter((kink) => entries[kink.id]?.status != null).length;
  const currentEntry = current ? entries[current.id] : undefined;
  const safetyOpen = Boolean(current?.safetyNote && safetyKinkId === current.id);
  const detailOpen = Boolean(current && detailKinkId === current.id);
  const categoryAccent = current ? CATEGORY_ACCENT[current.category] : "var(--category-custom)";
  const categoryUnseen = Boolean(current && current.category !== "custom" && !seenCategories.has(current.category));
  const presentation = current ? getQuestionnairePresentation(current) : { title: "", essence: "", details: null, hasDetails: false };
  const categoryCopy = categoryDetail ? kinkCategoryExplainer(categoryDetail) : null;
  const announcement = current
    ? `Nieuwe vraag: ${presentation.title}. Categorie ${kinkCategoryLabel(current.category)}.`
    : skippedUnansweredCount > 0 ? "Voor nu klaar." : "Alles beoordeeld.";

  const markers = current && (
    <QuestionMarkers
      labelled={folio}
      curious={!!currentEntry?.curious}
      concealed={!!currentEntry?.privateResponse}
      onCurious={() => onCuriousChange(current.id, !currentEntry?.curious)}
      onPrivacy={() => onPrivateChange(current.id, !currentEntry?.privateResponse)}
    />
  );

  const contextButtonClass = folio ? "ks-motion-choice focus-ring" : "ks-motion-choice focus-ring inline-flex h-12 min-w-0 touch-manipulation items-center gap-2 rounded-xl px-3 text-left";
  const contextButtonStyle = folio ? undefined : { background: "var(--question-utility-surface)", color: "var(--text2)" };
  const prompt = current && (
    <>
      <div key={folio ? current.id : "title"} data-testid="question-title-slot" className="flex min-h-0 -translate-y-1 items-center overflow-visible"><h2 data-testid="question-title" className="break-words overflow-visible pb-1 text-[clamp(1.22rem,5.4vw,1.4rem)] leading-[1.2] tracking-[-0.018em]" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}>{presentation.title}</h2></div>
      <p key={folio ? current.id + "-essence" : "essence"} data-testid="question-essence" className="min-h-[3.75rem] self-start break-words text-xs leading-4" style={{ color: "var(--text2)" }}>{presentation.essence}</p>

      <div data-testid="question-detail-slot" className={folio ? "folio-question-links" : "grid min-h-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2"}>
        {presentation.hasDetails && (
          <button type="button" data-testid="question-info-disclosure" onClick={() => setDetailKinkId(current.id)}
            aria-haspopup="dialog" aria-expanded={detailOpen} className={contextButtonClass} style={contextButtonStyle}>
            <Info size={16} aria-hidden="true" style={{ color: "var(--accent)" }} />
            <span className={folio ? undefined : "min-w-0 truncate text-xs font-semibold"} style={folio ? undefined : { color: "var(--text)" }}>{folio ? "Meer uitleg" : "Info & uitleg"}</span>
            {!folio && <CaretRight size={14} className="ml-auto flex-none" aria-hidden="true" />}
          </button>
        )}
        {current.safetyNote && (
          <button type="button" data-testid="safety-disclosure" onClick={() => setSafetyKinkId(current.id)}
            aria-haspopup="dialog" aria-expanded={safetyOpen} className={contextButtonClass} style={contextButtonStyle}>
            <ShieldCheck size={16} weight="duotone" style={{ color: "var(--accent)" }} aria-hidden="true" />
            <span className={folio ? undefined : "text-xs font-semibold"} style={folio ? undefined : { color: "var(--text)" }}>Veiligheid</span>
            {!folio && <CaretRight size={14} aria-hidden="true" />}
          </button>
        )}
      </div>
    </>
  );

  const selectedAgreements = AGREEMENTS.filter(agreement => currentEntry?.tags?.includes(agreement.value));
  const agreementChoices = (
    <div className={folio ? "folio-agreement-options" : "grid grid-cols-2 gap-2"}>
      {AGREEMENTS.map(agreement => {
        const active = selectedAgreements.includes(agreement);
        const classicStyle = active
          ? {
              color: agreement.emphasized ? "var(--accent)" : "var(--text)",
              background: agreement.emphasized ? "color-mix(in srgb, var(--accent) 10%, var(--surface2))" : "color-mix(in srgb, var(--surface3) 82%, transparent)",
              border: `1px solid ${agreement.emphasized ? "color-mix(in srgb, var(--accent) 34%, var(--border))" : "color-mix(in srgb, var(--text2) 20%, var(--border))"}`,
            }
          : { color: "var(--text2)", background: "color-mix(in srgb, var(--surface2) 76%, transparent)", border: "1px solid color-mix(in srgb, var(--border) 92%, var(--text2))" };
        return (
          <button key={agreement.value} type="button" data-tour={agreement.tour} onClick={() => toggleAgreement(agreement.value)}
            aria-pressed={active} className={folio ? "focus-ring ks-motion-choice" : "focus-ring ks-motion-choice inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold"}
            style={folio ? undefined : classicStyle}>
            {active ? <Check size={13} weight="bold" aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />}
            {agreement.label}
          </button>
        );
      })}
    </div>
  );
  const progress = progressLabel ?? `${totalDone} van ${kinks.length} beoordeeld`;

  return (
    <>
      <p key={current?.id ?? "complete"} data-testid="question-announcement" className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <div className="h-full min-h-0">
        {current ? (
          <div data-presentation={presentationStyle} data-tour="kink-card" className="questionnaire-stage relative isolate h-full min-h-0 overflow-y-auto overscroll-contain">
            <div data-testid="question-content" className="question-content relative z-[1] grid min-h-full min-w-0 gap-1">
              <div className={folio ? "folio-question-meta" : "flex min-h-0 min-w-0 items-center gap-2"}>
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
                  <span className="min-w-0 truncate text-xs" style={{ color: "var(--text2)" }}>{kinkCategoryLabel(current.category)}{!folio && <> · <span className="tabular-nums">nog {remainingInCat}</span></>}</span>
                  {current.category !== "custom" && <Info size={13} className="flex-none" aria-hidden="true" style={{ color: "var(--text2)" }} />}
                </button>

                {folio ? <span data-testid="question-progress" className="folio-question-progress">{progress}</span> : markers}
              </div>

              {folio ? <header className="folio-question-prompt">{prompt}</header> : prompt}

              <StatusOptionRows current={currentEntry?.status ?? null} onSelect={(status) => handleSelect(current, status)} />

              {folio && markers}
              {folio ? (
                <details key={current.id} data-testid="question-agreements" className="folio-agreements">
                  <summary data-testid="question-agreements-label" className="focus-ring">
                    <span>Afspraak of ervaring</span>
                    <span className="folio-agreement-summary">{selectedAgreements.length ? selectedAgreements.map(agreement => agreement.label).join(" · ") : "Optioneel"}</span>
                    <CaretDown size={16} aria-hidden="true" />
                  </summary>
                  {agreementChoices}
                </details>
              ) : (
                <section data-testid="question-agreements" className="min-h-0 border-t pb-2 pt-2.5" style={{ borderColor: "color-mix(in srgb, var(--border) 88%, transparent)" }}>
                  <p data-testid="question-agreements-label" className="mb-2 text-xs font-semibold" style={{ color: "var(--text)" }}>Afspraken <span className="font-normal" style={{ color: "var(--text2)" }}>· optioneel</span></p>
                  {agreementChoices}
                </section>
              )}

              <div className="flex min-h-0 items-center justify-end gap-3">
                {!folio && <span data-testid="question-progress" className="min-w-0 flex-1 truncate text-xs tabular-nums" style={{ color: "var(--text2)" }}>{progress}</span>}
                <button type="button" onClick={() => skip(current)} className="ks-motion-choice focus-ring inline-flex h-11 items-center gap-1 rounded-full px-3 text-xs"
                  style={folio ? { color: "var(--text2)" } : { color: "var(--text2)", background: "color-mix(in srgb, var(--surface2) 66%, transparent)" }}>
                  Later <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div data-testid="question-finish-state" className="rounded-2xl p-5 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}><p className="text-lg italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--text)" }}>{skippedUnansweredCount > 0 ? "Voor nu klaar." : "Alles beoordeeld."}</p><p className="mt-1 text-xs tabular-nums" style={{ color: "var(--text2)" }}>{progressLabel ?? `${totalDone} van ${kinks.length} beoordeeld`}.{!standalone && " Tik een kink hieronder om bij te stellen."}</p>{skippedUnansweredCount > 0 && <button onClick={() => setSkipped(new Set())} className="ks-motion-choice focus-ring mt-3 min-h-11 rounded-lg border px-4 text-xs" style={{ color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)" }}>{skippedUnansweredCount} overgeslagen. Toon opnieuw</button>}</div>
        )}
      </div>

      {current && presentation.hasDetails && (
        <Sheet
          open={detailOpen}
          onClose={() => setDetailKinkId(null)}
          title={folio ? presentation.title : "Info & uitleg"}
          headerIcon={folio ? undefined : <Info size={20} weight="duotone" />}
          variant={folio ? "sheet" : "surface"}
          contentSized
          scrollable={!folio}
          testIds={folio ? { header: "folio-topic-header" } : undefined}
          aria-label={`Info en uitleg bij ${presentation.title}`}
        >
          <ExplanationContent>
            {folio ? (
              <ExplanationProse>{presentation.details}</ExplanationProse>
            ) : (
              <>
                <EditorialHeading title={presentation.title} size="compact" level={3} />
                <ExplanationSection title="In het kort" emphasis>
                  <ExplanationProse testId="question-detail-essence">{presentation.essence}</ExplanationProse>
                </ExplanationSection>
                {presentation.details && (
                  <ExplanationSection title="Meer context">
                    <ExplanationProse>{presentation.details}</ExplanationProse>
                  </ExplanationSection>
                )}
              </>
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
