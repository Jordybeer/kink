"use client";
import { useState } from "react";
import { Ban, Info } from "lucide-react";
import type { Kink, KinkEntry, KinkStatus, KinkDirection } from "@/types";
import type { RoleDirection } from "@/lib/roles";
import InfoSheet from "./InfoSheet";

const TAGS = ["eerste keer", "alleen privé", "scène specifiek", "vraag eerst"] as const;

const PREF_PILLS: { status: NonNullable<KinkStatus>; label: string }[] = [
  { status: "yes",     label: "Heel graag" },
  { status: "willing", label: "Ja" },
  { status: "maybe",   label: "Misschien" },
  { status: "no",      label: "Voor hen" },
];

const STATUS_ORDER: KinkStatus[] = ["hard_no", "no", "maybe", "yes", "willing"];
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

interface Props {
  kink: Kink;
  entry: KinkEntry;
  onStatusChange: (s: KinkStatus) => void;
  onTagsChange: (tags: string[]) => void;
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

export default function KinkRow({
  kink, entry, onStatusChange,
  onTagsChange, onDirectionChange, onStatusGiveChange, onStatusReceiveChange,
  compact, roleDirection,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false);

  const status = entry.status;

  const tags = entry.tags ?? [];

  function toggleTag(tag: string) {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    onTagsChange(next);
  }

  const showTags = !compact;
  const effectiveStatus: KinkStatus =
    entry.direction === "give"    ? (entry.statusGive    ?? status) :
    entry.direction === "receive" ? (entry.statusReceive ?? status) :
    entry.direction === "both"    ? (worstOf(entry.statusGive, entry.statusReceive) ?? status) :
    status;
  const showDirection = !compact && !!onDirectionChange && roleDirection === "both";

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
        {/* Row 1: info + name */}
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
        </div>

        {/* Direction selector */}
        {showDirection && (
          <div className="no-scrollbar flex items-center gap-1.5 px-3 pb-1 overflow-x-auto">
            <span className="text-[11px] flex-none" style={{ color: "var(--text2)" }}>Richting:</span>
            {DIRECTIONS.map(({ dir, label }) => {
              const active = entry.direction === dir;
              return (
                <button
                  key={dir}
                  onClick={() => onDirectionChange!(active ? null : dir)}
                  aria-pressed={active}
                  className="focus-ring rounded-full border text-[11px] px-2.5 py-1 font-medium transition-colors whitespace-nowrap flex-none"
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
        {(!entry.direction || entry.direction === "give") && (
          <div
            data-tour="pills"
            className="no-scrollbar flex items-center gap-1 px-3 pb-1 overflow-x-auto"
          >
            {entry.direction === "give" && (
              <span className="text-[11px] flex-none mr-1" style={{ color: "var(--text2)" }}>Geven:</span>
            )}
            {PREF_PILLS.map(({ status: s, label }) => {
              const active = entry.direction === "give" ? entry.statusGive === s : status === s;
              return (
                <button
                  key={s}
                  onClick={() => entry.direction === "give"
                    ? onStatusGiveChange?.(active ? null : s)
                    : onStatusChange(active ? null : s)}
                  aria-pressed={active}
                  className={`focus-ring rounded-full border font-medium transition-colors whitespace-nowrap flex-none min-h-[44px] text-[13px] px-3 py-2${active ? ` status-${s}` : ""}`}
                  style={!active ? { color: "var(--text2)", borderColor: "var(--border)" } : {}}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
        {entry.direction === "receive" && (
          <div className="no-scrollbar flex items-center gap-1 px-3 pb-1 overflow-x-auto">
            <span className="text-[11px] flex-none mr-1" style={{ color: "var(--text2)" }}>Ontvangen:</span>
            {PREF_PILLS.map(({ status: s, label }) => {
              const active = entry.statusReceive === s;
              return (
                <button
                  key={s}
                  onClick={() => onStatusReceiveChange?.(active ? null : s)}
                  aria-pressed={active}
                  className={`focus-ring rounded-full border font-medium transition-colors whitespace-nowrap flex-none min-h-[44px] text-[13px] px-3 py-2${active ? ` status-${s}` : ""}`}
                  style={!active ? { color: "var(--text2)", borderColor: "var(--border)" } : {}}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
        {entry.direction === "both" && (
          <>
            <div className="no-scrollbar flex items-center gap-1 px-3 pb-1 overflow-x-auto">
              <span className="text-[11px] flex-none mr-1" style={{ color: "var(--text2)" }}>Geven:</span>
              {PREF_PILLS.map(({ status: s, label }) => {
                const active = entry.statusGive === s;
                return (
                  <button
                    key={s}
                    onClick={() => onStatusGiveChange?.(active ? null : s)}
                    aria-pressed={active}
                    className={`focus-ring rounded-full border font-medium transition-colors whitespace-nowrap flex-none min-h-[44px] text-[13px] px-3 py-2${active ? ` status-${s}` : ""}`}
                    style={!active ? { color: "var(--text2)", borderColor: "var(--border)" } : {}}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="no-scrollbar flex items-center gap-1 px-3 pb-1 overflow-x-auto">
              <span className="text-[11px] flex-none mr-1" style={{ color: "var(--text2)" }}>Ontvangen:</span>
              {PREF_PILLS.map(({ status: s, label }) => {
                const active = entry.statusReceive === s;
                return (
                  <button
                    key={s}
                    onClick={() => onStatusReceiveChange?.(active ? null : s)}
                    aria-pressed={active}
                    className={`focus-ring rounded-full border font-medium transition-colors whitespace-nowrap flex-none min-h-[44px] text-[13px] px-3 py-2${active ? ` status-${s}` : ""}`}
                    style={!active ? { color: "var(--text2)", borderColor: "var(--border)" } : {}}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </>
        )}


        {/* Hard limit — separate row, visually distinct */}
        {!compact && (() => {
          const isGive    = entry.direction === "give";
          const isReceive = entry.direction === "receive";
          const isBoth    = entry.direction === "both";
          const active =
            isBoth    ? entry.statusGive === "hard_no" || entry.statusReceive === "hard_no" :
            isGive    ? entry.statusGive    === "hard_no" :
            isReceive ? entry.statusReceive === "hard_no" :
            status === "hard_no";
          const handleClick = () => {
            if (isBoth) {
              onStatusGiveChange?.(active ? null : "hard_no");
              onStatusReceiveChange?.(active ? null : "hard_no");
            } else if (isGive) {
              onStatusGiveChange?.(active ? null : "hard_no");
            } else if (isReceive) {
              onStatusReceiveChange?.(active ? null : "hard_no");
            } else {
              onStatusChange(active ? null : "hard_no");
            }
          };
          return (
            <div data-tour="hard-no" className="px-3 pb-1 flex justify-end">
              <button
                onClick={handleClick}
                aria-pressed={active}
                className={`focus-ring rounded-full border text-[10px] font-semibold px-2.5 py-1 min-h-[36px] transition-colors inline-flex items-center gap-1${active ? " status-hard_no" : ""}`}
                style={!active ? {
                  color: "var(--hard-no)",
                  borderColor: "color-mix(in srgb, var(--hard-no) 30%, transparent)",
                  background: "transparent",
                } : {}}
              >
                <Ban size={11} aria-hidden="true" />
                Harde grens
              </button>
            </div>
          );
        })()}

        {showTags && (
          <div className="px-3 pb-2 pt-1">
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
              {TAGS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    aria-pressed={active}
                    className="focus-ring rounded-full border transition-colors flex items-center whitespace-nowrap flex-none text-[11px] px-2.5 py-1 min-h-[44px]"
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
          </div>
        )}
      </div>

      <InfoSheet kink={infoOpen ? kink : null} onClose={() => setInfoOpen(false)} />
    </>
  );
}
