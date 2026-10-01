"use client";
import { motion } from "framer-motion";
import { Check, Eye, EyeSlash, Star } from "@phosphor-icons/react";
import type { Kink, KinkEntry, KinkStatus } from "@/types";
import { kinkCategoryLabel } from "@/lib/kinkCategories";
import { useMotionSafe } from "@/lib/motion";
import { STATUS_LABEL } from "@/lib/statusLabels";
import Sheet from "./Sheet";
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
  const tags = entry.tags ?? [];

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
      scrollable
      variant="task"
      title="Onderwerp bewerken"
      aria-label={kink ? `${kink.name} bewerken` : "Kink bewerken"}
      footer={(
        <button
          type="button"
          onClick={onClose}
          className="focus-ring min-h-12 w-full rounded-full text-base font-semibold"
          style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
        >
          Klaar
        </button>
      )}
    >
      <div data-testid="kink-edit-content" className="[overflow-wrap:anywhere]">
        <h3
          className="text-2xl leading-tight"
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
          <section className="mt-5 border-t pt-4" style={{ borderColor: "var(--border)" }} aria-labelledby="kink-edit-safety-title">
            <h4 id="kink-edit-safety-title" className="text-sm font-semibold">Veiligheid</h4>
            <p className="mt-1 text-base leading-7" style={{ color: "var(--text2)" }}>
              {kink.safetyNote}
            </p>
          </section>
        )}

        <div aria-live="polite" className="sr-only">
          {kink && entry.status ? `Status: ${STATUS_LABEL[entry.status]}.` : ""}
          {entry.privateResponse ? " Antwoord is privé." : ""}
        </div>

        <section className="mt-6" aria-labelledby="kink-edit-answer-title">
          <h4 id="kink-edit-answer-title" className="mb-1.5 text-sm font-semibold">Mijn antwoord</h4>
          <StatusOptionRows current={entry.status} onSelect={onStatusChange} presentation="list" />
        </section>

        <section className="mt-5 border-t pt-4" style={{ borderColor: "var(--border)" }} aria-labelledby="kink-edit-agreements-title">
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
      </div>
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
