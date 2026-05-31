"use client";
import { useState } from "react";
import type { Kink, KinkEntry, KinkStatus, KinkDirection } from "@/types";
import InfoSheet from "./InfoSheet";

const TAGS = ["eerste keer", "alleen privé", "scène specifiek", "vraag eerst"] as const;

const PILLS: { status: NonNullable<KinkStatus>; label: string }[] = [
  { status: "willing", label: "Graag" },
  { status: "yes",     label: "Ja" },
  { status: "maybe",   label: "Misschien" },
  { status: "no",      label: "Nee" },
  { status: "hard_no", label: "Harde grens" },
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
  onCommentChange: (c: string) => void;
  onTagsChange: (tags: string[]) => void;
  onDirectionChange?: (d: KinkDirection) => void;
  onStatusGiveChange?: (s: KinkStatus) => void;
  onStatusReceiveChange?: (s: KinkStatus) => void;
  compact?: boolean;
  hideComments?: boolean;
}

const DIRECTIONS: { dir: NonNullable<KinkDirection>; label: string }[] = [
  { dir: "give",    label: "Geven" },
  { dir: "receive", label: "Ontvangen" },
  { dir: "both",    label: "Beide" },
];

export default function KinkRow({
  kink, entry, onStatusChange,
  onCommentChange, onTagsChange, onDirectionChange, onStatusGiveChange, onStatusReceiveChange,
  compact, hideComments,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false);

  const status = entry.status;

  const tags = entry.tags ?? [];
  const commentLen = entry.comment.length;
  const isRated = status !== null;

  const counterColor =
    commentLen >= 190 ? "var(--hard-no)" :
    commentLen >= 160 ? "var(--maybe)" :
    "var(--text2)";


  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  function toggleTag(tag: string) {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    onTagsChange(next);
  }

  const showComment = !compact && !hideComments && (entry.comment || tags.length > 0 || isRated);
  const effectiveStatus: KinkStatus =
    entry.direction === "give"    ? (entry.statusGive    ?? status) :
    entry.direction === "receive" ? (entry.statusReceive ?? status) :
    entry.direction === "both"    ? (worstOf(entry.statusGive, entry.statusReceive) ?? status) :
    status;
  const showDirection = !compact && !!onDirectionChange;

  return (
    <>
      <div
        className={`rounded-xl mb-1 transition-[border-left-color] duration-150${effectiveStatus ? ` ks-glow-${effectiveStatus.replace("_", "-")}` : ""}`}
        style={{
          overflow: "clip",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderLeft: `4px solid ${effectiveStatus ? STATUS_BORDER[effectiveStatus] : "transparent"}`,
        }}
      >
        {/* Row 1: info + name + ervaring pill + comment toggle */}
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
          <button
            data-tour="info"
            onClick={() => setInfoOpen(true)}
            aria-label={`Informatie over ${kink.name}`}
            className="focus-ring w-7 h-7 flex items-center justify-center rounded-lg text-xs flex-none"
            style={{ background: "rgba(59,130,246,0.45)", color: "rgba(255,255,255,0.85)", border: "none" }}
          >
            ⓘ
          </button>

          <span className="flex-1 text-base font-medium leading-snug">{kink.name}</span>
        </div>

        {/* Direction selector */}
        {showDirection && (
          <div className="no-scrollbar flex items-center gap-1.5 px-3 pb-1.5 overflow-x-auto">
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
            className="no-scrollbar flex items-center gap-1 px-3 pb-2.5 overflow-x-auto"
          >
            {entry.direction === "give" && (
              <span className="text-[11px] flex-none mr-1" style={{ color: "var(--text2)" }}>↑</span>
            )}
            {PILLS.map(({ status: s, label }) => {
              const active = entry.direction === "give" ? entry.statusGive === s : status === s;
              return (
                <button
                  key={s}
                  onClick={() => entry.direction === "give"
                    ? onStatusGiveChange?.(active ? null : s)
                    : onStatusChange(active ? null : s)}
                  aria-pressed={active}
                  className={`focus-ring rounded-full border font-medium transition-colors whitespace-nowrap flex-none ${
                    compact ? "text-[12px] px-2.5 py-2" : "text-[13px] px-3 py-2.5"
                  }${active ? ` status-${s}` : ""}`}
                  style={!active ? { color: "var(--text2)", borderColor: "var(--border)" } : {}}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
        {entry.direction === "receive" && (
          <div className="no-scrollbar flex items-center gap-1 px-3 pb-2.5 overflow-x-auto">
            <span className="text-[11px] flex-none mr-1" style={{ color: "var(--text2)" }}>↓</span>
            {PILLS.map(({ status: s, label }) => {
              const active = entry.statusReceive === s;
              return (
                <button
                  key={s}
                  onClick={() => onStatusReceiveChange?.(active ? null : s)}
                  aria-pressed={active}
                  className={`focus-ring rounded-full border font-medium transition-colors whitespace-nowrap flex-none ${
                    compact ? "text-[12px] px-2.5 py-2" : "text-[13px] px-3 py-2.5"
                  }${active ? ` status-${s}` : ""}`}
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
              <span className="text-[11px] flex-none mr-1" style={{ color: "var(--text2)" }}>↑</span>
              {PILLS.map(({ status: s, label }) => {
                const active = entry.statusGive === s;
                return (
                  <button
                    key={s}
                    onClick={() => onStatusGiveChange?.(active ? null : s)}
                    aria-pressed={active}
                    className={`focus-ring rounded-full border font-medium transition-colors whitespace-nowrap flex-none text-[13px] px-3 py-2.5${active ? ` status-${s}` : ""}`}
                    style={!active ? { color: "var(--text2)", borderColor: "var(--border)" } : {}}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="no-scrollbar flex items-center gap-1 px-3 pb-2.5 overflow-x-auto">
              <span className="text-[11px] flex-none mr-1" style={{ color: "var(--text2)" }}>↓</span>
              {PILLS.map(({ status: s, label }) => {
                const active = entry.statusReceive === s;
                return (
                  <button
                    key={s}
                    onClick={() => onStatusReceiveChange?.(active ? null : s)}
                    aria-pressed={active}
                    className={`focus-ring rounded-full border font-medium transition-colors whitespace-nowrap flex-none text-[13px] px-3 py-2.5${active ? ` status-${s}` : ""}`}
                    style={!active ? { color: "var(--text2)", borderColor: "var(--border)" } : {}}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {showComment && (
          <div className="px-3 pb-3 pt-1">
            <p className="text-[11px] uppercase tracking-wider mb-1 font-semibold" style={{ color: "var(--text2)" }}>
              Notitie
            </p>
            <div className="relative">
              <textarea
                aria-label="Notitie of grensvoorwaarde"
                placeholder="Grenzen, voorkeuren of aantekeningen…"
                value={entry.comment}
                onChange={(e) => onCommentChange(e.target.value)}
                onInput={handleInput}
                rows={2}
                maxLength={200}
                style={{ resize: "none", overflowY: "auto" }}
                className="focus-ring w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 pb-5 text-[var(--text)] placeholder-[color:var(--text2)] focus:outline-none focus:border-[var(--accent)]"
              />
              <span
                className="absolute bottom-2 right-2.5 text-[11px] tabular-nums pointer-events-none select-none"
                style={{ color: counterColor }}
              >
                {commentLen}/200
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {TAGS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    aria-pressed={active}
                    className="focus-ring rounded-full border transition-colors"
                    style={{
                      fontSize: "12px",
                      padding: "3px 10px",
                      background: active ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "transparent",
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
