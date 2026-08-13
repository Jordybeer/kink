"use client";

import DiscussedToggle from "@/components/DiscussedToggle";
import { kinkCategoryLabel } from "@/lib/kinkCategories";
import type { CompareCategoryEvidence, CompareSummary } from "@/lib/compareV2";

export type CompareFilterModeV2 =
  | "all"
  | "shared"
  | "complementary"
  | "discuss"
  | "soft"
  | "conflict"
  | "limit";

interface CompareToolbarProps {
  categories: CompareCategoryEvidence[];
  summary: CompareSummary;
  filterMode: CompareFilterModeV2;
  discussedCount: number;
  hideDiscussed: boolean;
  onFilterChange: (filter: CompareFilterModeV2) => void;
  onToggleHideDiscussed: () => void;
}

const FILTER_LABELS: Record<CompareFilterModeV2, string> = {
  all: "Alles",
  shared: "Gedeeld",
  complementary: "Complementair",
  discuss: "Bespreken",
  soft: "Zacht",
  conflict: "Conflicten",
  limit: "Grenzen",
};

export default function CompareToolbar({
  categories,
  summary,
  filterMode,
  discussedCount,
  hideDiscussed,
  onFilterChange,
  onToggleHideDiscussed,
}: CompareToolbarProps) {
  const scrollToCategory = (category: CompareCategoryEvidence["category"]) => {
    document.getElementById(`cat-${category}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const counts: Record<Exclude<CompareFilterModeV2, "all">, number> = {
    shared: summary.shared,
    complementary: summary.complementary,
    discuss: summary.discuss,
    soft: summary.soft,
    conflict: summary.conflict,
    limit: summary.limit,
  };

  return (
    <>
      <nav className="no-scrollbar flex gap-2 overflow-x-auto pb-2 mb-3" aria-label="Spring naar categorie">
        {categories
          .filter(({ jointlyAssessed }) => jointlyAssessed > 0)
          .map((category) => {
            const label = kinkCategoryLabel(category.category);
            const positive = category.shared + category.complementary;
            return (
              <button
                key={category.category}
                type="button"
                onClick={() => scrollToCategory(category.category)}
                aria-label={`${label}, ${category.jointlyAssessed} gezamenlijk beoordeeld${positive > 0 ? `, ${positive} gedeeld of complementair` : ""}`}
                className="focus-ring flex-none min-h-11 rounded-full px-3 text-xs whitespace-nowrap"
                style={{ color: "var(--text)", background: "var(--surface2)", border: "1px solid var(--border)" }}
              >
                {label} · {category.jointlyAssessed}
              </button>
            );
          })}
      </nav>

      <div className="no-scrollbar flex items-stretch mb-4 border-b overflow-x-auto" style={{ borderColor: "var(--border)" }} role="group" aria-label="Vergelijkingsfilter">
        {(Object.keys(FILTER_LABELS) as CompareFilterModeV2[]).map((filter) => {
          const count = filter === "all" ? null : counts[filter];
          const active = filterMode === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              aria-pressed={active}
              className="focus-ring min-h-11 flex flex-none items-center gap-1 px-3 text-xs font-medium transition-colors"
              style={{
                color: active ? "var(--text)" : "var(--text2)",
                borderBottom: active ? "2px solid var(--focus)" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              {FILTER_LABELS[filter]}
              {count !== null && count > 0 && (
                <span className="text-[11px] px-1 py-px rounded-full font-semibold tabular-nums" style={{ background: "var(--surface2)", color: "var(--text2)" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <DiscussedToggle count={discussedCount} hidden={hideDiscussed} onToggle={onToggleHideDiscussed} />
    </>
  );
}
