"use client";

import { ChatCircle, Check, ShieldWarning } from "@phosphor-icons/react";
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
  shared: "Zelfde interesse",
  complementary: "Past bij elkaar",
  discuss: "Even bespreken",
  soft: "Verschil in enthousiasme",
  conflict: "Botst met harde grens",
  limit: "Harde grens",
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
  const canMarkDiscussed = factKind === "discuss" || factKind === "soft";
  const isBoundary = factKind === "conflict" || factKind === "limit";
  const semanticColour = factBorder(factKind);
  const hasPrintNotes = !!entryA.comment || !!entryB.comment;

  return (
    <div
      className="compare-kink-row rounded-xl px-3 py-3"
      data-fact-kind={factKind}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `4px solid ${semanticColour}`,
      }}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[15px] font-medium leading-snug">{displayName}</span>
          {custom && (
            <span className="rounded-full px-1.5 py-0.5 text-[14px]" style={{ background: "var(--surface2)", color: "var(--text2)" }}>
              eigen
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <PrivateResponseStatus status={entryA.status} privateResponse={false} concealed={false} subject={`${profileA.name} bij ${accessibleName}`} compact readable />
        <div className="h-px flex-1" style={{ background: "var(--border)", opacity: 0.35 }} />
        <PrivateResponseStatus status={entryB.status} privateResponse={false} concealed={false} subject={`${profileB.name} bij ${accessibleName}`} compact readable />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] leading-snug">
        <span
          className={`inline-flex items-center gap-1 ${isBoundary ? "font-semibold" : "font-medium"}`}
          style={{ color: semanticColour }}
        >
          {isBoundary && <ShieldWarning size={15} weight="duotone" aria-hidden="true" />}
          {FACT_LABEL[factKind]}
        </span>
        {directionNote && (
          <span style={{ color: "var(--text2)" }}>{directionNote}</span>
        )}
      </div>

      {hasPrintNotes && (
        <div className="compare-print-notes mt-2 hidden space-y-1 text-[14px] leading-snug" style={{ color: "var(--text2)" }}>
          {entryA.comment && <div><span className="font-medium" style={{ color: colourA }}>{profileA.name}:</span> {entryA.comment}</div>}
          {entryB.comment && <div><span className="font-medium" style={{ color: colourB }}>{profileB.name}:</span> {entryB.comment}</div>}
        </div>
      )}

      {(showReadOnlyA || showReadOnlyB) && (
        <div data-print-hide="true" className="mt-2 space-y-1 text-[14px] leading-snug" style={{ color: "var(--text2)" }}>
          {showReadOnlyA && <div><span className="font-medium" style={{ color: colourA }}>{profileA.name}:</span> {entryA.comment}</div>}
          {showReadOnlyB && <div><span className="font-medium" style={{ color: colourB }}>{profileB.name}:</span> {entryB.comment}</div>}
        </div>
      )}

      {(canMarkDiscussed || (canEdit && !showEditors)) && (
        <div className="mt-1 flex flex-wrap items-center gap-1" data-print-hide="true">
          {canMarkDiscussed && (
            <button
              type="button"
              onClick={onToggleDiscussed}
              aria-label={isDiscussed ? `${accessibleName} als niet besproken markeren` : `${accessibleName} als besproken markeren`}
              aria-pressed={isDiscussed}
              className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[14px] font-medium transition-colors"
              style={{ color: isDiscussed ? "var(--willing)" : "var(--text2)" }}
            >
              {isDiscussed
                ? <Check size={15} weight="bold" aria-hidden="true" />
                : <ChatCircle size={15} aria-hidden="true" />}
              {isDiscussed ? "Besproken" : "Bespreken"}
            </button>
          )}

          {canEdit && !showEditors && (
            <button
              type="button"
              onClick={() => setNotesOpen(true)}
              aria-label={`Notitie toevoegen voor ${accessibleName}`}
              className="focus-ring inline-flex min-h-11 items-center rounded-lg px-2 text-[14px] transition-colors"
              style={{ color: "var(--text2)" }}
            >
              + Notitie
            </button>
          )}
        </div>
      )}

      {canEdit && showEditors && (
        <div className="mt-2 space-y-2" data-print-hide="true">
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
