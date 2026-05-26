"use client";
import { useState } from "react";
import type { Kink, KinkEntry, KinkStatus } from "@/types";
import InfoSheet from "./InfoSheet";

const TAGS = ["eerste keer", "alleen privé", "scène specifiek", "vraag eerst"] as const;

const PILLS: { status: NonNullable<KinkStatus>; label: string }[] = [
  { status: "yes",     label: "Ja" },
  { status: "willing", label: "Graag" },
  { status: "maybe",   label: "Misschien" },
  { status: "no",      label: "Nee" },
  { status: "hard_no", label: "Harde grens" },
];

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
  onExperiencedChange: (v: boolean | null) => void;
  onCommentChange: (c: string) => void;
  onTagsChange: (tags: string[]) => void;
  compact?: boolean;
}

export default function KinkRow({
  kink, entry, onStatusChange, onExperiencedChange,
  onCommentChange, onTagsChange, compact,
}: Props) {
  const [expanded, setExpanded] = useState(false);
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

  const showComment = !compact && (expanded || entry.comment || tags.length > 0 || isRated);

  return (
    <>
      <div
        className="rounded-xl overflow-hidden mb-1 transition-[border-left-color] duration-150"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderLeft: `4px solid ${status ? STATUS_BORDER[status] : "transparent"}`,
        }}
      >
        {/* Row 1: name + info + ervaring checkbox + comment toggle */}
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
          <span className="flex-1 text-[15px] font-medium leading-snug">{kink.name}</span>

          <button
            onClick={() => setInfoOpen(true)}
            aria-label={`Informatie over ${kink.name}`}
            className="focus-ring w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-colors flex-none"
            style={{ color: "var(--text2)", border: "1px solid var(--border)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text2)")}
          >
            ⓘ
          </button>

          <label
            className="flex items-center gap-1 cursor-pointer select-none flex-none"
            title={entry.experienced ? "Ervaring: ja" : "Ervaring: nee"}
          >
            <span
              className="w-4 h-4 rounded border flex items-center justify-center transition-colors flex-none"
              style={
                entry.experienced
                  ? { background: "var(--accent)", borderColor: "var(--accent)" }
                  : { borderColor: "var(--border)" }
              }
              aria-hidden="true"
            >
              {entry.experienced && (
                <span className="text-[8px] font-bold leading-none text-black">✓</span>
              )}
            </span>
            <span className="text-[11px]" style={{ color: "var(--text2)" }}>Ervaring</span>
            <input
              type="checkbox"
              className="sr-only"
              checked={entry.experienced ?? false}
              onChange={(e) => onExperiencedChange(e.target.checked || null)}
              aria-label="Heb je hier ervaring mee"
            />
          </label>

          {!compact && (
            <button
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Notitie verbergen" : "Notitie toevoegen"}
              title={expanded ? "Notitie verbergen" : "Notitie toevoegen"}
              className={`focus-ring w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${
                entry.comment
                  ? "text-[var(--accent)] border border-[var(--accent)]"
                  : "text-[var(--text2)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--text2)]"
              }`}
            >
              {entry.comment ? "✎" : "+"}
            </button>
          )}
        </div>

        {/* Row 2: status pills */}
        <div className="flex items-center gap-1 px-3 pb-2.5 flex-wrap">
          {PILLS.map(({ status: s, label }) => (
            <button
              key={s}
              onClick={() => onStatusChange(status === s ? null : s)}
              aria-pressed={status === s}
              className={`focus-ring rounded-full border font-medium transition-colors ${
                compact ? "text-[10px] px-2 py-0.5" : "text-[11px] px-2.5 py-1"
              }${status === s ? ` status-${s}` : ""}`}
              style={status !== s ? { color: "var(--text2)", borderColor: "var(--border)" } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {showComment && (
          <div className="px-3 pb-3 pt-1">
            <p className="text-[10px] uppercase tracking-wider mb-1 font-semibold" style={{ color: "var(--text2)" }}>
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
                style={{ resize: "none", maxHeight: "9rem" }}
                className="focus-ring w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 pb-5 text-[var(--text)] placeholder-[color:var(--text2)] focus:outline-none focus:border-[var(--accent)]"
              />
              <span
                className="absolute bottom-2 right-2.5 text-[10px] tabular-nums pointer-events-none select-none"
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
                      fontSize: "10px",
                      padding: "2px 8px",
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
