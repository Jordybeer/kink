"use client";
import { useState } from "react";
import { Ban, ChevronDown, ChevronRight, Info, Star } from "lucide-react";
import type { Kink, KinkEntry, KinkStatus } from "@/types";
import InfoSheet from "./InfoSheet";

const TAGS = ["eerste keer", "alleen privé", "scène specifiek", "vraag eerst"] as const;

type PrefPill = { status: NonNullable<KinkStatus>; label: string; danger?: boolean };
const PREF_PILLS: PrefPill[] = [
  { status: "yes",     label: "Heel graag" },
  { status: "willing", label: "Ja" },
  { status: "maybe",   label: "Misschien" },
  { status: "no",      label: "Voor hen" },
  { status: "hard_no", label: "Grens", danger: true },
];

const STATUS_BORDER: Record<NonNullable<KinkStatus>, string> = {
  yes:     "var(--yes)",
  willing: "var(--willing)",
  maybe:   "var(--maybe)",
  no:      "var(--no)",
  hard_no: "var(--hard-no)",
};

const INACTIVE_STYLE: Record<NonNullable<KinkStatus>, React.CSSProperties> = {
  yes:     { color: "var(--yes)",     borderColor: "color-mix(in srgb, var(--yes) 40%, transparent)",     background: "transparent" },
  willing: { color: "var(--willing)", borderColor: "color-mix(in srgb, var(--willing) 40%, transparent)", background: "transparent" },
  maybe:   { color: "var(--maybe)",   borderColor: "color-mix(in srgb, var(--maybe) 40%, transparent)",   background: "transparent" },
  no:      { color: "var(--no)",      borderColor: "color-mix(in srgb, var(--no) 40%, transparent)",      background: "transparent" },
  hard_no: { color: "var(--hard-no)", borderColor: "var(--hard-no)", borderStyle: "dashed",               background: "transparent" },
};

interface Props {
  kink: Kink;
  entry: KinkEntry;
  onStatusChange: (s: KinkStatus) => void;
  onTagsChange: (tags: string[]) => void;
  onCuriousChange?: (v: boolean) => void;
  compact?: boolean;
}

interface PillRowProps {
  label?: string;
  current: KinkStatus;
  onSelect: (s: KinkStatus) => void;
  tour?: string;
}

function PillRow({ label, current, onSelect, tour }: PillRowProps) {
  return (
    <div data-tour={tour} className="px-3 py-3">
      {label && (
        <span className="text-xs block text-center mb-2" style={{ color: "var(--text2)" }}>{label}</span>
      )}
      <div className="grid grid-cols-5 gap-1">
        {PREF_PILLS.map(({ status: s, label: pillLabel, danger }) => {
          const active = current === s;
          const baseClasses = "focus-ring rounded-full border font-medium transition-colors min-h-[44px] text-[11px] py-2 flex items-center justify-center text-center leading-tight";
          if (active) {
            return (
              <button key={s} data-tour={s === "hard_no" ? "hard-no" : undefined} onClick={() => onSelect(null)} aria-pressed className={`${baseClasses} status-${s}`}>
                {danger && <Ban size={10} aria-hidden="true" className="mr-0.5 flex-none" />}
                {pillLabel}
              </button>
            );
          }
          return (
            <button key={s} data-tour={s === "hard_no" ? "hard-no" : undefined} onClick={() => onSelect(s)} aria-pressed={false} className={baseClasses} style={INACTIVE_STYLE[s]}>
              {pillLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function KinkRow({
  kink, entry, onStatusChange,
  onTagsChange, onCuriousChange,
  compact,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false);
  const tags = entry.tags ?? [];
  const tagCount = tags.length;
  const [tagsOpen, setTagsOpen] = useState(tagCount > 0);

  function toggleTag(tag: string) {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    onTagsChange(next);
  }

  const showTags = !compact;
  const effectiveStatus = entry.status;

  return (
    <>
      <div
        className={`relative rounded-xl mb-1${effectiveStatus ? ` ks-glow-${effectiveStatus.replace("_", "-")}` : ""}`}
        style={{
          overflow: "hidden",
          background: effectiveStatus
            ? `color-mix(in srgb, ${STATUS_BORDER[effectiveStatus]} 5%, var(--surface))`
            : "var(--surface)",
          borderTop: "1px solid var(--border)",
          borderRight: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          borderLeft: `4px solid ${effectiveStatus ? STATUS_BORDER[effectiveStatus] : "var(--border)"}`,
        }}
      >
        {/* Row 1: info + name + curious flag */}
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
          <button
            data-tour="info"
            onClick={() => setInfoOpen(true)}
            aria-label={`Informatie over ${kink.name}`}
            className="focus-ring w-7 h-7 flex items-center justify-center rounded-lg flex-none"
            style={{ background: "var(--info-ghost)", color: "var(--text2)", border: "none" }}
          >
            <Info size={14} aria-hidden="true" />
          </button>
          <span className="flex-1 text-base font-medium leading-snug">{kink.name}</span>
          {onCuriousChange && (
            entry.curious ? (
              <button
                onClick={() => onCuriousChange(false)}
                aria-pressed
                aria-label="Verwijder nieuwsgierig markering"
                className="focus-ring rounded-full text-[11px] font-semibold px-2 py-0.5 flex-none transition-colors inline-flex items-center gap-1"
                style={{ background: "color-mix(in srgb, var(--curious) 20%, transparent)", color: "var(--curious)", border: "1px solid var(--curious)" }}
              >
                <Star size={10} fill="currentColor" aria-hidden="true" />
                Nieuwsgierig
              </button>
            ) : (
              <button
                onClick={() => onCuriousChange(true)}
                aria-pressed={false}
                aria-label="Markeer als nieuwsgierig"
                className="focus-ring w-7 h-7 flex items-center justify-center rounded-lg flex-none transition-colors hover:text-(--curious)"
                style={{ color: "var(--text2)", background: "var(--info-ghost)", border: "none" }}
              >
                <Star size={14} aria-hidden="true" />
              </button>
            )
          )}
        </div>

        {/* Pill row */}
        <PillRow tour="pills" current={entry.status} onSelect={(s) => onStatusChange(s)} />

        {/* Tags */}
        {showTags && (
          <>
            <button
              onClick={() => setTagsOpen((o) => !o)}
              aria-expanded={tagsOpen}
              className="focus-ring px-3 pt-1 pb-2 text-xs flex items-center gap-2 w-full text-left transition-colors"
              style={{ color: "var(--text2)" }}
            >
              {tagsOpen ? <ChevronDown size={12} aria-hidden="true" /> : <ChevronRight size={12} aria-hidden="true" />}
              <span className="flex-none">Vlaggen{tagCount > 0 ? ` · ${tagCount}` : ""}</span>
              {!tagsOpen && tagCount > 0 && (
                <span className="truncate flex-1" style={{ opacity: 0.7 }}>— {tags.join(" · ")}</span>
              )}
            </button>
            {tagsOpen && (
              <div className="no-scrollbar flex items-center gap-1.5 px-3 pb-2 overflow-x-auto">
                {TAGS.map((tag) => {
                  const active = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      aria-pressed={active}
                      className="focus-ring flex-none whitespace-nowrap rounded-full border transition-colors text-[11px] px-2.5 py-1 min-h-[36px]"
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
            )}
          </>
        )}
      </div>

      <InfoSheet kink={infoOpen ? kink : null} onClose={() => setInfoOpen(false)} />
    </>
  );
}
