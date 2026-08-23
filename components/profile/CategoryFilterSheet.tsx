"use client";

import { Check } from "@phosphor-icons/react";
import Sheet, { SheetContent } from "@/components/Sheet";
import type { KinkCategoryId } from "@/types";

interface CategoryOption {
  id: KinkCategoryId;
  label: string;
  rated: number;
  total: number;
}

interface CategoryFilterSheetProps {
  open: boolean;
  onClose: () => void;
  selected: KinkCategoryId | null;
  categories: readonly CategoryOption[];
  totalRated: number;
  totalCount: number;
  onSelect: (category: KinkCategoryId | null) => void;
}

export default function CategoryFilterSheet({
  open,
  onClose,
  selected,
  categories,
  totalRated,
  totalCount,
  onSelect,
}: CategoryFilterSheetProps) {
  function choose(category: KinkCategoryId | null) {
    onSelect(category);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} scrollable aria-label="Categorie kiezen">
      <SheetContent
        showHandle={false}
        className="max-h-[82dvh] overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4"
      >
        <div className="px-1 pb-3">
          <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Categorieën</h3>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
            Kies wat je in de catalogus wilt bekijken.
          </p>
        </div>

        <button
          type="button"
          onClick={() => choose(null)}
          aria-pressed={selected === null}
          className="focus-ring mb-2 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left"
          style={selected === null
            ? { background: "color-mix(in srgb, var(--accent) 10%, var(--surface2))", border: "1px solid var(--border-accent)" }
            : { background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Alle categorieën</p>
            <p className="mt-0.5 text-xs tabular-nums" style={{ color: "var(--text2)" }}>
              {totalRated} van {totalCount} beoordeeld
            </p>
          </div>
          {selected === null && <Check size={17} weight="bold" aria-hidden="true" style={{ color: "var(--accent)" }} />}
        </button>

        <div className="grid grid-cols-2 gap-2">
          {categories.map((category) => {
            const active = selected === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => choose(category.id)}
                aria-pressed={active}
                className="focus-ring min-h-16 rounded-xl px-3 py-2.5 text-left"
                style={active
                  ? { background: "color-mix(in srgb, var(--accent) 10%, var(--surface2))", border: "1px solid var(--border-accent)" }
                  : { background: "var(--surface2)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1 text-sm font-semibold leading-snug" style={{ color: active ? "var(--accent-text)" : "var(--text)" }}>
                    {category.label}
                  </span>
                  {active && <Check size={14} weight="bold" className="mt-0.5 flex-none" aria-hidden="true" style={{ color: "var(--accent)" }} />}
                </div>
                <span className="mt-1 block text-xs tabular-nums" style={{ color: "var(--text2)" }}>
                  {category.rated} / {category.total} beoordeeld
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="focus-ring mt-3 min-h-11 w-full rounded-xl text-sm font-semibold"
          style={{ color: "var(--text2)" }}
        >
          Sluiten
        </button>
      </SheetContent>
    </Sheet>
  );
}
