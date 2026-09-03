"use client";
import { Check, Eye, EyeSlash, Star, WarningCircle } from "@phosphor-icons/react";
import type { Kink, KinkEntry, KinkStatus } from "@/types";
import { kinkCategoryLabel } from "@/lib/kinkCategories";
import { STATUS_LABEL } from "@/lib/statusLabels";
import Sheet from "./Sheet";
import StatusOptionRows from "./StatusOptionRows";
import ClampText from "./ui/ClampText";

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

  return (
    <Sheet
      open={kink !== null}
      onClose={onClose}
      scrollable
      variant="task"
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
        {kink && entry.status ? `Status: ${STATUS_LABEL[entry.status]}.` : ""}
        {entry.privateResponse ? " Antwoord is privé." : ""}
      </div>

      <StatusOptionRows current={entry.status} onSelect={onStatusChange} />

      <section className="mt-4">
        <div className="mb-2 flex items-center gap-2">
          <WarningCircle size={16} weight="duotone" style={{ color: "var(--accent)" }} aria-hidden="true" />
          <h3 className="text-sm font-semibold">Afspraken</h3>
        </div>
        <div className="overflow-hidden rounded-xl" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          {AGREEMENTS.map((agreement, index) => {
            const active = tags.includes(agreement.value);
            return (
              <button
                type="button"
                key={agreement.value}
                onClick={() => toggleTag(agreement.value)}
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
                  <span className="block text-sm font-semibold">{agreement.label}</span>
                  <span className="mt-0.5 block text-sm leading-5" style={{ color: "var(--text2)" }}>
                    {agreement.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-4">
        <h3 className="mb-2 text-sm font-semibold">Zichtbaarheid &amp; context</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onCuriousChange(!entry.curious)}
            aria-pressed={!!entry.curious}
            className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors"
            style={entry.curious
              ? { background: "color-mix(in srgb, var(--curious) 16%, transparent)", borderColor: "var(--curious)", color: "var(--curious)" }
              : { background: "var(--tag-muted)", borderColor: "var(--border)", color: "var(--text2)" }}
          >
            <Star size={12} weight={entry.curious ? "fill" : "regular"} aria-hidden="true" />
            Nieuwsgierig
          </button>
          <button
            type="button"
            data-tour="private"
            onClick={() => onPrivateChange(!entry.privateResponse)}
            aria-pressed={!!entry.privateResponse}
            aria-label={entry.privateResponse ? "Antwoord niet langer privé maken" : "Antwoord privé maken"}
            className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors"
            style={entry.privateResponse
              ? { background: "color-mix(in srgb, var(--accent) 14%, transparent)", borderColor: "var(--accent)", color: "var(--accent)" }
              : { background: "var(--tag-muted)", borderColor: "var(--border)", color: "var(--text2)" }}
          >
            {entry.privateResponse
              ? <EyeSlash size={13} weight="bold" aria-hidden="true" />
              : <Eye size={13} aria-hidden="true" />}
            Privé antwoord
          </button>
          {CONTEXT_TAGS.map((tag) => {
            const active = tags.includes(tag.value);
            return (
              <button
                type="button"
                key={tag.value}
                onClick={() => toggleTag(tag.value)}
                aria-pressed={active}
                className="focus-ring min-h-11 rounded-full border px-3 text-sm transition-colors"
                style={{
                  background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--tag-muted)",
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  color: active ? "var(--accent)" : "var(--text2)",
                }}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
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
