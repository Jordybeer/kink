"use client";

import Link from "next/link";
import { ArrowUp, FileText, FilmSlate } from "@phosphor-icons/react";
import CompareKinkRow from "@/components/CompareKinkRow";
import { PROFILE_COLOUR_A, PROFILE_COLOUR_B, type CompareFilterMode } from "@/lib/compare";
import { buildCompareModel, type ComparisonFact } from "@/lib/compareV2";
import { CATEGORIES, kinkCategoryLabel } from "@/lib/kinks";
import { STATUS_LABEL, STATUS_VAR } from "@/lib/statusLabels";
import type { Profile } from "@/types";

interface Props {
  profileA: Profile | undefined;
  profileB: Profile | undefined;
  samePairError: boolean;
  filterMode: CompareFilterMode;
  discussed: ReadonlySet<string>;
  hideDiscussed: boolean;
  onToggleDiscussed: (id: string) => void;
  onComment: (profileId: string, kinkId: string, comment: string) => void;
}

export default function CompareResults({ profileA, profileB, samePairError, filterMode, discussed, hideDiscussed, onToggleDiscussed, onComment }: Props) {
  if (!profileA || !profileB || samePairError) {
    return (
      <p className="text-center py-12 text-sm" style={{ color: "var(--text2)" }}>
        {samePairError ? "Kies twee verschillende profielen." : "Kies twee profielen, dan vergelijken we alleen wat aan beide kanten zichtbaar is."}
      </p>
    );
  }

  const model = buildCompareModel(profileA, profileB);
  const facts = model.facts.filter((fact) => {
    if (filterMode !== "all" && fact.kind !== filterMode) return false;
    if (hideDiscussed && discussed.has(fact.id)) return false;
    return true;
  });

  const renderFact = (fact: ComparisonFact) => (
    <CompareKinkRow
      key={fact.id}
      rowKey={fact.id}
      name={fact.label}
      entryA={profileA.entries[fact.kinkAId]}
      entryB={profileB.entries[fact.kinkBId]}
      profileA={profileA}
      profileB={profileB}
      colourA={PROFILE_COLOUR_A}
      colourB={PROFILE_COLOUR_B}
      factKind={fact.kind}
      custom={fact.custom}
      isDiscussed={discussed.has(fact.id)}
      onToggleDiscussed={() => onToggleDiscussed(fact.id)}
      onCommentA={!profileA.isImported ? (comment) => onComment(profileA.id, fact.kinkAId, comment) : undefined}
      onCommentB={!profileB.isImported ? (comment) => onComment(profileB.id, fact.kinkBId, comment) : undefined}
    />
  );

  const uncategorized = facts.filter((fact) => fact.category === null);

  return (
    <>
      {model.summary.jointlyAssessed === 0 && (
        <div className="rounded-xl border px-4 py-5 mb-4 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Nog geen gezamenlijk beoordeelde punten.</p>
          <p className="text-xs mt-1" style={{ color: "var(--text2)" }}>Een antwoord van één profiel alleen wordt niet als vergelijking geïnterpreteerd.</p>
        </div>
      )}

      {CATEGORIES.map((category) => {
        const categoryFacts = facts.filter((fact) => fact.category === category);
        if (!categoryFacts.length) return null;
        return (
          <section key={category} id={`cat-${category}`} className="mb-6" style={{ scrollMarginTop: "calc(var(--nav-h) + var(--compare-subnav-h) + 1rem)" }}>
            <h2 className="text-sm mb-2 px-1" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--text)" }}>{kinkCategoryLabel(category)}</h2>
            <div className="flex flex-col gap-2">{categoryFacts.map(renderFact)}</div>
          </section>
        );
      })}

      {uncategorized.length > 0 && (
        <section className="mb-6" aria-labelledby="compare-more-heading">
          <h2 id="compare-more-heading" className="text-sm mb-2 px-1" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--text)" }}>Meer</h2>
          <div className="flex flex-col gap-2">{uncategorized.map(renderFact)}</div>
        </section>
      )}

      {facts.length === 0 && model.summary.jointlyAssessed > 0 && (
        <p className="text-center py-8 text-sm" style={{ color: "var(--text2)" }}>Geen gezamenlijk beoordeelde punten in dit filter.</p>
      )}

      {filterMode === "all" && model.unpaired.length > 0 && (
        <details className="mb-6 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <summary className="focus-ring cursor-pointer min-h-11 px-3 py-2.5 text-sm font-medium">Nog niet door beiden beoordeeld · {model.unpaired.length}</summary>
          <div className="px-3 pb-3 space-y-2">
            <p className="text-xs" style={{ color: "var(--text2)" }}>Deze punten tellen nergens mee als pair-resultaat.</p>
            {model.unpaired.map((item) => {
              const owner = item.visibleSide === "a" ? profileA.name : profileB.name;
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
                  <span className="min-w-0 truncate">{item.label}</span>
                  <span className="flex-none text-right" style={{ color: "var(--text2)" }}>{owner}: <span style={{ color: STATUS_VAR[item.status] }}>{STATUS_LABEL[item.status]}</span></span>
                </div>
              );
            })}
          </div>
        </details>
      )}

      <div className="pt-2 pb-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <Link href={`/scene?a=${profileA.id}&b=${profileB.id}`} prefetch={false} className="focus-ring min-h-11 flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-opacity hover:opacity-80" style={{ borderColor: "var(--border)", color: "var(--text)" }}><FilmSlate size={14} aria-hidden="true" /> Plan een scène</Link>
          <Link href={`/contract?a=${profileA.id}&b=${profileB.id}`} prefetch={false} className="focus-ring min-h-11 flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-80" style={{ background: "var(--action-primary)", color: "var(--on-accent)" }}><FileText size={14} aria-hidden="true" /> Contract</Link>
        </div>
        <div className="flex justify-center pt-1"><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="focus-ring min-h-11 text-xs px-4 rounded-full border transition-colors" style={{ color: "var(--text2)", borderColor: "var(--border)" }}><ArrowUp size={14} aria-hidden="true" /> Terug naar boven</button></div>
      </div>
    </>
  );
}
