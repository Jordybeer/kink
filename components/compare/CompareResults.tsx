"use client";

import Link from "next/link";
import { ArrowUp, FileText, FilmSlate } from "@phosphor-icons/react";
import CompareKinkRow from "@/components/CompareKinkRow";
import { PROFILE_COLOUR_A, PROFILE_COLOUR_B, type CompareResultFilter } from "@/lib/compare";
import { buildCompareModel, type ComparisonFact } from "@/lib/compareV2";
import { directionalSideForKinkId } from "@/lib/directionality";
import { CATEGORIES, kinkCategoryLabel } from "@/lib/kinks";
import { complementaryParticipationSideLabel } from "@/lib/participation";
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
  onToggleDiscussed: (id: string) => void;
  onComment: (profileId: string, kinkId: string, comment: string) => void;
}

function matchesResultFilter(fact: ComparisonFact, selected: ReadonlySet<CompareResultFilter>): boolean {
  if (selected.size === 0) return true;
  if (fact.kind === "conflict" || fact.kind === "limit") return selected.has("boundaries");
  return selected.has(fact.kind);
}

function directionNote(fact: ComparisonFact, profileA: Profile, profileB: Profile): string | undefined {
  if (fact.relation !== "complementary") return undefined;

  const sideA = directionalSideForKinkId(fact.kinkAId);
  if (sideA === "give") return `${profileA.name} geeft · ${profileB.name} ontvangt`;
  if (sideA === "receive") return `${profileA.name} ontvangt · ${profileB.name} geeft`;

  const participationA = complementaryParticipationSideLabel(fact.kinkAId);
  const participationB = complementaryParticipationSideLabel(fact.kinkBId);
  if (participationA && participationB) {
    return `${profileA.name}: ${participationA.toLocaleLowerCase("nl-BE")} · ${profileB.name}: ${participationB.toLocaleLowerCase("nl-BE")}`;
  }

  return undefined;
}

export default function CompareResults({
  profileA,
  profileB,
  samePairError,
  selectedResults,
  selectedCategories,
  discussed,
  hideDiscussed,
  onToggleDiscussed,
  onComment,
}: Props) {
  if (!profileA || !profileB || samePairError) {
    return (
      <p className="py-12 text-center text-[14px]" style={{ color: "var(--text2)" }}>
        {samePairError ? "Kies twee verschillende profielen." : "Kies twee profielen, dan vergelijken we alleen wat aan beide kanten zichtbaar is."}
      </p>
    );
  }

  const model = buildCompareModel(profileA, profileB);
  const facts = model.facts.filter((fact) => {
    if (!matchesResultFilter(fact, selectedResults)) return false;
    if (selectedCategories.size > 0 && (fact.category === null || !selectedCategories.has(fact.category))) return false;
    if (hideDiscussed && discussed.has(fact.id)) return false;
    return true;
  });

  const renderFact = (fact: ComparisonFact) => (
    <CompareKinkRow
      key={fact.id}
      rowKey={fact.id}
      name={fact.label}
      directionNote={directionNote(fact, profileA, profileB)}
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
  const filtersActive = selectedResults.size > 0 || selectedCategories.size > 0;

  return (
    <>
      {model.summary.jointlyAssessed === 0 && (
        <div className="mb-4 rounded-xl border px-4 py-5 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <p className="text-[15px] font-medium" style={{ color: "var(--text)" }}>Nog geen voorkeuren aan beide kanten ingevuld.</p>
          <p className="mt-1 text-[14px] leading-relaxed" style={{ color: "var(--text2)" }}>Een antwoord van één profiel alleen wordt niet als vergelijking geïnterpreteerd.</p>
        </div>
      )}

      {CATEGORIES.map((category) => {
        const categoryFacts = facts.filter((fact) => fact.category === category);
        if (!categoryFacts.length) return null;
        return (
          <section key={category} id={`cat-${category}`} className="mb-6" style={{ scrollMarginTop: "calc(var(--nav-h) + var(--compare-subnav-h) + 1rem)" }}>
            <h2 className="mb-2 px-1 text-[15px]" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--text)" }}>{kinkCategoryLabel(category)}</h2>
            <div className="flex flex-col gap-2">{categoryFacts.map(renderFact)}</div>
          </section>
        );
      })}

      {uncategorized.length > 0 && (
        <section className="mb-6" aria-labelledby="compare-more-heading">
          <h2 id="compare-more-heading" className="mb-2 px-1 text-[15px]" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--text)" }}>Meer</h2>
          <div className="flex flex-col gap-2">{uncategorized.map(renderFact)}</div>
        </section>
      )}

      {facts.length === 0 && model.summary.jointlyAssessed > 0 && (
        <p className="py-8 text-center text-[14px]" style={{ color: "var(--text2)" }}>
          {filtersActive ? "Geen resultaten voor deze combinatie van filters." : "Nog geen voorkeuren om hier te tonen."}
        </p>
      )}

      {!filtersActive && model.unpaired.length > 0 && (
        <details className="mb-6 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <summary className="focus-ring min-h-11 cursor-pointer px-3 py-3 text-[14px] font-medium">Nog niet door beiden beoordeeld · {model.unpaired.length}</summary>
          <div className="space-y-2 px-3 pb-3">
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--text2)" }}>Deze voorkeuren tellen niet mee als vergelijking.</p>
            {model.unpaired.map((item) => {
              const owner = item.visibleSide === "a" ? profileA.name : profileB.name;
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-[14px]" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
                  <span className="min-w-0 truncate">{item.label}</span>
                  <span className="flex-none text-right" style={{ color: "var(--text2)" }}>{owner}: <span style={{ color: STATUS_VAR[item.status] }}>{STATUS_LABEL[item.status]}</span></span>
                </div>
              );
            })}
          </div>
        </details>
      )}

      <div className="flex flex-col gap-2 pb-2 pt-2">
        <div className="flex gap-2">
          <Link href={`/scene?a=${profileA.id}&b=${profileB.id}`} prefetch={false} className="focus-ring flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[14px] font-medium transition-opacity hover:opacity-80" style={{ borderColor: "var(--border)", color: "var(--text)" }}><FilmSlate size={16} aria-hidden="true" /> Plan een scène</Link>
          <Link href={`/contract?a=${profileA.id}&b=${profileB.id}`} prefetch={false} className="focus-ring flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-opacity hover:opacity-80" style={{ background: "var(--action-primary)", color: "var(--on-accent)" }}><FileText size={16} aria-hidden="true" /> Contract</Link>
        </div>
        <div className="flex justify-center pt-1"><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="focus-ring min-h-11 rounded-full border px-4 text-[14px] transition-colors" style={{ color: "var(--text2)", borderColor: "var(--border)" }}><ArrowUp size={16} aria-hidden="true" /> Terug naar boven</button></div>
      </div>
    </>
  );
}
