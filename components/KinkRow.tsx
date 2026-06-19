"use client";
import { useState } from "react";
import { Ban, ChevronDown, ChevronRight, Info, Star } from "lucide-react";
import type { Kink, KinkEntry, KinkStatus, KinkDirection } from "@/types";
import type { RoleDirection } from "@/lib/roles";
import InfoSheet from "./InfoSheet";

const TAGS = ["eerste keer", "alleen privé", "scène specifiek", "vraag eerst"] as const;

type PrefPill = { status: NonNullable<KinkStatus>; label: string; danger?: boolean };
const PREF_PILLS: PrefPill[] = [
  { status: "yes",     label: "Heel graag" },
  { status: "willing", label: "Ja" },
  { status: "maybe",   label: "Misschien" },
  { status: "no",      label: "Voor hen" },
  { status: "hard_no", label: "Harde grens", danger: true },
];

const STATUS_ORDER: KinkStatus[] = ["hard_no", "no", "maybe", "willing", "yes"];
const worstOf = (a: KinkStatus | undefined, b: KinkStatus | undefined): KinkStatus => {
  for (const s of STATUS_ORDER) { if (a === s || b === s) return s; }
  return null;
};

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
  onDirectionChange?: (d: KinkDirection) => void;
  onStatusGiveChange?: (s: KinkStatus) => void;
  onStatusReceiveChange?: (s: KinkStatus) => void;
  compact?: boolean;
  roleDirection?: RoleDirection;
}

const DIRECTIONS: { dir: NonNullable<KinkDirection>; label: string }[] = [
  { dir: "give",    label: "Geven" },
  { dir: "receive", label: "Ontvangen" },
  { dir: "both",    label: "Beide" },
];

interface PillRowProps {
  label?: string;
  current: KinkStatus;
  onSelect: (s: KinkStatus) => void;
  tour?: string;
}

function PillRow({ label, current, onSelect, tour }: PillRowProps) {
  return (
    <div data-tour={tour} className="flex flex-wrap justify-center items-center gap-2 px-4 py-3">
      {label && (
        <span className="text-[11px] flex-none w-full text-center" style={{ color: "var(--text2)" }}>{label}</span>
      )}
      {PREF_PILLS.map(({ status: s, label: pillLabel, danger }) => {
        const active = current === s;
        const baseClasses = "focus-ring rounded-full border font-medium transition-colors min-h-[44px] text-[12px] px-2.5 py-2 inline-flex items-center gap-1";
        if (active) {
          return (
            <button key={s} onClick={() => onSelect(null)} aria-pressed className={`${baseClasses} status-${s}`}>
              {danger && <Ban size={12} aria-hidden="true" />}
              {pillLabel}
            </button>
          );
        }
        return (
          <button key={s} onClick={() => onSelect(s)} aria-pressed={false} className={baseClasses} style={INACTIVE_STYLE[s]}>
            {danger && <Ban size={12} aria-hidden="true" />}
            {pillLabel}
          </button>
        );
      })}
    </div>
  );
}

export default function KinkRow({
  kink, entry, onStatusChange,
  onTagsChange, onCuriousChange, onDirectionChange, onStatusGiveChange, onStatusReceiveChange,
  compact, roleDirection,
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
  const effectiveStatus: KinkStatus =
    entry.direction === "give"    ? (entry.statusGive    ?? entry.status) :
    entry.direction === "receive" ? (entry.statusReceive ?? entry.status) :
    entry.direction === "both"    ? (worstOf(entry.statusGive, entry.statusReceive) ?? entry.status) :
    entry.status;
  const showDirection = !compact && !!onDirectionChange && roleDirection === "both" && effectiveStatus !== null;

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
                className="focus-ring w-7 h-7 flex items-center justify-center rounded-lg flex-none transition-colors"
                style={{ color: "var(--text2)", background: "transparent", border: "none" }}
              >
                <Star size={13} aria-hidden="true" />
              </button>
            )
          )}
        </div>

        {/* Direction selector */}
        {showDirection && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 pb-1">
            <span className="text-[11px] flex-none" style={{ color: "var(--text2)" }}>Richting:</span>
            {DIRECTIONS.map(({ dir, label }) => {
              const active = entry.direction === dir;
              return (
                <button
                  key={dir}
                  onClick={() => onDirectionChange!(active ? null : dir)}
                  aria-pressed={active}
                  className="focus-ring rounded-full border text-[11px] px-2.5 py-1 font-medium transition-colors flex-none"
                  style={active
                    ? { background: "color-mix(in srgb, var(--accent) 20%, transparent)", borderColor: "var(--accent)", color: "var(--accent)" }
                    : { borderColor: "var(--border)", color: "var(--text2)" }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Pill rows — direction-aware */}
        {(!entry.direction) && (
          <PillRow tour="pills" current={entry.status} onSelect={(s) => onStatusChange(s)} />
        )}
        {entry.direction === "give" && (
          <PillRow label="Geven:" current={entry.statusGive ?? null} onSelect={(s) => onStatusGiveChange?.(s)} />
        )}
        {entry.direction === "receive" && (
          <PillRow label="Ontvangen:" current={entry.statusReceive ?? null} onSelect={(s) => onStatusReceiveChange?.(s)} />
        )}
        {entry.direction === "both" && (
          <>
            <PillRow label="Geven:" current={entry.statusGive ?? null} onSelect={(s) => onStatusGiveChange?.(s)} />
            <PillRow label="Ontvangen:" current={entry.statusReceive ?? null} onSelect={(s) => onStatusReceiveChange?.(s)} />
          </>
        )}

        {/* Tags */}
        {showTags && (
          <>
            <button
              onClick={() => setTagsOpen((o) => !o)}
              aria-expanded={tagsOpen}
              className="focus-ring px-3 pt-1 pb-2 text-[11px] flex items-center gap-2 w-full text-left transition-colors"
              style={{ color: "var(--text2)" }}
            >
              {tagsOpen ? <ChevronDown size={12} aria-hidden="true" /> : <ChevronRight size={12} aria-hidden="true" />}
              <span className="flex-none">Vlaggen{tagCount > 0 ? ` · ${tagCount}` : ""}</span>
              {!tagsOpen && tagCount > 0 && (
                <span className="truncate flex-1" style={{ opacity: 0.7 }}>— {tags.join(" · ")}</span>
              )}
            </button>
            {tagsOpen && (
              <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                {TAGS.map((tag) => {
                  const active = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      aria-pressed={active}
                      className="focus-ring rounded-full border transition-colors text-[11px] px-2.5 py-1 min-h-[36px]"
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
