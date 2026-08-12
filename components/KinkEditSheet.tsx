"use client";
import { Check, Eye, EyeSlash, Star, WarningCircle } from "@phosphor-icons/react";
import type { Kink, KinkEntry, KinkStatus } from "@/types";
import { kinkCategoryLabel } from "@/lib/kinkCategories";
import { STATUS_LABEL } from "@/lib/statusLabels";
import Sheet, { SheetContent } from "./Sheet";
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
    <Sheet open={kink !== null} onClose={onClose} scrollable aria-label={kink ? `${kink.name} bewerken` : "Kink bewerken"}>
      <SheetContent
        className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3"
        style={{ maxHeight: "calc(var(--visual-viewport-height, 100dvh) - max(0.75rem, env(safe-area-inset-top)))" }}
      >
        <p className="text-xs mb-0.5" style={{ color: "var(--text2)" }}>
          {kink ? kinkCategoryLabel(kink.category) : ""}
        </p>
        <h2
          className="text-xl leading-tight mb-1"
          style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
        >
          {kink?.name ?? ""}
        </h2>
        {kink?.description && (
          <ClampText text={kink.description} className="text-sm mb-4" style={{ color: "var(--text2)" }} />
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

        <section className="mt-5">
          <div className="flex items-center gap-2 mb-2">
            <WarningCircle size={16} weight="duotone" style={{ color: "var(--accent)" }} aria-hidden="true" />
            <h3 className="text-sm font-semibold">Afspraken</h3>
          </div>
          <div className="grid gap-2">
            {AGREEMENTS.map((agreement) => {
              const active = tags.includes(agreement.value);
              return (
                <button
                  type="button"
                  key={agreement.value}
                  onClick={() => toggleTag(agreement.value)}
                  aria-pressed={active}
                  className="focus-ring min-h-[62px] rounded-xl px-3 py-2.5 flex items-center gap-3 text-left"
                  style={active
                    ? {
                        background: "color-mix(in srgb, var(--accent) 11%, var(--surface2))",
                        border: "1px solid var(--accent)",
                      }
                    : { background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  <span
                    aria-hidden="true"
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-none"
                    style={{
                      background: active ? "var(--accent)" : "transparent",
                      border: active ? "none" : "1px solid var(--border)",
                      color: active ? "var(--on-accent)" : "transparent",
                    }}
                  >
                    {active && <Check size={12} weight="bold" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{agreement.label}</span>
                    <span className="block text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text2)" }}>
                      {agreement.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-sm font-semibold mb-2">Zichtbaarheid & context</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onCuriousChange(!entry.curious)}
              aria-pressed={!!entry.curious}
              className="focus-ring rounded-full border transition-colors text-xs px-3 min-h-10 inline-flex items-center gap-1.5"
              style={entry.curious
                ? { background: "color-mix(in srgb, var(--curious) 20%, transparent)", borderColor: "var(--curious)", color: "var(--curious)" }
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
              className="focus-ring rounded-full border transition-colors text-xs px-3 min-h-10 inline-flex items-center gap-1.5"
              style={entry.privateResponse
                ? { background: "color-mix(in srgb, var(--accent) 20%, transparent)", borderColor: "var(--accent)", color: "var(--accent)" }
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
                  className="focus-ring rounded-full border transition-colors text-xs px-3 min-h-10"
                  style={{
                    background: active ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--tag-muted)",
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
          className="focus-ring w-full min-h-12 rounded-xl mt-6 text-sm font-semibold"
          style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
        >
          Klaar
        </button>
      </SheetContent>
    </Sheet>
  );
}
