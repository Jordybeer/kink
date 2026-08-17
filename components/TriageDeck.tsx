"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CaretRight, Check, Circle, Eye, EyeSlash, Info, ShieldCheck, Star } from "@phosphor-icons/react";
import type { Kink, KinkCategory, KinkCategoryId, KinkEntry, KinkStatus } from "@/types";
import { KINKS, kinkCategoryLabel } from "@/lib/kinks";
import { kinkCategoryExplainer } from "@/lib/kinkCategories";
import { getQuestionnairePresentation } from "@/lib/questionnairePresentation";
import { isConversationContinuation, selectConversationQuestion, type ConversationPhase, type QuestionnaireQueueItem } from "@/lib/questionnaireEngine";
import StatusOptionRows from "./StatusOptionRows";
import Sheet, { SheetContent } from "./Sheet";

const AGREEMENTS = [
  { value: "vraag eerst", label: "Eerst vragen", emphasized: true, tour: "agreement-ask-first" },
  { value: "eerste keer", label: "Eerste keer", emphasized: false, tour: "agreement-first-time" },
] as const;

const CATEGORY_ACCENT: Record<Kink["category"], string> = {
  impact: "#c77a68", bondage: "#8774c9", power: "#9a70c4", rituals: "#7768b7", discipline: "#a26c7d",
  roleplay: "#a26d9c", sensation: "#6e85c8", exhibition: "#986d9d", media: "#6676b0", group_partner: "#7f70ac",
  body_focus: "#9575ae", materials_scent: "#897493", pet_play: "#9d718b", fluids: "#836b90", toys: "#6c79c4",
  penetration: "#a36e7f", aftercare: "#638fa3", appearance: "#9174a6", adult_ageplay: "#956f8b", custom: "#8170bd",
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
  const [holding, setHolding] = useState<string | null>(null);
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
  const held = holding ? kinks.find((kink) => kink.id === holding) : null;
  const current = held ?? currentItem?.kink ?? null;

  function clearHoldTimer() {
    if (!holdTimer.current) return;
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  function handleSelect(kink: Kink, status: KinkStatus) {
    const answeredWasContinuation = isConversationContinuation(currentItem, lastAnsweredId);
    clearHoldTimer();
    if (status == null) {
      setHolding(null);
      onStatusChange(kink.id, status);
      setConversationPhase("normal");
      return;
    }
    setHolding(kink.id);
    onStatusChange(kink.id, status);
    setLastAnsweredId(kink.id);
    setConversationPhase(answeredWasContinuation ? "topicBreakRequired" : status === "yes" || status === "willing" ? "preferContinuation" : "preferComplement");
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
  const safetyOpen = Boolean(current?.safetyNote && safetyKinkId === current.id);
  const detailOpen = Boolean(current && detailKinkId === current.id);
  const categoryAccent = current ? CATEGORY_ACCENT[current.category] : "#8170bd";
  const categoryUnseen = Boolean(current && current.category !== "custom" && !seenCategories.has(current.category));
  const presentation = current ? getQuestionnairePresentation(current) : { title: "", essence: "", details: null, hasDetails: false };
  const categoryCopy = categoryDetail ? kinkCategoryExplainer(categoryDetail) : null;

  return (
    <>
      <div aria-live="polite" className="h-full min-h-0">
        {current ? (
          <div data-tour="kink-card" className="relative isolate h-full min-h-0 overflow-y-auto overscroll-contain rounded-[1.75rem] p-4" style={{ background: "color-mix(in srgb, var(--surface) 94%, #180f20)", border: "1px solid color-mix(in srgb, var(--border) 88%, var(--text2))", boxShadow: "0 18px 42px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.035)" }}>
            <div aria-hidden="true" data-testid="question-ambient-glow" className="pointer-events-none absolute inset-x-0 top-0 h-36 rounded-[1.75rem]" style={{ background: `radial-gradient(circle at 18% 0%, color-mix(in srgb, ${categoryAccent} 12%, transparent), transparent 64%)` }} />
            <div data-testid="question-content" className="relative z-[1] grid min-h-full min-w-0 gap-1" style={{ gridTemplateRows: "44px 56px 48px 48px minmax(14.75rem, 1fr) 88px 44px" }}>
              <div className="flex min-h-0 min-w-0 items-center gap-2">
                <button type="button" data-testid="question-category-meta" onClick={() => openCategoryExplainer(current.category)} className="focus-ring flex h-11 min-w-0 flex-1 touch-manipulation items-center gap-2.5 rounded-lg text-left" aria-label={`Uitleg over ${kinkCategoryLabel(current.category)}`}>
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

                <div className="flex flex-none items-center gap-2" data-testid="question-utilities">
                  <button type="button" data-testid="question-curious" data-tour="curious" onClick={() => onCuriousChange(current.id, !currentEntry?.curious)} aria-pressed={!!currentEntry?.curious} aria-label={currentEntry?.curious ? "Verwijder nieuwsgierig markering" : "Markeer als nieuwsgierig"} title={currentEntry?.curious ? "Niet meer nieuwsgierig" : "Nieuwsgierig"} className="focus-ring inline-flex h-11 w-11 flex-none touch-manipulation items-center justify-center rounded-full transition-transform duration-150 active:scale-95 motion-reduce:active:scale-100 motion-reduce:transition-none">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-[background-color,border-color,color,box-shadow] duration-150" style={currentEntry?.curious ? { background: "color-mix(in srgb, var(--curious) 12%, var(--surface2))", borderColor: "color-mix(in srgb, var(--curious) 34%, var(--border))", color: "var(--curious)", boxShadow: "0 0 14px color-mix(in srgb, var(--curious) 8%, transparent)" } : { background: "color-mix(in srgb, var(--surface2) 48%, transparent)", borderColor: "color-mix(in srgb, var(--border) 76%, transparent)", color: "var(--text2)", boxShadow: "none" }}><Star size={17} weight={currentEntry?.curious ? "fill" : "regular"} aria-hidden="true" /></span>
                  </button>
                  <button type="button" data-testid="question-private" data-tour="private" onClick={() => onPrivateChange(current.id, !currentEntry?.privateResponse)} aria-pressed={!!currentEntry?.privateResponse} aria-label={currentEntry?.privateResponse ? "Antwoord niet langer privé maken" : "Antwoord privé maken"} title={currentEntry?.privateResponse ? "Privé antwoord" : "Antwoord privé maken"} className="focus-ring inline-flex h-11 w-11 flex-none touch-manipulation items-center justify-center rounded-full transition-transform duration-150 active:scale-95 motion-reduce:active:scale-100 motion-reduce:transition-none">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-[background-color,border-color,color,box-shadow] duration-150" style={currentEntry?.privateResponse ? { color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 32%, var(--border))", background: "color-mix(in srgb, var(--accent) 10%, var(--surface2))", boxShadow: "0 0 14px color-mix(in srgb, var(--accent) 7%, transparent)" } : { color: "var(--text2)", borderColor: "color-mix(in srgb, var(--border) 76%, transparent)", background: "color-mix(in srgb, var(--surface2) 48%, transparent)", boxShadow: "none" }}>{currentEntry?.privateResponse ? <EyeSlash size={17} weight="bold" aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</span>
                  </button>
                </div>
              </div>

              <div data-testid="question-title-slot" className="flex min-h-0 -translate-y-1 items-center overflow-visible"><h3 data-testid="question-title" className="max-h-14 overflow-visible pb-1 text-[clamp(1.22rem,5.4vw,1.4rem)] leading-[1.2] tracking-[-0.018em]" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}>{presentation.title}</h3></div>
              <p data-testid="question-essence" className="h-12 self-start break-words text-xs leading-4" style={{ color: "var(--text2)" }}>{presentation.essence}</p>

              <div data-testid="question-detail-slot" className="grid min-h-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                {presentation.hasDetails && <button type="button" data-testid="question-info-disclosure" onClick={() => setDetailKinkId(current.id)} aria-haspopup="dialog" aria-expanded={detailOpen} className="focus-ring inline-flex h-12 min-w-0 touch-manipulation items-center gap-2 rounded-xl px-3 text-left transition-[transform,background-color] duration-150 active:scale-[0.995] motion-reduce:active:scale-100 motion-reduce:transition-none" style={{ background: "color-mix(in srgb, var(--surface2) 66%, transparent)", color: "var(--text2)" }}><Info size={16} aria-hidden="true" style={{ color: "var(--accent)" }} /><span className="min-w-0 truncate text-xs font-semibold" style={{ color: "var(--text)" }}>Info & uitleg</span><CaretRight size={14} className="ml-auto flex-none" aria-hidden="true" /></button>}
                {current.safetyNote && <button type="button" data-testid="safety-disclosure" aria-haspopup="dialog" aria-expanded={safetyOpen} onClick={() => setSafetyKinkId(current.id)} className="focus-ring inline-flex h-12 min-w-0 touch-manipulation items-center gap-2 rounded-xl px-3 text-left transition-[transform,background-color] duration-150 active:scale-[0.995] motion-reduce:active:scale-100 motion-reduce:transition-none" style={{ background: "color-mix(in srgb, var(--surface2) 66%, transparent)", color: "var(--text2)" }}><ShieldCheck size={16} weight="duotone" style={{ color: "var(--accent)" }} aria-hidden="true" /><span className="text-xs font-semibold" style={{ color: "var(--text)" }}>Veiligheid</span><CaretRight size={14} aria-hidden="true" /></button>}
              </div>

              <StatusOptionRows current={currentEntry?.status ?? null} onSelect={(status) => handleSelect(current, status)} />

              <section data-testid="question-agreements" className="min-h-0 border-t pb-2 pt-2.5" style={{ borderColor: "color-mix(in srgb, var(--border) 88%, transparent)" }}>
                <p data-testid="question-agreements-label" className="mb-2 text-xs font-semibold" style={{ color: "var(--text)" }}>Afspraken <span className="font-normal" style={{ color: "var(--text2)" }}>· optioneel</span></p>
                <div className="grid grid-cols-2 gap-2">{AGREEMENTS.map((agreement) => { const active = currentEntry?.tags?.includes(agreement.value) ?? false; return <button key={agreement.value} type="button" data-tour={agreement.tour} onClick={() => toggleAgreement(agreement.value)} aria-pressed={active} className="focus-ring inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.99] motion-reduce:active:scale-100 motion-reduce:transition-none" style={active ? { color: agreement.emphasized ? "var(--accent)" : "var(--text)", background: agreement.emphasized ? "color-mix(in srgb, var(--accent) 10%, var(--surface2))" : "color-mix(in srgb, var(--surface3) 82%, transparent)", border: `1px solid ${agreement.emphasized ? "color-mix(in srgb, var(--accent) 34%, var(--border))" : "color-mix(in srgb, var(--text2) 20%, var(--border))"}` } : { color: "var(--text2)", background: "color-mix(in srgb, var(--surface2) 76%, transparent)", border: "1px solid color-mix(in srgb, var(--border) 92%, var(--text2))" }}>{active ? <Check size={13} weight="bold" aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />}{agreement.label}</button>; })}</div>
              </section>

              <div className="flex min-h-0 items-center gap-3"><span data-testid="question-progress" className="min-w-0 flex-1 truncate text-xs tabular-nums" style={{ color: "var(--text2)" }}>{progressLabel ?? `${totalDone} van ${kinks.length} beoordeeld`}</span><button type="button" onClick={() => skip(current)} className="focus-ring inline-flex h-11 items-center gap-1 rounded-full px-3 text-xs transition-[transform,background-color,color] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none" style={{ color: "var(--text2)", background: "color-mix(in srgb, var(--surface2) 66%, transparent)" }}>Later <ArrowRight size={13} aria-hidden="true" /></button></div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-5 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}><p className="text-lg italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--text)" }}>{skippedUnansweredCount > 0 ? "Voor nu klaar." : "Alles beoordeeld."}</p><p className="mt-1 text-xs tabular-nums" style={{ color: "var(--text2)" }}>{progressLabel ?? `${totalDone} van ${kinks.length} beoordeeld`}. Tik een kink hieronder om bij te stellen.</p>{skippedUnansweredCount > 0 && <button onClick={() => setSkipped(new Set())} className="focus-ring mt-3 h-9 rounded-lg border px-4 text-xs transition-colors" style={{ color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)" }}>{skippedUnansweredCount} overgeslagen. Toon opnieuw</button>}</div>
        )}
      </div>

      {current && presentation.hasDetails && <Sheet open={detailOpen} onClose={() => setDetailKinkId(null)} scrollable aria-label={`Info en uitleg bij ${presentation.title}`}><SheetContent className="overflow-y-auto overscroll-contain px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3" style={{ maxHeight: "min(calc(var(--visual-viewport-height, 100dvh) - 1rem), 36rem)" }}><div className="flex items-center gap-2"><Info size={20} weight="duotone" style={{ color: "var(--accent)" }} aria-hidden="true" /><h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Info & uitleg</h3></div><p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{presentation.title}</p><div className="mt-4 rounded-xl p-3" style={{ background: "color-mix(in srgb, var(--surface2) 72%, transparent)", border: "1px solid color-mix(in srgb, var(--border) 88%, transparent)" }}><p className="text-xs font-semibold" style={{ color: "var(--text2)" }}>In het kort</p><p data-testid="question-detail-essence" className="mt-1 text-sm leading-6" style={{ color: "var(--text)" }}>{presentation.essence}</p></div>{presentation.details && <div className="mt-4"><p className="text-xs font-semibold" style={{ color: "var(--text2)" }}>Meer context</p><p className="mt-1 text-sm leading-6" style={{ color: "var(--text)" }}>{presentation.details}</p></div>}{current.aliases && current.aliases.length > 0 && <div className="mt-4"><p className="text-xs font-semibold" style={{ color: "var(--text2)" }}>Ook bekend als</p><p className="mt-1 text-sm leading-6" style={{ color: "var(--text)" }}>{current.aliases.join(" · ")}</p></div>}<button type="button" onClick={() => setDetailKinkId(null)} className="focus-ring mt-5 min-h-12 w-full rounded-xl text-sm font-semibold" style={{ border: "1px solid var(--border)", color: "var(--text2)" }}>Sluit</button></SheetContent></Sheet>}
      {current?.safetyNote && <Sheet open={safetyOpen} onClose={() => setSafetyKinkId(null)} scrollable aria-label={`Veiligheid bij ${presentation.title}`}><SheetContent className="overflow-y-auto overscroll-contain px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3" style={{ maxHeight: "min(calc(var(--visual-viewport-height, 100dvh) - 1rem), 32rem)" }}><div className="flex items-center gap-2"><ShieldCheck size={20} weight="duotone" style={{ color: "var(--accent)" }} aria-hidden="true" /><h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Veiligheid</h3></div><p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{presentation.title}</p><p className="mt-4 text-sm leading-6" style={{ color: "var(--text)" }}>{current.safetyNote}</p><button type="button" onClick={() => setSafetyKinkId(null)} className="focus-ring mt-5 min-h-12 w-full rounded-xl text-sm font-semibold" style={{ border: "1px solid var(--border)", color: "var(--text2)" }}>Sluit</button></SheetContent></Sheet>}
      {categoryDetail && categoryCopy && <Sheet open onClose={() => setCategoryDetail(null)} scrollable aria-label={`Over ${kinkCategoryLabel(categoryDetail)}`}><SheetContent className="overflow-y-auto overscroll-contain px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3" style={{ maxHeight: "min(calc(var(--visual-viewport-height, 100dvh) - 1rem), 30rem)" }}><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_ACCENT[categoryDetail] }} aria-hidden="true" /><h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>{kinkCategoryLabel(categoryDetail)}</h3></div><p className="mt-4 text-sm leading-6" style={{ color: "var(--text)" }}>{categoryCopy}</p><p className="mt-3 text-xs leading-5" style={{ color: "var(--text2)" }}>Deze uitleg helpt termen herkennen. Ze vult niets voor je in en verandert geen antwoorden.</p><button type="button" onClick={() => setCategoryDetail(null)} className="focus-ring mt-5 min-h-12 w-full rounded-xl text-sm font-semibold" style={{ border: "1px solid var(--border)", color: "var(--text2)" }}>Begrepen</button></SheetContent></Sheet>}
    </>
  );
}
