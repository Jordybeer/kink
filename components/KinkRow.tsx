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
  hideComments?: boolean;
}

export default function KinkRow({
  kink, entry, onStatusChange, onExperiencedChange,
  onCommentChange, onTagsChange, compact, hideComments,
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

  const showComment = !compact && !hideComments && (expanded || entry.comment || tags.length > 0 || isRated);

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
        {/* Row 1: info + name + ervaring pill + comment toggle */}
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
          <button
            data-tour="info"
            onClick={() => setInfoOpen(true)}
            aria-label={`Informatie over ${kink.name}`}
            className="focus-ring w-7 h-7 flex items-center justify-center rounded-lg text-xs flex-none"
            style={{ background: "#3b82f6", color: "#fff", border: "none" }}
          >
            ⓘ
          </button>

          <span className="flex-1 text-[17px] font-medium leading-snug">{kink.name}</span>

          <button
            onClick={() => onExperiencedChange(entry.experienced ? null : true)}
            aria-pressed={!!entry.experienced}
            aria-label="Heb je hier ervaring mee"
            title={entry.experienced ? "Ervaring: ja" : "Ervaring: nee"}
            className="focus-ring flex-none rounded-full border text-[12px] px-2.5 py-1.5 font-medium transition-colors"
            style={
              entry.experienced
                ? { background: "color-mix(in srgb, var(--yes) 15%, transparent)", borderColor: "var(--yes)", color: "var(--yes)" }
                : { borderColor: "var(--border)", color: "var(--text2)" }
            }
          >
            Ervaring
          </button>

          {!compact && !hideComments && (
            <button
              data-tour="comment"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Notitie verbergen" : "Notitie toevoegen"}
              title={expanded ? "Notitie verbergen" : "Notitie toevoegen"}
              className="focus-ring w-8 h-8 flex items-center justify-center rounded-lg text-base transition-colors border border-[var(--border)]"
              style={{ opacity: entry.comment ? 1 : 0.45 }}
            >
              💬
            </button>
          )}
        </div>

        {/* Row 2: status pills */}
        <div data-tour="pills" className="no-scrollbar flex items-center gap-1 px-3 pb-2.5 overflow-x-auto">
          {PILLS.map(({ status: s, label }) => (
            <button
              key={s}
              onClick={() => onStatusChange(status === s ? null : s)}
              aria-pressed={status === s}
              className={`focus-ring rounded-full border font-medium transition-colors ${
                compact ? "text-[12px] px-2.5 py-2" : "text-[13px] px-3 py-2.5"
              }${status === s ? ` status-${s}` : ""}`}
              style={status !== s ? { color: "var(--text2)", borderColor: "var(--border)" } : {}}
            >
              {label}
            </button>
          ))}
        </div>

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
                style={{ resize: "none", maxHeight: "9rem" }}
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
