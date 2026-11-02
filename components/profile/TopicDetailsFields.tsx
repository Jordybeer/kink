"use client";
import { motion } from "framer-motion";
import { Check, Eye, EyeSlash, Star } from "@phosphor-icons/react";
import type { KinkEntry } from "@/types";
import { useMotionSafe } from "@/lib/motion";

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
  entry: KinkEntry;
  onChange: (partial: Partial<KinkEntry>) => void;
}

export default function TopicDetailsFields({ entry, onChange }: Props) {
  const tags = entry.tags ?? [];
  function toggleTag(tag: string) {
    onChange({ tags: tags.includes(tag) ? tags.filter((candidate) => candidate !== tag) : [...tags, tag] });
  }
  return <div className="grid min-w-0 gap-5 [overflow-wrap:anywhere]">
    <section aria-label="Afspraken">
      <h4 className="mb-1 text-sm font-semibold">Afspraken</h4>
      {AGREEMENTS.map((agreement) => <ToggleRow key={agreement.value} {...agreement} active={tags.includes(agreement.value)} onClick={() => toggleTag(agreement.value)} />)}
    </section>
    <section aria-label="Zichtbaarheid">
      <h4 className="mb-1 text-sm font-semibold">Zichtbaarheid</h4>
      <ToggleRow label="Privé antwoord" active={!!entry.privateResponse}
        onClick={() => onChange({ privateResponse: !entry.privateResponse })}
        ariaLabel={entry.privateResponse ? "Antwoord niet langer privé maken" : "Antwoord privé maken"}
        privateControl icon={entry.privateResponse ? <EyeSlash size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />} />
    </section>
    <section aria-label="Context">
      <h4 className="mb-1 text-sm font-semibold">Context</h4>
      <ToggleRow label="Nieuwsgierig" active={!!entry.curious} onClick={() => onChange({ curious: !entry.curious })}
        icon={<Star size={18} weight={entry.curious ? "fill" : "regular"} aria-hidden="true" />} />
      {CONTEXT_TAGS.map((tag) => <ToggleRow key={tag.value} label={tag.label} active={tags.includes(tag.value)} onClick={() => toggleTag(tag.value)} />)}
      <label className="mt-4 block text-sm font-medium">
        Persoonlijke context
        <textarea value={entry.comment} onChange={(event) => onChange({ comment: event.target.value })} rows={3}
          className="focus-ring mt-2 block w-full min-w-0 resize-y rounded-lg border px-3 py-2 text-base font-normal"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
      </label>
    </section>
  </div>;
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
      className="ks-motion-choice focus-ring flex min-h-11 w-full items-center gap-3 border-b py-2.5 text-left"
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
        className="flex h-5 w-5 flex-none items-center justify-center rounded-full ks-motion-state"
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
