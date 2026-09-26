"use client";

import { ChatCircle, Check, ShieldWarning } from "@phosphor-icons/react";
import PrivateResponseStatus from "@/components/PrivateResponseStatus";
import { COMPARE_FACT_LABEL, compactComparisonName } from "@/lib/comparePresentation";
import type { CompareFactKind } from "@/lib/compareV2";
import type { KinkEntry, Profile } from "@/types";

const EMPTY_ENTRY: KinkEntry = { status: null, comment: "" };

interface Props {
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
}

function factBorder(kind: CompareFactKind): string {
  if (kind === "shared" || kind === "complementary") return "var(--yes)";
  if (kind === "soft") return "var(--maybe)";
  if (kind === "conflict" || kind === "limit") return "var(--hard-no)";
  return "var(--conflict)";
}

export default function CompareKinkRow({
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
}: Props) {
  const displayName = compactComparisonName(name);
  const accessibleName = directionNote ? `${displayName}, ${directionNote}` : displayName;

  const hasNotes = !!entryA.comment || !!entryB.comment;
  const showPreviewA = !!entryA.comment;
  const showPreviewB = !!entryB.comment;
  const canMarkDiscussed = factKind === "discuss" || factKind === "soft";
  const isBoundary = factKind === "conflict" || factKind === "limit";
  const semanticColour = factBorder(factKind);

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
          <span className="text-base font-medium leading-snug">{displayName}</span>
          {custom && (
            <span className="rounded-full px-1.5 py-0.5 text-sm" style={{ background: "var(--surface2)", color: "var(--text2)" }}>
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

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-snug">
        <span
          className={`inline-flex items-center gap-1 ${isBoundary ? "font-semibold" : "font-medium"}`}
          style={{ color: semanticColour }}
        >
          {isBoundary && <ShieldWarning size={15} weight="duotone" aria-hidden="true" />}
          {COMPARE_FACT_LABEL[factKind]}
        </span>
        {directionNote && (
          <span style={{ color: "var(--text2)" }}>{directionNote}</span>
        )}
      </div>

      {hasNotes && (
        <div className="compare-print-notes mt-2 hidden space-y-1 text-sm leading-snug" style={{ color: "var(--text2)" }}>
          {entryA.comment && <div><span className="font-medium" style={{ color: colourA }}>{profileA.name}:</span> {entryA.comment}</div>}
          {entryB.comment && <div><span className="font-medium" style={{ color: colourB }}>{profileB.name}:</span> {entryB.comment}</div>}
        </div>
      )}

      {(showPreviewA || showPreviewB) && (
        <div data-print-hide="true" className="mt-2 space-y-1 text-sm leading-snug" style={{ color: "var(--text2)" }}>
          {showPreviewA && <div><span className="font-medium" style={{ color: colourA }}>{profileA.name}:</span> {entryA.comment}</div>}
          {showPreviewB && <div><span className="font-medium" style={{ color: colourB }}>{profileB.name}:</span> {entryB.comment}</div>}
        </div>
      )}

      {canMarkDiscussed && (
        <div className="mt-1 flex flex-wrap items-center gap-1" data-print-hide="true">
          {canMarkDiscussed && (
            <button
              type="button"
              onClick={onToggleDiscussed}
              aria-label={isDiscussed ? `${accessibleName} als niet besproken markeren` : `${accessibleName} als besproken markeren`}
              aria-pressed={isDiscussed}
              className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors"
              style={{ color: isDiscussed ? "var(--willing)" : "var(--text2)" }}
            >
              {isDiscussed
                ? <Check size={15} weight="bold" aria-hidden="true" />
                : <ChatCircle size={15} aria-hidden="true" />}
              {isDiscussed ? "Besproken" : "Bespreken"}
            </button>
          )}

        </div>
      )}

    </div>
  );
}
