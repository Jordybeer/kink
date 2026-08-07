"use client";

import Link from "next/link";
import { ArrowUp, FileText, FilmSlate } from "@phosphor-icons/react";
import CompareKinkRow from "@/components/CompareKinkRow";
import { CATEGORIES, getKinksByCategory } from "@/lib/kinks";
import {
  getCompareEntry,
  mergeCustomKinks,
  passesCompareFilter,
  PROFILE_COLOUR_A,
  PROFILE_COLOUR_B,
  type CompareFilterMode,
} from "@/lib/compare";
import type { Profile } from "@/types";

interface CompareResultsProps {
  profileA: Profile | undefined;
  profileB: Profile | undefined;
  samePairError: boolean;
  filterMode: CompareFilterMode;
  discussed: ReadonlySet<string>;
  hideDiscussed: boolean;
  onToggleDiscussed: (id: string) => void;
  onComment: (profileId: string, kinkId: string, comment: string) => void;
}

export default function CompareResults({
  profileA,
  profileB,
  samePairError,
  filterMode,
  discussed,
  hideDiscussed,
  onToggleDiscussed,
  onComment,
}: CompareResultsProps) {
  if (!profileA || !profileB || samePairError) {
    return (
      <p className="text-center py-12 text-sm" style={{ color: "var(--text2)" }}>
        {samePairError
          ? "Kies twee verschillende profielen."
          : "Kies twee profielen, dan kijken we wat jullie gemeen hebben."}
      </p>
    );
  }

  const customKinks = mergeCustomKinks(profileA, profileB);

  return (
    <>
      {CATEGORIES.map((category) => {
        const kinks = getKinksByCategory(category).filter((kink) => {
          if (hideDiscussed && discussed.has(kink.id)) return false;
          return passesCompareFilter(
            getCompareEntry(profileA, kink.id),
            getCompareEntry(profileB, kink.id),
            filterMode,
          );
        });

        if (!kinks.length) return null;

        return (
          <section
            key={category}
            id={`cat-${category}`}
            className="mb-6"
            style={{ scrollMarginTop: "calc(var(--nav-h) + var(--compare-subnav-h) + 1rem)" }}
          >
            <h2
              className="text-sm mb-2 px-1"
              style={{
                fontFamily: "var(--font-display, Georgia, serif)",
                fontStyle: "italic",
                fontWeight: 400,
                color: "var(--text)",
              }}
            >
              {category}
            </h2>
            <div className="flex flex-col gap-2">
              {kinks.map((kink) => {
                const entryA = getCompareEntry(profileA, kink.id);
                const entryB = getCompareEntry(profileB, kink.id);

                return (
                  <CompareKinkRow
                    key={kink.id}
                    rowKey={kink.id}
                    name={kink.name}
                    entryA={entryA}
                    entryB={entryB}
                    profileA={profileA}
                    profileB={profileB}
                    colourA={PROFILE_COLOUR_A}
                    colourB={PROFILE_COLOUR_B}
                    isDiscussed={discussed.has(kink.id)}
                    onToggleDiscussed={() => onToggleDiscussed(kink.id)}
                    onCommentA={!profileA.isImported
                      ? (comment) => onComment(profileA.id, kink.id, comment)
                      : undefined}
                    onCommentB={!profileB.isImported
                      ? (comment) => onComment(profileB.id, kink.id, comment)
                      : undefined}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      {customKinks.length > 0 && (
        <section className="mb-6" aria-labelledby="compare-more-heading">
          <h2
            id="compare-more-heading"
            className="text-sm mb-2 px-1"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontStyle: "italic",
              fontWeight: 400,
              color: "var(--text)",
            }}
          >
            Meer
          </h2>
          <div className="flex flex-col gap-2">
            {customKinks.map((item) => {
              const entryA = item.aId
                ? getCompareEntry(profileA, item.aId)
                : { status: null, comment: "" };
              const entryB = item.bId
                ? getCompareEntry(profileB, item.bId)
                : { status: null, comment: "" };
              const rowKey = item.name.trim().toLowerCase();

              if (
                !passesCompareFilter(entryA, entryB, filterMode)
                || (hideDiscussed && discussed.has(rowKey))
              ) {
                return null;
              }

              return (
                <CompareKinkRow
                  key={rowKey}
                  rowKey={rowKey}
                  name={item.name}
                  entryA={entryA}
                  entryB={entryB}
                  profileA={profileA}
                  profileB={profileB}
                  colourA={PROFILE_COLOUR_A}
                  colourB={PROFILE_COLOUR_B}
                  custom
                  isDiscussed={discussed.has(rowKey)}
                  onToggleDiscussed={() => onToggleDiscussed(rowKey)}
                  onCommentA={!profileA.isImported && item.aId
                    ? (comment) => onComment(profileA.id, item.aId!, comment)
                    : undefined}
                  onCommentB={!profileB.isImported && item.bId
                    ? (comment) => onComment(profileB.id, item.bId!, comment)
                    : undefined}
                />
              );
            })}
          </div>
        </section>
      )}

      <div className="pt-2 pb-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <Link
            href={`/scene?a=${profileA.id}&b=${profileB.id}`}
            prefetch={false}
            className="focus-ring min-h-11 flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-opacity hover:opacity-80"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            <FilmSlate size={14} aria-hidden="true" /> Plan een scène
          </Link>
          <Link
            href={`/contract?a=${profileA.id}&b=${profileB.id}`}
            prefetch={false}
            className="focus-ring min-h-11 flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--action-primary)", color: "var(--on-accent)" }}
          >
            <FileText size={14} aria-hidden="true" /> Contract
          </Link>
        </div>
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="focus-ring min-h-11 text-xs px-4 rounded-full border transition-colors"
            style={{ color: "var(--text2)", borderColor: "var(--border)" }}
          >
            <ArrowUp size={14} aria-hidden="true" /> Terug naar boven
          </button>
        </div>
      </div>
    </>
  );
}
