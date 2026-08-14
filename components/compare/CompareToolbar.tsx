"use client";

import { useMemo, useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import DiscussedToggle from "@/components/DiscussedToggle";
import Sheet, { SheetContent } from "@/components/Sheet";
import { kinkCategoryLabel } from "@/lib/kinkCategories";
import type { CompareCategoryScore, CompareResultFilter } from "@/lib/compare";
import type { KinkCategoryId } from "@/types";

interface Props {
  categoryScores: CompareCategoryScore[];
  selectedResults: ReadonlySet<CompareResultFilter>;
  selectedCategories: ReadonlySet<KinkCategoryId>;
  discussedCount: number;
  hideDiscussed: boolean;
  onToggleResult: (filter: CompareResultFilter) => void;
  onClearResults: () => void;
  onToggleCategory: (category: KinkCategoryId) => void;
  onClearCategories: () => void;
  onToggleHideDiscussed: () => void;
}

const RESULT_OPTIONS: ReadonlyArray<{ id: CompareResultFilter; label: string; helper: string }> = [
  { id: "shared", label: "Samen", helper: "Allebei positief" },
  { id: "complementary", label: "Geven & ontvangen", helper: "De ene geeft wat de andere wil ontvangen" },
  { id: "discuss", label: "Bespreken", helper: "Verschil of twijfel" },
  { id: "soft", label: "Zachte verschillen", helper: "De ene is duidelijk enthousiaster" },
  { id: "boundaries", label: "Grenzen", helper: "Harde grenzen en expliciete botsingen" },
];

function FilterTrigger({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="focus-ring flex min-h-12 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-[15px] font-semibold"
      style={{ borderColor: "var(--border)", background: "var(--surface2)", color: "var(--text)" }}
    >
      <span className="min-w-0 truncate">{label}{count > 0 ? ` · ${count}` : ""}</span>
      <CaretDown size={17} className="shrink-0" aria-hidden="true" />
    </button>
  );
}

export default function CompareToolbar({
  categoryScores,
  selectedResults,
  selectedCategories,
  discussedCount,
  hideDiscussed,
  onToggleResult,
  onClearResults,
  onToggleCategory,
  onClearCategories,
  onToggleHideDiscussed,
}: Props) {
  const [resultsOpen, setResultsOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const categoryOptions = useMemo(
    () => categoryScores.filter((item) => item.jointlyAssessed > 0),
    [categoryScores],
  );

  return (
    <>
      <div className="mb-3 grid grid-cols-2 gap-2" aria-label="Vergelijking filteren">
        <FilterTrigger label="Resultaten" count={selectedResults.size} onClick={() => setResultsOpen(true)} />
        <FilterTrigger label="Categorieën" count={selectedCategories.size} onClick={() => setCategoriesOpen(true)} />
      </div>

      <DiscussedToggle count={discussedCount} hidden={hideDiscussed} onToggle={onToggleHideDiscussed} />

      <Sheet open={resultsOpen} onClose={() => setResultsOpen(false)} scrollable aria-label="Resultaten filteren">
        <SheetContent
          showHandle={false}
          className="max-h-[82dvh] overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4"
        >
          <div className="px-1 pb-3">
            <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Resultaten</h3>
            <p className="mt-1 text-[14px] leading-relaxed" style={{ color: "var(--text2)" }}>
              Kies één of meer soorten. Zonder selectie zie je alles.
            </p>
          </div>

          <button
            type="button"
            onClick={onClearResults}
            aria-pressed={selectedResults.size === 0}
            className="focus-ring mb-2 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left"
            style={selectedResults.size === 0
              ? { background: "color-mix(in srgb, var(--accent) 10%, var(--surface2))", border: "1px solid var(--border-accent)" }
              : { background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <span className="min-w-0 flex-1 text-sm font-semibold">Alles</span>
            {selectedResults.size === 0 && <Check size={17} weight="bold" aria-hidden="true" style={{ color: "var(--accent)" }} />}
          </button>

          <div className="space-y-2">
            {RESULT_OPTIONS.map((option) => {
              const active = selectedResults.has(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onToggleResult(option.id)}
                  aria-pressed={active}
                  className="focus-ring flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                  style={active
                    ? { background: "color-mix(in srgb, var(--accent) 10%, var(--surface2))", border: "1px solid var(--border-accent)" }
                    : { background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: active ? "var(--accent-text)" : "var(--text)" }}>{option.label}</p>
                    <p className="mt-0.5 text-[13px] leading-snug" style={{ color: "var(--text2)" }}>{option.helper}</p>
                  </div>
                  {active && <Check size={17} weight="bold" className="shrink-0" aria-hidden="true" style={{ color: "var(--accent)" }} />}
                </button>
              );
            })}
          </div>

          <button type="button" onClick={() => setResultsOpen(false)} className="focus-ring mt-3 min-h-11 w-full rounded-xl text-sm font-semibold" style={{ color: "var(--text2)" }}>
            Klaar
          </button>
        </SheetContent>
      </Sheet>

      <Sheet open={categoriesOpen} onClose={() => setCategoriesOpen(false)} scrollable aria-label="Categorieën filteren">
        <SheetContent
          showHandle={false}
          className="max-h-[82dvh] overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4"
        >
          <div className="px-1 pb-3">
            <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Categorieën</h3>
            <p className="mt-1 text-[14px] leading-relaxed" style={{ color: "var(--text2)" }}>
              Combineer gerust meerdere categorieën. Zonder selectie zie je ze allemaal.
            </p>
          </div>

          <button
            type="button"
            onClick={onClearCategories}
            aria-pressed={selectedCategories.size === 0}
            className="focus-ring mb-2 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left"
            style={selectedCategories.size === 0
              ? { background: "color-mix(in srgb, var(--accent) 10%, var(--surface2))", border: "1px solid var(--border-accent)" }
              : { background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <span className="min-w-0 flex-1 text-sm font-semibold">Alle categorieën</span>
            {selectedCategories.size === 0 && <Check size={17} weight="bold" aria-hidden="true" style={{ color: "var(--accent)" }} />}
          </button>

          <div className="grid grid-cols-2 gap-2">
            {categoryOptions.map((category) => {
              const active = selectedCategories.has(category.category);
              return (
                <button
                  key={category.category}
                  type="button"
                  onClick={() => onToggleCategory(category.category)}
                  aria-pressed={active}
                  className="focus-ring min-h-16 rounded-xl px-3 py-2.5 text-left"
                  style={active
                    ? { background: "color-mix(in srgb, var(--accent) 10%, var(--surface2))", border: "1px solid var(--border-accent)" }
                    : { background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 text-xs font-semibold leading-snug" style={{ color: active ? "var(--accent-text)" : "var(--text)" }}>
                      {kinkCategoryLabel(category.category)}
                    </span>
                    {active && <Check size={14} weight="bold" className="mt-0.5 shrink-0" aria-hidden="true" style={{ color: "var(--accent)" }} />}
                  </div>
                  <span className="mt-1 block text-[11px] tabular-nums" style={{ color: "var(--text2)" }}>
                    {category.jointlyAssessed} samen beoordeeld
                  </span>
                </button>
              );
            })}
          </div>

          <button type="button" onClick={() => setCategoriesOpen(false)} className="focus-ring mt-3 min-h-11 w-full rounded-xl text-sm font-semibold" style={{ color: "var(--text2)" }}>
            Klaar
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}
