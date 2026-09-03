"use client";

import { Check } from "@phosphor-icons/react";
import Sheet from "@/components/Sheet";
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
    <Sheet
      open={open}
      onClose={onClose}
      title="Categorieën"
      scrollable
      aria-label="Categorie kiezen"
    >
      <p className="mb-3 max-w-sm px-1 text-sm leading-5" style={{ color: "var(--text2)" }}>
        Kies wat je in de catalogus wilt bekijken.
      </p>

      <div
        className="overflow-hidden"
        style={{
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          type="button"
          onClick={() => choose(null)}
          aria-pressed={selected === null}
          className="focus-ring flex min-h-14 w-full items-center gap-3 px-2 text-left"
          style={selected === null
            ? { background: "color-mix(in srgb, var(--accent) 6%, transparent)" }
            : undefined}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Alle categorieën</span>
            <span className="mt-0.5 block text-xs tabular-nums" style={{ color: "var(--text2)" }}>
              {totalRated} van {totalCount} beoordeeld
            </span>
          </span>
          {selected === null && (
            <Check size={16} weight="bold" className="flex-none" aria-hidden="true" style={{ color: "var(--accent)" }} />
          )}
        </button>

        {categories.map((category) => {
          const active = selected === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => choose(category.id)}
              aria-pressed={active}
              className="focus-ring flex min-h-14 w-full items-center gap-3 px-2 text-left"
              style={{
                borderTop: "1px solid var(--border)",
                background: active ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "transparent",
              }}
            >
              <span
                className="min-w-0 flex-1 text-sm font-semibold leading-snug"
                style={{ color: active ? "var(--accent-text)" : "var(--text)" }}
              >
                {category.label}
              </span>
              <span className="flex-none text-xs tabular-nums" style={{ color: "var(--text2)" }}>
                {category.rated} / {category.total}
              </span>
              {active && (
                <Check size={15} weight="bold" className="flex-none" aria-hidden="true" style={{ color: "var(--accent)" }} />
              )}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
