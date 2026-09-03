"use client";
import { Check } from "@phosphor-icons/react";
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
    label: "Alleen na afspraak",
    description: "Alleen wanneer dit vooraf voor de scène is afgesproken.",
  },
] as const;

function ChoiceRow({
  label,
  description,
  active,
  onClick,
  divider = false,
  dataTour,
  ariaLabel,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
  divider?: boolean;
  dataTour?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      data-tour={dataTour}
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className="focus-ring flex min-h-12 w-full items-center gap-3 px-1 py-2 text-left transition-colors duration-150"
      style={{
        borderTop: divider ? "1px solid color-mix(in srgb, var(--border) 72%, transparent)" : undefined,
        background: active ? "color-mix(in srgb, var(--accent) 5%, transparent)" : "transparent",
      }}
    >
      <span className="min-w-0 flex-1 text-sm font-medium leading-5" style={{ color: "var(--text)" }}>
        {label}
        <span className="sr-only">. {description}</span>
      </span>
      <span
        aria-hidden="true"
        className="flex h-6 w-6 flex-none items-center justify-center rounded-full"
        style={{
          color: active ? "var(--on-accent)" : "transparent",
          background: active ? "var(--accent)" : "transparent",
          border: `1px solid ${active ? "var(--accent)" : "var(--border-bright)"}`,
        }}
      >
        {active && <Check size={12} weight="bold" />}
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
          className="mb-4 ml-1 border-l-2 pl-3 text-sm leading-5"
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

      <section className="mt-4 border-t pt-4" aria-labelledby="kink-conditions-heading" style={{ borderColor: "var(--border)" }}>
        <h3 id="kink-conditions-heading" className="mb-1 px-1 text-xs font-semibold" style={{ color: "var(--text2)" }}>
          Voorwaarden
        </h3>
        <div className="border-y" style={{ borderColor: "var(--border)" }}>
          {CONDITION_TAGS.map((item, index) => (
            <ChoiceRow
              key={item.value}
              label={item.label}
              description={item.description}
              active={tags.includes(item.value)}
              onClick={() => toggleTag(item.value)}
              divider={index > 0}
            />
          ))}
        </div>
      </section>

      <section className="mt-4" aria-labelledby="kink-experience-heading">
        <h3 id="kink-experience-heading" className="mb-1 px-1 text-xs font-semibold" style={{ color: "var(--text2)" }}>
          Ervaring &amp; interesse
        </h3>
        <div className="border-y" style={{ borderColor: "var(--border)" }}>
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
            divider
          />
        </div>
      </section>

      <section className="mt-4 pb-1" aria-labelledby="kink-visibility-heading">
        <h3 id="kink-visibility-heading" className="mb-1 px-1 text-xs font-semibold" style={{ color: "var(--text2)" }}>
          Zichtbaarheid
        </h3>
        <div className="border-y" style={{ borderColor: "var(--border)" }}>
          <ChoiceRow
            label="Privé antwoord"
            description="Verberg mijn antwoord wanneer dit profiel wordt bekeken."
            active={!!entry.privateResponse}
            onClick={() => onPrivateChange(!entry.privateResponse)}
            dataTour="private"
            ariaLabel={entry.privateResponse ? "Antwoord niet langer privé maken" : "Antwoord privé maken"}
          />
        </div>
      </section>
    </Sheet>
  );
}
