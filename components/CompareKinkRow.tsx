"use client";

import { Check } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import PrivateResponseStatus from "@/components/PrivateResponseStatus";
import type { CompareFactKind } from "@/lib/compareV2";
import type { KinkEntry, Profile } from "@/types";

const EMPTY_ENTRY: KinkEntry = { status: null, comment: "" };

interface Props {
  rowKey: string;
  name: string;
  directionNote?: string;
  entryA?: KinkEntry;
  entryB?: KinkEntry;
  profileA: Profile;
  profileB: Profile;
  colourA: string;
  colourB: string;
  factKind: CompareFactKind;
  custom?: boolean;
  isDiscussed: boolean;
  onToggleDiscussed: () => void;
  onCommentA?: (comment: string) => void;
  onCommentB?: (comment: string) => void;
}

const FACT_LABEL: Record<CompareFactKind, string> = {
  shared: "zelfde interesse",
  complementary: "past bij elkaar",
  discuss: "even bespreken",
  soft: "verschil in enthousiasme",
  conflict: "botst met harde grens",
  limit: "harde grens",
};

function factBorder(kind: CompareFactKind): string {
  if (kind === "shared" || kind === "complementary") return "var(--yes)";
  if (kind === "soft") return "var(--maybe)";
  if (kind === "conflict" || kind === "limit") return "var(--hard-no)";
  return "var(--conflict)";
}

function compactDirectionName(name: string): string {
  const directional = name.match(/^(.+?) — (?:geven ↔ ontvangen|ontvangen ↔ geven) ↔ \1 — (?:geven ↔ ontvangen|ontvangen ↔ geven)$/);
  if (directional) return directional[1];

  const complementary = name.match(/^(.+?) — ([^↔]+) ↔ \1 — ([^↔]+)$/);
  if (complementary) return complementary[1];

  return name;
}

export default function CompareKinkRow({
  rowKey,
  name,
  directionNote,
  entryA = EMPTY_ENTRY,
  entryB = EMPTY_ENTRY,
  profileA,
  profileB,
  colourA,
  colourB,
  factKind,
  custom = false,
  isDiscussed,
  onToggleDiscussed,
  onCommentA,
  onCommentB,
}: Props) {
  const [notesOpen, setNotesOpen] = useState(false);
  const displayName = compactDirectionName(name);
  const accessibleName = directionNote ? `${displayName}, ${directionNote}` : displayName;

  useEffect(() => {
    setNotesOpen(false);
  }, [rowKey, profileA.id, profileB.id]);

  const showReadOnlyA = profileA.isImported && !!entryA.comment;
  const showReadOnlyB = profileB.isImported && !!entryB.comment;
  const canEditA = !!onCommentA;
  const canEditB = !!onCommentB;
  const canEdit = canEditA || canEditB;
  const showEditors = notesOpen || (canEditA && !!entryA.comment) || (canEditB && !!entryB.comment);

  return (
    <div
      className="rounded-xl px-3 py-3 transition-opacity"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `4px solid ${factBorder(factKind)}`,
        opacity: isDiscussed ? 0.45 : 1,
      }}
    >
      <div className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[15px] font-medium leading-snug">{displayName}</span>
            {custom && (
              <span className="rounded-full px-1.5 py-0.5 text-[14px]" style={{ background: "var(--surface2)", color: "var(--text2)" }}>
                eigen
              </span>
            )}
          </div>
          {directionNote && (
            <p className="mt-1 text-[14px] leading-snug" style={{ color: "var(--text2)" }}>
              {directionNote}
            </p>
          )}
          <p className="mt-1 text-[14px] leading-snug sm:hidden" style={{ color: factBorder(factKind) }}>
            {FACT_LABEL[factKind]}
          </p>
        </div>
        <span className="hidden shrink-0 pt-0.5 text-[14px] sm:inline" style={{ color: factBorder(factKind) }}>
          {FACT_LABEL[factKind]}
        </span>
        <button
          type="button"
          onClick={onToggleDiscussed}
          aria-label={isDiscussed ? `${accessibleName} als niet besproken markeren` : `${accessibleName} als besproken markeren`}
          className="focus-ring min-h-11 flex-none whitespace-nowrap rounded-full border px-3 text-[14px] transition-colors"
          style={isDiscussed
            ? { background: "color-mix(in srgb, var(--yes) 15%, transparent)", borderColor: "var(--yes)", color: "var(--yes)" }
            : { background: "transparent", borderColor: "var(--border)", color: "var(--text2)" }}
        >
          {isDiscussed ? <span className="inline-flex items-center gap-1"><Check size={14} aria-hidden="true" />Besproken</span> : "Bespreken"}
        </button>
      </div>

      <div className="mb-1 flex items-center gap-2">
        <PrivateResponseStatus status={entryA.status} privateResponse={false} concealed={false} subject={`${profileA.name} bij ${accessibleName}`} compact readable />
        <div className="h-px flex-1" style={{ background: "var(--border)", opacity: 0.35 }} />
        <PrivateResponseStatus status={entryB.status} privateResponse={false} concealed={false} subject={`${profileB.name} bij ${accessibleName}`} compact readable />
      </div>

      {(showReadOnlyA || showReadOnlyB) && (
        <div className="mt-2 space-y-1 text-[14px] leading-snug" style={{ color: "var(--text2)" }}>
          {showReadOnlyA && <div><span className="font-medium" style={{ color: colourA }}>{profileA.name}:</span> {entryA.comment}</div>}
          {showReadOnlyB && <div><span className="font-medium" style={{ color: colourB }}>{profileB.name}:</span> {entryB.comment}</div>}
        </div>
      )}

      {canEdit && !showEditors && (
        <button type="button" onClick={() => setNotesOpen(true)} aria-label={`Notitie toevoegen voor ${accessibleName}`} className="focus-ring -mb-1 -ml-2 mt-1 inline-flex min-h-11 items-center rounded-lg px-2 text-[14px] transition-colors" style={{ color: "var(--text2)" }}>
          + Notitie
        </button>
      )}

      {canEdit && showEditors && (
        <div className="mt-2 space-y-2">
          {canEditA && (
            <textarea aria-label={`Notitie ${profileA.name} voor ${accessibleName}`} placeholder={`Notitie ${profileA.name}…`} value={entryA.comment} onChange={(event) => onCommentA?.(event.target.value)} rows={1} maxLength={200} className="focus-ring w-full resize-none rounded-lg px-2.5 py-2 text-[14px] focus:outline-none" style={{ background: "var(--surface2)", border: `1px solid color-mix(in srgb, ${colourA} 30%, var(--border))`, color: "var(--text)" }} />
          )}
          {canEditB && (
            <textarea aria-label={`Notitie ${profileB.name} voor ${accessibleName}`} placeholder={`Notitie ${profileB.name}…`} value={entryB.comment} onChange={(event) => onCommentB?.(event.target.value)} rows={1} maxLength={200} className="focus-ring w-full resize-none rounded-lg px-2.5 py-2 text-[14px] focus:outline-none" style={{ background: "var(--surface2)", border: `1px solid color-mix(in srgb, ${colourB} 30%, var(--border))`, color: "var(--text)" }} />
          )}
        </div>
      )}
    </div>
  );
}
