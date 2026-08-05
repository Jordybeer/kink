"use client";
import { Check } from "@phosphor-icons/react";

import { useEffect, useState } from "react";
import type { KinkEntry, Profile } from "@/types";
import { comparableEntry } from "@/lib/privateResponses";
import { isConflict, isHardLimit, isKinkMatch } from "@/lib/matching";
import PrivateResponseStatus from "@/components/PrivateResponseStatus";

const EMPTY_ENTRY: KinkEntry = { status: null, comment: "" };

interface Props {
  rowKey: string;
  name: string;
  entryA?: KinkEntry;
  entryB?: KinkEntry;
  profileA: Profile;
  profileB: Profile;
  colourA: string;
  colourB: string;
  custom?: boolean;
  isDiscussed: boolean;
  onToggleDiscussed: () => void;
  onCommentA?: (comment: string) => void;
  onCommentB?: (comment: string) => void;
}

export default function CompareKinkRow({
  rowKey,
  name,
  entryA = EMPTY_ENTRY,
  entryB = EMPTY_ENTRY,
  profileA,
  profileB,
  colourA,
  colourB,
  custom = false,
  isDiscussed,
  onToggleDiscussed,
  onCommentA,
  onCommentB,
}: Props) {
  const [revealedA, setRevealedA] = useState(false);
  const [revealedB, setRevealedB] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => {
    setRevealedA(false);
    setRevealedB(false);
    setNotesOpen(false);
  }, [rowKey, profileA.id, profileB.id]);

  const concealedA = entryA.privateResponse === true && !revealedA;
  const concealedB = entryB.privateResponse === true && !revealedB;
  const visibleA = comparableEntry(entryA, revealedA);
  const visibleB = comparableEntry(entryB, revealedB);
  const matched = isKinkMatch(visibleA, visibleB);
  const hardLimit = isHardLimit(visibleA, visibleB);
  const conflict = !matched && !hardLimit && isConflict(visibleA, visibleB);

  const showReadOnlyA = profileA.isImported && !!entryA.comment && !concealedA;
  const showReadOnlyB = profileB.isImported && !!entryB.comment && !concealedB;
  const canEditA = !!onCommentA && !concealedA;
  const canEditB = !!onCommentB && !concealedB;
  const canEdit = canEditA || canEditB;
  const showEditors = notesOpen
    || (canEditA && !!entryA.comment)
    || (canEditB && !!entryB.comment);

  return (
    <div
      className="rounded-xl px-3 py-2.5 transition-opacity"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: hardLimit
          ? "4px solid var(--hard-no)"
          : matched
          ? "4px solid var(--yes)"
          : conflict
          ? "4px solid var(--conflict)"
          : "4px solid transparent",
        opacity: isDiscussed ? 0.45 : 1,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium flex-1 flex items-center gap-1.5">
          {name}
          {custom && (
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--text2)" }}>
              eigen
            </span>
          )}
          {matched && <span className="sr-only"> — match</span>}
          {hardLimit && <span className="sr-only"> — harde grens</span>}
        </span>
        <button
          type="button"
          onClick={onToggleDiscussed}
          aria-label={isDiscussed ? `${name} als niet besproken markeren` : `${name} als besproken markeren`}
          className="text-[11px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap flex-none"
          style={
            isDiscussed
              ? { background: "color-mix(in srgb, var(--yes) 15%, transparent)", borderColor: "var(--yes)", color: "var(--yes)" }
              : { background: "transparent", borderColor: "var(--border)", color: "var(--text2)" }
          }
        >
          {isDiscussed ? <span className="inline-flex items-center gap-1"><Check size={11} aria-hidden="true" />Besproken</span> : "Bespreken"}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <PrivateResponseStatus
          status={entryA.status}
          privateResponse={entryA.privateResponse === true}
          concealed={concealedA}
          subject={`${profileA.name} bij ${name}`}
          onReveal={() => setRevealedA(true)}
          onConceal={() => setRevealedA(false)}
          compact
        />
        <div
          className="flex-1 h-px"
          style={{ background: "var(--border)", opacity: matched ? 0.6 : 0.25 }}
        />
        <PrivateResponseStatus
          status={entryB.status}
          privateResponse={entryB.privateResponse === true}
          concealed={concealedB}
          subject={`${profileB.name} bij ${name}`}
          onReveal={() => setRevealedB(true)}
          onConceal={() => setRevealedB(false)}
          compact
        />
      </div>

      {(showReadOnlyA || showReadOnlyB) && (
        <div className="mt-1 text-xs space-y-0.5" style={{ color: "var(--text2)" }}>
          {showReadOnlyA && (
            <div>
              <span className="font-medium" style={{ color: colourA }}>{profileA.name}:</span>{" "}
              {entryA.comment}
            </div>
          )}
          {showReadOnlyB && (
            <div>
              <span className="font-medium" style={{ color: colourB }}>{profileB.name}:</span>{" "}
              {entryB.comment}
            </div>
          )}
        </div>
      )}

      {canEdit && !showEditors && (
        <button
          type="button"
          onClick={() => setNotesOpen(true)}
          aria-label={`Notitie toevoegen voor ${name}`}
          className="focus-ring mt-1 -mb-1 inline-flex items-center h-8 text-xs rounded-lg px-2 -ml-2 transition-colors"
          style={{ color: "var(--text2)" }}
        >
          + Notitie
        </button>
      )}

      {canEdit && showEditors && (
        <div className="mt-2 space-y-1.5">
          {canEditA && (
            <textarea
              aria-label={`Notitie ${profileA.name}`}
              placeholder={`Notitie ${profileA.name}…`}
              value={entryA.comment}
              onChange={(event) => onCommentA?.(event.target.value)}
              rows={1}
              maxLength={200}
              className="focus-ring w-full text-xs rounded-lg px-2.5 py-1.5 resize-none focus:outline-none"
              style={{
                background: "var(--surface2)",
                border: `1px solid color-mix(in srgb, ${colourA} 30%, var(--border))`,
                color: "var(--text)",
              }}
            />
          )}
          {canEditB && (
            <textarea
              aria-label={`Notitie ${profileB.name}`}
              placeholder={`Notitie ${profileB.name}…`}
              value={entryB.comment}
              onChange={(event) => onCommentB?.(event.target.value)}
              rows={1}
              maxLength={200}
              className="focus-ring w-full text-xs rounded-lg px-2.5 py-1.5 resize-none focus:outline-none"
              style={{
                background: "var(--surface2)",
                border: `1px solid color-mix(in srgb, ${colourB} 30%, var(--border))`,
                color: "var(--text)",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
