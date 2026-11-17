"use client";

import Link from "next/link";
import { FileText, FilmSlate } from "@phosphor-icons/react";
import StatusGlyph from "@/components/StatusGlyph";
import CompareKinkRow from "@/components/CompareKinkRow";
import { PROFILE_COLOUR_A, PROFILE_COLOUR_B, type CompareResultFilter } from "@/lib/compare";
import type { CompareModel, ComparisonFact } from "@/lib/compareV2";
import { comparisonDirectionNote } from "@/lib/comparePresentation";
import { CATEGORIES, kinkCategoryLabel } from "@/lib/kinks";
import { STATUS_LABEL, STATUS_VAR } from "@/lib/statusLabels";
import type { KinkCategoryId, Profile } from "@/types";

interface Props {
  profileA: Profile | undefined;
  profileB: Profile | undefined;
  samePairError: boolean;
  selectedResults: ReadonlySet<CompareResultFilter>;
  selectedCategories: ReadonlySet<KinkCategoryId>;
  discussed: ReadonlySet<string>;
  hideDiscussed: boolean;
  model: CompareModel;
  onToggleDiscussed: (id: string) => void;
}

function matchesResultFilter(fact: ComparisonFact, selected: ReadonlySet<CompareResultFilter>): boolean {
  if (selected.size === 0) return true;
  if (fact.kind === "conflict" || fact.kind === "limit") return selected.has("boundaries");
  return selected.has(fact.kind);
}

export default function CompareResults({
  profileA,
  profileB,
  samePairError,
  selectedResults,
  selectedCategories,
  discussed,
  hideDiscussed,
  model,
  onToggleDiscussed,
}: Props) {
  if (!profileA || !profileB || samePairError) {
    return (
      <p className="py-12 text-center text-sm" style={{ color: "var(--text2)" }}>
        {samePairError ? "Kies twee verschillende profielen." : "Kies twee profielen, dan vergelijken we alleen wat aan beide kanten zichtbaar is."}
      </p>
    );
  }

  const facts = model.facts.filter((fact) => {
    if (!matchesResultFilter(fact, selectedResults)) return false;
    if (selectedCategories.size > 0 && (fact.category === null || !selectedCategories.has(fact.category))) return false;
    if (hideDiscussed && discussed.has(fact.id)) return false;
    return true;
  });

  const renderFact = (fact: ComparisonFact) => (
    <CompareKinkRow
      key={fact.id}
      name={fact.label}
      directionNote={comparisonDirectionNote(fact, profileA, profileB)}
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
    />
  );

  // Only read the privacy-filtered projection; a missing answer says nothing about privacy.
  const unpairedLimits = model.unpaired.filter((item) => item.status === "hard_no");
  const otherUnpaired = model.unpaired.filter((item) => item.status !== "hard_no");

  const uncategorized = facts.filter((fact) => fact.category === null);
  const filtersActive = selectedResults.size > 0 || selectedCategories.size > 0;

  return (
    <>
      {unpairedLimits.length > 0 && (
        <section className="mb-6" aria-labelledby="compare-unpaired-limits-heading">
          <h2 id="compare-unpaired-limits-heading" className="mb-2 text-base" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400 }}>Harde grenzen met één zichtbaar antwoord</h2>
          <p className="mb-2 text-sm" style={{ color: "var(--text2)" }}>Deze grenzen blijven zichtbaar bij alle filters. Ze tellen niet mee als gezamenlijke vergelijking.</p>
          <ul>
            {unpairedLimits.map((item) => {
              const owner = item.visibleSide === "a" ? profileA : profileB;
              const other = item.visibleSide === "a" ? profileB : profileA;
              return (
                <li key={item.id} className="border-b border-dashed py-3 text-sm [overflow-wrap:anywhere]" style={{ borderColor: "var(--border)" }}>
                  <p className="font-medium">{item.label}</p>
                  <p className="mt-1"><span style={{ color: item.visibleSide === "a" ? PROFILE_COLOUR_A : PROFILE_COLOUR_B }}>{owner.name}</span>: <span style={{ color: STATUS_VAR.hard_no }}><StatusGlyph status="hard_no" size={14} /> {STATUS_LABEL.hard_no}</span></p>
                  <p className="mt-1" style={{ color: "var(--text2)" }}>{other.name}: geen zichtbaar antwoord.</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {CATEGORIES.map((category) => {
        const categoryFacts = facts.filter((fact) => fact.category === category);
        if (!categoryFacts.length) return null;
        return (
          <section key={category} id={`cat-${category}`} className="mb-6" style={{ scrollMarginTop: "calc(var(--nav-h) + var(--compare-subnav-h) + 1rem)" }}>
            <h2 className="mb-2 px-1 text-base" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--text)" }}>{kinkCategoryLabel(category)}</h2>
            <div className="flex flex-col gap-2">{categoryFacts.map(renderFact)}</div>
          </section>
        );
      })}

      {uncategorized.length > 0 && (
        <section className="mb-6" aria-labelledby="compare-more-heading">
          <h2 id="compare-more-heading" className="mb-2 px-1 text-base" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--text)" }}>Meer</h2>
          <div className="flex flex-col gap-2">{uncategorized.map(renderFact)}</div>
        </section>
      )}

      {facts.length === 0 && model.summary.jointlyAssessed > 0 && (
        <p className="py-8 text-center text-sm" style={{ color: "var(--text2)" }}>
          {filtersActive ? "Geen resultaten voor deze combinatie van filters." : "Nog geen voorkeuren om hier te tonen."}
        </p>
      )}

      {!filtersActive && otherUnpaired.length > 0 && (
        <details className="mb-6 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <summary className="ks-motion-choice focus-ring min-h-11 cursor-pointer px-3 py-3 text-sm font-medium">Nog niet door beiden beoordeeld · {otherUnpaired.length}</summary>
          <div className="space-y-2 px-3 pb-3">
            <p className="text-sm leading-relaxed" style={{ color: "var(--text2)" }}>Deze voorkeuren tellen niet mee als vergelijking.</p>
            {otherUnpaired.map((item) => {
              const owner = item.visibleSide === "a" ? profileA.name : profileB.name;
              return (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
                  <span className="min-w-0 [overflow-wrap:anywhere]">{item.label}</span>
                  <span className="min-w-0 text-right [overflow-wrap:anywhere]" style={{ color: "var(--text2)" }}>{owner}: <span style={{ color: STATUS_VAR[item.status] }}>{STATUS_LABEL[item.status]}</span></span>
                </div>
              );
            })}
          </div>
        </details>
      )}

      <div className="compare-page-actions flex flex-wrap gap-2 pb-2 pt-2" data-print-hide="true">
        <Link href={`/scene?a=${profileA.id}&b=${profileB.id}`} prefetch={false} className="ks-motion-choice focus-ring flex min-h-11 flex-1 basis-auto items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium hover:opacity-80" style={{ borderColor: "var(--border)", color: "var(--text)" }}><FilmSlate size={16} aria-hidden="true" /> Plan een scène</Link>
        <Link href={`/contract?a=${profileA.id}&b=${profileB.id}`} prefetch={false} className="ks-motion-choice focus-ring flex min-h-11 flex-1 basis-auto items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:opacity-80" style={{ background: "var(--action-primary)", color: "var(--on-accent)" }}><FileText size={16} aria-hidden="true" /> Contract</Link>
      </div>
    </>
  );
}
