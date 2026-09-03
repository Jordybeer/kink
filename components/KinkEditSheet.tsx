"use client";
import { Check, Eye, EyeSlash, Star } from "@phosphor-icons/react";
import type { Kink, KinkEntry, KinkStatus } from "@/types";
import { kinkCategoryLabel } from "@/lib/kinkCategories";
import { STATUS_LABEL } from "@/lib/statusLabels";
import Sheet from "./Sheet";
import StatusOptionRows from "./StatusOptionRows";
import ClampText from "./ui/ClampText";

const CONDITION_TAGS = [
  {
    value: "vraag eerst",
    label: "Eerst vragen",
    description: "Vraag opnieuw voordat dit onderdeel van een scène wordt.",
  },
  {
    value: "alleen privé",
    label: "Alleen privé",
    description: "Alleen in een volledig private setting.",
  },
  {
    value: "scène specifiek",
    label: "Alleen afgesproken",
    description: "Alleen wanneer dit vooraf voor de scène is afgesproken.",
  },
] as const;

type RowIcon = "check" | "star" | "privacy";

function ChoiceRow({
  label,
  description,
  active,
  onClick,
  icon = "check",
  tone = "accent",
  dataTour,
  ariaLabel,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
  icon?: RowIcon;
  tone?: "accent" | "curious";
  dataTour?: string;
  ariaLabel?: string;
}) {
  const colour = tone === "curious" ? "var(--curious)" : "var(--accent)";
  return (
    <button
      type="button"
      data-tour={dataTour}
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className="focus-ring flex min-h-[56px] w-full items-center gap-3 rounded-lg px-1.5 py-2.5 text-left transition-colors duration-150"
      style={{ background: active ? `color-mix(in srgb, ${colour} 6%, transparent)` : "transparent" }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-5" style={{ color: "var(--text)" }}>{label}</span>
        <span className="mt-0.5 block text-sm leading-5" style={{ color: "var(--text2)" }}>{description}</span>
      </span>
      <span
        aria-hidden="true"
        className="flex h-7 w-7 flex-none items-center justify-center rounded-full"
        style={{
          color: active ? colour : "var(--text2)",
          background: active ? `color-mix(in srgb, ${colour} 12%, transparent)` : "transparent",
          border: `1px solid ${active ? colour : "var(--border-bright)"}`,
        }}
      >
        {icon === "star"
          ? <Star size={13} weight={active ? "fill" : "regular"} />
          : icon === "privacy"
            ? active ? <EyeSlash size={14} weight="bold" /> : <Eye size={14} />
            : active ? <Check size={13} weight="bold" /> : null}
      </span>
    </button>
  );
}

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

  return (
    <Sheet
      open={kink !== null}
      onClose={onClose}
      scrollable
      variant="task"
      title={kink?.name ?? "Kink bewerken"}
      aria-label={kink ? `${kink.name} bewerken` : "Kink bewerken"}
    >
      <div className="mb-4 px-1">
        <p className="text-sm" style={{ color: "var(--text2)" }}>
          {kink ? kinkCategoryLabel(kink.category) : ""}
        </p>
        {kink?.description && (
          <ClampText text={kink.description} className="mt-1.5 text-sm" style={{ color: "var(--text2)" }} />
        )}
      </div>

      {kink?.safetyNote && (
        <aside
          className="mb-5 ml-1 border-l-2 pl-3 text-sm leading-5"
          style={{ borderColor: "var(--border-accent)", color: "var(--text2)" }}
        >
          <p className="font-semibold" style={{ color: "var(--text)" }}>Veiligheid</p>
          <p className="mt-1">{kink.safetyNote}</p>
        </aside>
      )}

      <div aria-live="polite" className="sr-only">
        {kink && entry.status ? `Status: ${STATUS_LABEL[entry.status]}.` : "Geen antwoord gekozen."}
        {entry.privateResponse ? " Antwoord is privé." : ""}
      </div>

      <section aria-labelledby="kink-answer-heading">
        <div className="mb-2 flex min-h-8 items-center justify-between gap-3 px-1">
          <h3 id="kink-answer-heading" className="text-sm font-semibold">Jouw antwoord</h3>
          {entry.status && (
            <button
              type="button"
              onClick={() => onStatusChange(null)}
              className="focus-ring min-h-8 flex-none rounded-lg px-2 text-sm font-medium"
              style={{ color: "var(--text2)" }}
            >
              Wis antwoord
            </button>
          )}
        </div>
        <StatusOptionRows current={entry.status} onSelect={onStatusChange} />
      </section>

      <section className="mt-5" aria-labelledby="kink-conditions-heading">
        <h3 id="kink-conditions-heading" className="mb-1 px-1 text-sm font-semibold">Voorwaarden</h3>
        <div className="space-y-0.5">
          {CONDITION_TAGS.map((item) => (
            <ChoiceRow
              key={item.value}
              label={item.label}
              description={item.description}
              active={tags.includes(item.value)}
              onClick={() => toggleTag(item.value)}
            />
          ))}
        </div>
      </section>

      <section className="mt-5" aria-labelledby="kink-experience-heading">
        <h3 id="kink-experience-heading" className="mb-1 px-1 text-sm font-semibold">Ervaring &amp; interesse</h3>
        <div className="space-y-0.5">
          <ChoiceRow
            label="Weinig ervaring"
            description="Hier heb ik nog geen of weinig praktijkervaring mee."
            active={tags.includes("eerste keer")}
            onClick={() => toggleTag("eerste keer")}
          />
          <ChoiceRow
            label="Nieuwsgierig"
            description="Ik wil dit verder verkennen."
            active={!!entry.curious}
            onClick={() => onCuriousChange(!entry.curious)}
            icon="star"
            tone="curious"
          />
        </div>
      </section>

      <section className="mt-5 pb-1" aria-labelledby="kink-visibility-heading">
        <h3 id="kink-visibility-heading" className="mb-1 px-1 text-sm font-semibold">Zichtbaarheid</h3>
        <ChoiceRow
          label="Privé antwoord"
          description="Verberg mijn antwoord wanneer dit profiel wordt bekeken."
          active={!!entry.privateResponse}
          onClick={() => onPrivateChange(!entry.privateResponse)}
          icon="privacy"
          dataTour="private"
          ariaLabel={entry.privateResponse ? "Antwoord niet langer privé maken" : "Antwoord privé maken"}
        />
      </section>
    </Sheet>
  );
}
