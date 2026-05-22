"use client";
import { useState } from "react";
import type { Kink, KinkEntry, KinkStatus } from "@/types";
import StatusPicker from "./StatusPicker";
import StarScore from "./StarScore";
import InfoSheet from "./InfoSheet";

const STATUS_BORDER: Record<NonNullable<KinkStatus>, string> = {
  yes:     "var(--yes)",
  willing: "var(--willing)",
  maybe:   "var(--maybe)",
  no:      "var(--no)",
  hard_no: "var(--hard-no)",
};

const TAGS = ["eerste keer", "alleen privé", "scène specifiek", "vraag eerst"] as const;

interface Props {
  kink: Kink;
  entry: KinkEntry;
  onStatusChange: (s: KinkStatus) => void;
  onScoreChange: (n: number | null) => void;
  onCommentChange: (c: string) => void;
  onTagsChange: (tags: string[]) => void;
  compact?: boolean;
}

export default function KinkRow({ kink, entry, onStatusChange, onScoreChange, onCommentChange, onTagsChange, compact }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const borderColour = entry.status ? STATUS_BORDER[entry.status] : "transparent";
  const tags = entry.tags ?? [];

  const commentLen = entry.comment.length;
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

  return (
    <>
      <div
        className="rounded-xl overflow-hidden mb-1 transition-[border-left-color] duration-150"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderLeft: `4px solid ${borderColour}`,
        }}
      >
        {/* Row 1: name + info + stars + comment toggle */}
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

          <StarScore value={entry.score} onChange={onScoreChange} />

          {!compact && (
            <button
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Opmerking verbergen" : "Opmerking toevoegen"}
              title={expanded ? "Opmerking verbergen" : "Opmerking toevoegen"}
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

        {/* Row 2: full-width status strip OR compact dot row */}
        {compact ? (
          <div className="flex gap-1.5 px-3 pb-2.5">
            {(["yes", "willing", "maybe", "no", "hard_no"] as NonNullable<KinkStatus>[]).map((val) => {
              const active = entry.status === val;
              const dotColors: Record<string, string> = {
                yes: "var(--yes)", willing: "var(--willing)", maybe: "var(--maybe)",
                no: "var(--no)", hard_no: "var(--hard-no)",
              };
              const labels: Record<string, string> = { yes: "Heel graag", willing: "Interesse", maybe: "Voor hen", no: "Liever niet", hard_no: "Harde grens" };
              return (
                <button
                  key={val}
                  title={labels[val]}
                  aria-pressed={active}
                  onClick={() => onStatusChange(active ? null : val)}
                  className="focus-ring w-8 h-8 rounded-full flex items-center justify-center transition-all border"
                  style={active ? {
                    background: `color-mix(in srgb, ${dotColors[val]} 20%, transparent)`,
                    borderColor: dotColors[val],
                    boxShadow: `0 0 6px color-mix(in srgb, ${dotColors[val]} 40%, transparent)`,
                  } : {
                    background: "transparent",
                    borderColor: "var(--border)",
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: active ? dotColors[val] : "var(--border)" }}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <StatusPicker value={entry.status} onChange={onStatusChange} kinkName={kink.name} />
        )}

        {/* Row 3: comment textarea + tag chips (hidden in compact mode) */}
        {!compact && (expanded || entry.comment || tags.length > 0) && (
          <div className="px-3 pb-3 pt-1">
            <div className="relative">
              <textarea
                aria-label="Opmerking of grensvoorwaarde"
                placeholder="Voeg een notitie of grensvoorwaarde toe…"
                value={entry.comment}
                onChange={(e) => onCommentChange(e.target.value)}
                onInput={handleInput}
                rows={3}
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

            {/* Tag chips */}
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
