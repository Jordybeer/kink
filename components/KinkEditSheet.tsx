"use client";
import { Star } from "lucide-react";
import type { Kink, KinkEntry, KinkStatus } from "@/types";
import Sheet, { SheetContent } from "./Sheet";
import StatusOptionRows from "./StatusOptionRows";

const TAGS = ["eerste keer", "alleen privé", "scène specifiek", "vraag eerst"] as const;

interface Props {
  kink: Kink | null;
  entry: KinkEntry;
  onClose: () => void;
  onStatusChange: (s: KinkStatus) => void;
  onTagsChange: (tags: string[]) => void;
  onCuriousChange: (v: boolean) => void;
}

// Reopen a verdict: same five rows as the deck, plus vlaggen en nieuwsgierig.
export default function KinkEditSheet({
  kink, entry, onClose,
  onStatusChange, onTagsChange, onCuriousChange,
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
          className="text-xl italic leading-tight mb-1"
          style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
        >
          {kink?.name ?? ""}
        </h2>
        {kink?.description && (
          <p className="text-sm mb-4" style={{ color: "var(--text2)" }}>{kink.description}</p>
        )}
        {!kink?.description && <div className="mb-3" />}

        <StatusOptionRows current={entry.status} onSelect={onStatusChange} />

        <div className="flex items-center gap-1.5 mt-4 flex-wrap">
          <button
            onClick={() => onCuriousChange(!entry.curious)}
            aria-pressed={!!entry.curious}
            className="focus-ring rounded-full border transition-colors text-xs px-2.5 min-h-9 inline-flex items-center gap-1"
            style={
              entry.curious
                ? { background: "color-mix(in srgb, var(--curious) 20%, transparent)", borderColor: "var(--curious)", color: "var(--curious)" }
                : { background: "var(--tag-muted)", borderColor: "var(--border)", color: "var(--text2)" }
            }
          >
            <Star size={11} fill={entry.curious ? "currentColor" : "none"} aria-hidden="true" />
            Nieuwsgierig
          </button>
          {TAGS.map((tag) => {
            const active = tags.includes(tag);
            return (
              <button
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
