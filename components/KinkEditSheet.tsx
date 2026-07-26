"use client";
import { Eye, EyeSlash, Star } from "@phosphor-icons/react";
import type { Kink, KinkEntry, KinkStatus } from "@/types";
import { STATUS_LABEL } from "@/lib/statusLabels";
import Sheet, { SheetContent } from "./Sheet";
import StatusOptionRows from "./StatusOptionRows";
import ClampText from "./ui/ClampText";

const TAGS = ["eerste keer", "alleen privé", "scène specifiek", "vraag eerst"] as const;

interface Props {
  kink: Kink | null;
  entry: KinkEntry;
  onClose: () => void;
  onStatusChange: (s: KinkStatus) => void;
  onTagsChange: (tags: string[]) => void;
  onCuriousChange: (v: boolean) => void;
  onPrivateChange: (v: boolean) => void;
}

// Reopen a verdict: same five rows as the deck, plus vlaggen, nieuwsgierig en privé.
export default function KinkEditSheet({
  kink, entry, onClose,
  onStatusChange, onTagsChange, onCuriousChange, onPrivateChange,
}: Props) {
  const tags = entry.tags ?? [];

  function toggleTag(tag: string) {
    onTagsChange(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]);
  }

  return (
    <Sheet open={kink !== null} onClose={onClose} aria-label={kink ? `${kink.name} bewerken` : "Kink bewerken"}>
      <SheetContent>
        <p className="text-xs mb-0.5" style={{ color: "var(--text2)" }}>{kink?.category}</p>
        <h2
          className="text-xl leading-tight mb-1"
          style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
        >
          {kink?.name ?? ""}
        </h2>
        {kink?.description && (
          <ClampText text={kink.description} className="text-sm mb-4" style={{ color: "var(--text2)" }} />
        )}
        {!kink?.description && <div className="mb-3" />}

        {/* Screen readers hear the verdict change — the deck already
            announces; the edit sheet was silent until now. */}
        <div aria-live="polite" className="sr-only">
          {kink && entry.status ? `Status: ${STATUS_LABEL[entry.status]}.` : ""}
          {entry.privateResponse ? " Antwoord is privé." : ""}
        </div>

        <StatusOptionRows current={entry.status} onSelect={onStatusChange} />

        <div className="flex items-center gap-1.5 mt-4 flex-wrap">
          <button
            type="button"
            onClick={() => onCuriousChange(!entry.curious)}
            aria-pressed={!!entry.curious}
            className="focus-ring rounded-full border transition-colors text-xs px-2.5 min-h-9 inline-flex items-center gap-1"
            style={
              entry.curious
                ? { background: "color-mix(in srgb, var(--curious) 20%, transparent)", borderColor: "var(--curious)", color: "var(--curious)" }
                : { background: "var(--tag-muted)", borderColor: "var(--border)", color: "var(--text2)" }
            }
          >
            <Star size={11} weight={entry.curious ? "fill" : "regular"} aria-hidden="true" />
            Nieuwsgierig
          </button>
          <button
            type="button"
            data-tour="private"
            onClick={() => onPrivateChange(!entry.privateResponse)}
            aria-pressed={!!entry.privateResponse}
            aria-label={entry.privateResponse ? "Antwoord niet langer privé maken" : "Antwoord privé maken"}
            className="focus-ring rounded-full border transition-colors text-xs px-2.5 min-h-9 inline-flex items-center gap-1"
            style={
              entry.privateResponse
                ? { background: "color-mix(in srgb, var(--accent) 20%, transparent)", borderColor: "var(--accent)", color: "var(--accent)" }
                : { background: "var(--tag-muted)", borderColor: "var(--border)", color: "var(--text2)" }
            }
          >
            {entry.privateResponse
              ? <EyeSlash size={12} weight="bold" aria-hidden="true" />
              : <Eye size={12} aria-hidden="true" />}
            Privé
          </button>
          {TAGS.map((tag) => {
            const active = tags.includes(tag);
            return (
              <button
                type="button"
                key={tag}
                onClick={() => toggleTag(tag)}
                aria-pressed={active}
                className="focus-ring rounded-full border transition-colors text-xs px-2.5 min-h-9"
                style={{
                  background: active ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--tag-muted)",
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  color: active ? "var(--accent)" : "var(--text2)",
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
