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
        <div className="px-1 pb-4">
          <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Categorieën</h3>
          <p className="mt-1 max-w-sm text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
            Kies één onderwerp om de catalogus rustig te beperken.
          </p>
        </div>

        <div
          className="overflow-hidden rounded-2xl"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          <button
            type="button"
            onClick={() => choose(null)}
            aria-pressed={selected === null}
            className="focus-ring flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left"
            style={selected === null
              ? { background: "color-mix(in srgb, var(--accent) 8%, var(--surface2))" }
              : undefined}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>Alle categorieën</span>
              <span className="mt-0.5 block text-xs tabular-nums" style={{ color: "var(--text2)" }}>
                {totalRated} van {totalCount} beoordeeld
              </span>
            </span>
            {selected === null && <Check size={17} weight="bold" aria-hidden="true" style={{ color: "var(--accent)" }} />}
          </button>

          {categories.map((category) => {
            const active = selected === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => choose(category.id)}
                aria-pressed={active}
                className="focus-ring flex min-h-14 w-full items-center gap-3 border-t px-4 py-2.5 text-left"
                style={{
                  borderColor: "var(--border)",
                  background: active ? "color-mix(in srgb, var(--accent) 8%, var(--surface2))" : "transparent",
                }}
              >
                <span
                  className="min-w-0 flex-1 text-sm font-semibold leading-snug"
                  style={{ color: active ? "var(--accent-text)" : "var(--text)" }}
                >
                  {category.label}
                </span>
                <span className="flex flex-none items-center gap-2">
                  <span className="text-xs tabular-nums" style={{ color: "var(--text2)" }}>
                    {category.rated}/{category.total}
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
                    {active && <Check size={15} weight="bold" style={{ color: "var(--accent)" }} />}
                  </span>
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
