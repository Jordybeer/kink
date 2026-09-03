"use client";
import { Check, Eye, EyeSlash, Star, WarningCircle } from "@phosphor-icons/react";
import type { Kink, KinkEntry, KinkStatus } from "@/types";
import { kinkCategoryLabel } from "@/lib/kinkCategories";
import { STATUS_LABEL } from "@/lib/statusLabels";
import Sheet from "./Sheet";
import StatusOptionRows from "./StatusOptionRows";
import ClampText from "./ui/ClampText";

const BOUNDARY_TAGS = [
  {
    value: "vraag eerst",
    label: "Eerst vragen",
    description: "Niet aannemen op basis van dit profiel. Vraag het opnieuw in de situatie zelf.",
  },
  {
    value: "alleen privé",
    label: "Alleen in privésfeer",
    description: "Alleen wanneer de setting echt privé is.",
  },
  {
    value: "scène specifiek",
    label: "Alleen voor afgesproken scène",
    description: "Geen algemene toestemming. Alleen binnen een vooraf afgesproken scène.",
  },
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

  return (
    <Sheet
      open={kink !== null}
      onClose={onClose}
      scrollable
      variant="task"
      title="Kink bewerken"
      aria-label={kink ? `${kink.name} bewerken` : "Kink bewerken"}
    >
      <p className="mb-0.5 text-xs" style={{ color: "var(--text2)" }}>
        {kink ? kinkCategoryLabel(kink.category) : ""}
      </p>
      <h2
        className="mb-1 text-xl leading-tight"
        style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
      >
        {kink?.name ?? ""}
      </h2>
      {kink?.description && (
        <ClampText text={kink.description} className="mb-4 text-sm" style={{ color: "var(--text2)" }} />
      )}
      {kink?.safetyNote && (
        <aside
          className="mb-4 rounded-xl px-3 py-3 text-sm leading-relaxed"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}
        >
          <p className="font-semibold" style={{ color: "var(--text)" }}>Veiligheid</p>
          <p className="mt-1">{kink.safetyNote}</p>
        </aside>
      )}
      {!kink?.description && !kink?.safetyNote && <div className="mb-3" />}

      <div aria-live="polite" className="sr-only">
        {kink && entry.status ? `Status: ${STATUS_LABEL[entry.status]}.` : "Geen antwoord gekozen."}
        {entry.privateResponse ? " Antwoord is privé." : ""}
      </div>

      <section aria-labelledby="kink-answer-heading">
        <h3 id="kink-answer-heading" className="mb-2 text-sm font-semibold">Jouw antwoord</h3>
        <StatusOptionRows current={entry.status} onSelect={onStatusChange} />
        <div className="mt-2 flex min-h-9 items-center justify-between gap-3">
          <p className="text-xs leading-5" style={{ color: "var(--text2)" }}>
            Je wijzigingen worden meteen opgeslagen.
          </p>
          {entry.status && (
            <button
              type="button"
              onClick={() => onStatusChange(null)}
              className="focus-ring min-h-9 flex-none rounded-lg px-2 text-xs font-semibold"
              style={{ color: "var(--text2)" }}
            >
              Antwoord wissen
            </button>
          )}
        </div>
      </section>

      <section className="mt-4" aria-labelledby="kink-boundaries-heading">
        <div className="mb-2 flex items-center gap-2">
          <WarningCircle size={16} weight="duotone" style={{ color: "var(--accent)" }} aria-hidden="true" />
          <h3 id="kink-boundaries-heading" className="text-sm font-semibold">Grenzen &amp; afspraken</h3>
        </div>
        <div className="overflow-hidden rounded-xl" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          {BOUNDARY_TAGS.map((item, index) => {
            const active = tags.includes(item.value);
            return (
              <button
                type="button"
                key={item.value}
                onClick={() => toggleTag(item.value)}
                aria-pressed={active}
                className="focus-ring flex min-h-[60px] w-full items-center gap-3 px-3 py-2.5 text-left"
                style={{
                  background: active ? "color-mix(in srgb, var(--accent) 8%, var(--surface2))" : "transparent",
                  borderTop: index > 0 ? "1px solid var(--border)" : undefined,
                }}
              >
                <span
                  aria-hidden="true"
                  className="flex h-5 w-5 flex-none items-center justify-center rounded-full"
                  style={{
                    background: active ? "var(--accent)" : "transparent",
                    border: active ? "none" : "1px solid var(--border-bright)",
                    color: active ? "var(--on-accent)" : "transparent",
                  }}
                >
                  {active && <Check size={12} weight="bold" aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-sm leading-5" style={{ color: "var(--text2)" }}>
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-4" aria-labelledby="kink-experience-heading">
        <h3 id="kink-experience-heading" className="mb-2 text-sm font-semibold">Ervaring &amp; interesse</h3>
        <div className="overflow-hidden rounded-xl" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <button
            type="button"
            onClick={() => toggleTag("eerste keer")}
            aria-pressed={tags.includes("eerste keer")}
            className="focus-ring flex min-h-[60px] w-full items-center gap-3 px-3 py-2.5 text-left"
            style={{ background: tags.includes("eerste keer") ? "color-mix(in srgb, var(--accent) 8%, var(--surface2))" : "transparent" }}
          >
            <span
              aria-hidden="true"
              className="flex h-5 w-5 flex-none items-center justify-center rounded-full"
              style={{
                background: tags.includes("eerste keer") ? "var(--accent)" : "transparent",
                border: tags.includes("eerste keer") ? "none" : "1px solid var(--border-bright)",
                color: tags.includes("eerste keer") ? "var(--on-accent)" : "transparent",
              }}
            >
              {tags.includes("eerste keer") && <Check size={12} weight="bold" aria-hidden="true" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Eerste keer</span>
              <span className="mt-0.5 block text-sm leading-5" style={{ color: "var(--text2)" }}>
                Hier heb ik nog geen of weinig praktijkervaring mee.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onCuriousChange(!entry.curious)}
            aria-pressed={!!entry.curious}
            className="focus-ring flex min-h-[60px] w-full items-center gap-3 border-t px-3 py-2.5 text-left"
            style={{
              borderColor: "var(--border)",
              background: entry.curious ? "color-mix(in srgb, var(--curious) 10%, var(--surface2))" : "transparent",
            }}
          >
            <span
              aria-hidden="true"
              className="flex h-5 w-5 flex-none items-center justify-center rounded-full"
              style={{
                color: entry.curious ? "var(--curious)" : "var(--text2)",
                border: entry.curious ? "1px solid var(--curious)" : "1px solid var(--border-bright)",
                background: entry.curious ? "color-mix(in srgb, var(--curious) 14%, transparent)" : "transparent",
              }}
            >
              <Star size={11} weight={entry.curious ? "fill" : "regular"} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Nieuwsgierig</span>
              <span className="mt-0.5 block text-sm leading-5" style={{ color: "var(--text2)" }}>
                Markeer interesse zonder je antwoord te veranderen.
              </span>
            </span>
          </button>
        </div>
      </section>

      <section className="mt-4" aria-labelledby="kink-visibility-heading">
        <h3 id="kink-visibility-heading" className="mb-2 text-sm font-semibold">Zichtbaarheid</h3>
        <button
          type="button"
          data-tour="private"
          onClick={() => onPrivateChange(!entry.privateResponse)}
          aria-pressed={!!entry.privateResponse}
          aria-label={entry.privateResponse ? "Antwoord niet langer privé maken" : "Antwoord privé maken"}
          className="focus-ring flex min-h-[60px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
          style={{
            background: entry.privateResponse ? "color-mix(in srgb, var(--accent) 8%, var(--surface2))" : "var(--surface2)",
            border: `1px solid ${entry.privateResponse ? "var(--accent)" : "var(--border)"}`,
          }}
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
            style={{ color: entry.privateResponse ? "var(--accent)" : "var(--text2)", background: "var(--tag-muted)" }}
          >
            {entry.privateResponse ? <EyeSlash size={15} weight="bold" /> : <Eye size={15} />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Privé antwoord</span>
            <span className="mt-0.5 block text-sm leading-5" style={{ color: "var(--text2)" }}>
              Verberg je antwoord standaard wanneer dit profiel wordt bekeken.
            </span>
          </span>
        </button>
      </section>

      <button
        type="button"
        onClick={onClose}
        className="focus-ring mt-5 min-h-12 w-full rounded-xl text-sm font-semibold"
        style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
      >
        Klaar
      </button>
    </Sheet>
  );
}
