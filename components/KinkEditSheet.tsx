"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Eye, EyeSlash, Star } from "@phosphor-icons/react";
import type { Kink, KinkEntry, KinkStatus } from "@/types";
import { kinkCategoryLabel } from "@/lib/kinkCategories";
import { useMotionSafe } from "@/lib/motion";
import { STATUS_LABEL } from "@/lib/statusLabels";
import Sheet, { SheetContent } from "./Sheet";
import StatusOptionRows from "./StatusOptionRows";

const AGREEMENTS = [
  {
    value: "vraag eerst",
    label: "Eerst vragen",
    description: "Niet aannemen op basis van dit profiel; vraag het opnieuw in de situatie zelf.",
  },
  {
    value: "eerste keer",
    label: "Eerste keer",
    description: "Hier is nog geen of weinig praktijkervaring mee.",
  },
] as const;

const CONTEXT_TAGS = [
  { value: "alleen privé", label: "Alleen in privésfeer" },
  { value: "scène specifiek", label: "Alleen voor afgesproken scène" },
] as const;

type TopicEditStep = 1 | 2;

interface Props {
  kink: Kink | null;
  entry: KinkEntry;
  onClose: () => void;
  onStatusChange: (s: KinkStatus) => void;
  onTagsChange: (tags: string[]) => void;
  onCuriousChange: (v: boolean) => void;
  onPrivateChange: (v: boolean) => void;
}

export default function KinkEditSheet({
  kink,
  entry,
  onClose,
  onStatusChange,
  onTagsChange,
  onCuriousChange,
  onPrivateChange,
}: Props) {
  const [step, setStep] = useState<TopicEditStep>(1);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStepRef = useRef<TopicEditStep>(1);
  const tags = entry.tags ?? [];

  useEffect(() => {
    setStep(1);
    previousStepRef.current = 1;
  }, [kink?.id]);

  useEffect(() => {
    if (!kink) return;
    scrollBodyRef.current?.scrollTo({ top: 0 });
    if (previousStepRef.current !== step) {
      const frame = window.requestAnimationFrame(() => {
        stepHeadingRef.current?.focus({ preventScroll: true });
      });
      previousStepRef.current = step;
      return () => window.cancelAnimationFrame(frame);
    }
    previousStepRef.current = step;
  }, [kink, step]);

  function toggleTag(tag: string) {
    onTagsChange(tags.includes(tag) ? tags.filter((candidate) => candidate !== tag) : [...tags, tag]);
  }

  const contextOptions = [
    {
      label: "Nieuwsgierig",
      active: !!entry.curious,
      onClick: () => onCuriousChange(!entry.curious),
      icon: <Star size={18} weight={entry.curious ? "fill" : "regular"} aria-hidden="true" />,
    },
    ...CONTEXT_TAGS.map((tag) => ({
      label: tag.label,
      active: tags.includes(tag.value),
      onClick: () => toggleTag(tag.value),
      icon: null,
    })),
  ];

  return (
    <Sheet
      open={kink !== null}
      onClose={onClose}
      variant="surface"
      aria-label={kink ? `${kink.name} bewerken` : "Kink bewerken"}
    >
      <SheetContent
        showClose={false}
        showHandle={false}
        className="flex h-[calc(var(--visual-viewport-height,100dvh)-env(safe-area-inset-top)-var(--sheet-edge-clearance))] flex-col overflow-hidden rounded-t-[24px] px-0 pb-0 pt-0 sm:h-auto sm:min-h-[36rem] sm:max-h-[min(44rem,calc(100dvh-3rem))] sm:rounded-[24px]"
        style={{
          maxHeight: "calc(var(--visual-viewport-height, 100dvh) - env(safe-area-inset-top) - var(--sheet-edge-clearance))",
        }}
      >
        <header className="flex-none px-5 pb-2 pt-3" data-testid="kink-edit-header">
          <div className="grid min-h-11 grid-cols-[1fr_auto_1fr] items-center gap-2">
            <span aria-hidden="true" />
            <h2 className="text-base font-semibold">Onderwerp bewerken</h2>
            <button
              type="button"
              onClick={onClose}
              className="focus-ring min-h-11 justify-self-end px-1 text-sm font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Klaar
            </button>
          </div>

          <nav className="mx-auto mt-1 flex max-w-[12rem] items-center gap-3" aria-label="Onderwerpstappen">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-full text-sm font-semibold"
              aria-label={step === 1 ? "Stap 1 van 2: Antwoord, huidig" : "Stap 1 van 2: Antwoord"}
              aria-current={step === 1 ? "step" : undefined}
              style={step === 1
                ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)" }
                : { border: "1px solid var(--border-accent)", color: "var(--text2)" }}
            >
              1
            </button>
            <span className="h-px flex-1" style={{ background: "var(--border)" }} aria-hidden="true" />
            <button
              type="button"
              onClick={() => setStep(2)}
              className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-full text-sm font-semibold"
              aria-label={step === 2 ? "Stap 2 van 2: Details, huidig" : "Stap 2 van 2: Details"}
              aria-current={step === 2 ? "step" : undefined}
              style={step === 2
                ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)" }
                : { border: "1px solid var(--border-accent)", color: "var(--text2)" }}
            >
              2
            </button>
          </nav>
        </header>

        <div
          ref={scrollBodyRef}
          data-testid="kink-edit-scroll-body"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 [overflow-wrap:anywhere]"
        >
          <div aria-live="polite" className="sr-only">
            {kink && entry.status ? `Status: ${STATUS_LABEL[entry.status]}.` : ""}
            {entry.privateResponse ? " Antwoord is privé." : ""}
          </div>

          {step === 1 ? (
            <section data-testid="kink-edit-answer-step">
              <h3
                ref={stepHeadingRef}
                tabIndex={-1}
                className="text-2xl leading-tight focus:outline-none"
                style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600 }}
              >
                {kink?.name ?? ""}
              </h3>
              <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
                {kink ? kinkCategoryLabel(kink.category) : ""}
              </p>

              {kink?.description && (
                <p className="mt-3 text-base leading-7" style={{ color: "var(--text2)" }}>
                  {kink.description}
                </p>
              )}

              {kink?.safetyNote && (
                <section
                  className="mt-5 border-t pt-4"
                  style={{ borderColor: "var(--border)" }}
                  aria-labelledby="kink-edit-safety-title"
                >
                  <h4 id="kink-edit-safety-title" className="text-sm font-semibold">Veiligheid</h4>
                  <p className="mt-1 text-base leading-7" style={{ color: "var(--text2)" }}>
                    {kink.safetyNote}
                  </p>
                </section>
              )}

              <section className="mt-6" aria-labelledby="kink-edit-answer-title">
                <h4 id="kink-edit-answer-title" className="mb-1.5 text-sm font-semibold">Mijn antwoord</h4>
                <StatusOptionRows current={entry.status} onSelect={onStatusChange} presentation="list" />
              </section>
            </section>
          ) : (
            <section data-testid="kink-edit-details-step">
              <h3
                ref={stepHeadingRef}
                tabIndex={-1}
                className="text-2xl leading-tight focus:outline-none"
                style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600 }}
              >
                Details
              </h3>
              <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>
                {kink?.name ?? ""}{kink ? ` · ${kinkCategoryLabel(kink.category)}` : ""}
              </p>

              <section className="mt-5" aria-labelledby="kink-edit-agreements-title">
                <h4 id="kink-edit-agreements-title" className="text-sm font-semibold">Afspraken</h4>
                {AGREEMENTS.map((agreement) => (
                  <ToggleRow
                    key={agreement.value}
                    label={agreement.label}
                    description={agreement.description}
                    active={tags.includes(agreement.value)}
                    onClick={() => toggleTag(agreement.value)}
                  />
                ))}
              </section>

              <section className="mt-5 border-t pt-4" style={{ borderColor: "var(--border)" }} aria-labelledby="kink-edit-visibility-title">
                <h4 id="kink-edit-visibility-title" className="text-sm font-semibold">Zichtbaarheid</h4>
                <ToggleRow
                  label="Privé antwoord"
                  active={!!entry.privateResponse}
                  onClick={() => onPrivateChange(!entry.privateResponse)}
                  ariaLabel={entry.privateResponse ? "Antwoord niet langer privé maken" : "Antwoord privé maken"}
                  privateControl
                  icon={entry.privateResponse
                    ? <EyeSlash size={18} aria-hidden="true" />
                    : <Eye size={18} aria-hidden="true" />}
                />
              </section>

              <section className="mt-5 border-t pt-4" style={{ borderColor: "var(--border)" }} aria-labelledby="kink-edit-context-title">
                <h4 id="kink-edit-context-title" className="text-sm font-semibold">Context</h4>
                {contextOptions.map((option) => <ToggleRow key={option.label} {...option} />)}
              </section>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ToggleRow({
  label,
  description,
  active,
  onClick,
  icon,
  ariaLabel,
  privateControl,
}: {
  label: string;
  description?: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  ariaLabel?: string;
  privateControl?: boolean;
}) {
  const motionSafe = useMotionSafe();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      data-tour={privateControl ? "private" : undefined}
      className="focus-ring flex min-h-11 w-full items-center gap-3 border-b py-2.5 text-left transition-colors duration-150 motion-reduce:transition-none"
      style={{
        borderColor: "var(--border)",
        background: active ? "color-mix(in srgb, var(--accent) 4%, transparent)" : "transparent",
      }}
    >
      {icon && (
        <span className="flex-none" style={{ color: active ? "var(--accent)" : "var(--text2)" }}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium leading-6">{label}</span>
        {description && (
          <span className="mt-0.5 block text-sm leading-5" style={{ color: "var(--text2)" }}>
            {description}
          </span>
        )}
      </span>
      <motion.span
        aria-hidden="true"
        className="flex h-5 w-5 flex-none items-center justify-center rounded-full transition-[background-color,border-color] duration-150 motion-reduce:transition-none"
        animate={{ scale: active ? 1 : 0.94 }}
        transition={motionSafe.state}
        style={{
          border: `1px solid ${active ? "var(--accent)" : "var(--control-border)"}`,
          color: "var(--accent)",
          background: active ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
        }}
      >
        {active && (
          <motion.span
            initial={motionSafe.reduced ? false : { opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={motionSafe.state}
            className="flex"
          >
            <Check size={12} weight="bold" />
          </motion.span>
        )}
      </motion.span>
    </button>
  );
}
