"use client";

import DiscussedToggle from "@/components/DiscussedToggle";
import { kinkCategoryLabel } from "@/lib/kinkCategories";
import type { CompareCategoryScore, CompareFilterMode } from "@/lib/compare";
import type { KinkCategoryId } from "@/types";

interface CompareToolbarProps {
  categoryScores: CompareCategoryScore[];
  filterMode: CompareFilterMode;
  matchCount: number;
  discussCount: number;
  hardLimitCount: number;
  discussedCount: number;
  hideDiscussed: boolean;
  onFilterChange: (filter: CompareFilterMode) => void;
  onToggleHideDiscussed: () => void;
}

const FILTER_LABELS: Record<CompareFilterMode, string> = {
  all: "Alles",
  match: "Match",
  conflict: "Bespreken",
  hardno: "Grenzen",
};

export default function CompareToolbar({
  categoryScores,
  filterMode,
  matchCount,
  discussCount,
  hardLimitCount,
  discussedCount,
  hideDiscussed,
  onFilterChange,
  onToggleHideDiscussed,
}: CompareToolbarProps) {
  const scrollToCategory = (category: KinkCategoryId) => {
    document.getElementById(`cat-${category}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <>
      <nav
        className="no-scrollbar flex gap-2 overflow-x-auto pb-2 mb-3"
        aria-label="Spring naar categorie"
      >
        {categoryScores
          .filter(({ rated }) => rated > 0)
          .map(({ category, rate, compared }) => {
            const score = rate === null ? null : Math.round(rate * 100);
            const label = kinkCategoryLabel(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => scrollToCategory(category)}
                aria-label={score === null
                  ? `${label}, nog geen gezamenlijke score`
                  : `${label}, ${score} procent compatibiliteit over ${compared} gezamenlijke beoordelingen`}
                className="focus-ring flex-none min-h-11 rounded-full px-3 text-xs whitespace-nowrap"
                style={{
                  color: "var(--text)",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                }}
              >
                {label}{score === null ? "" : ` · ${score}%`}
              </button>
            );
          })}
      </nav>

      <div
        className="flex items-stretch mb-4 border-b overflow-x-auto"
        style={{ borderColor: "var(--border)" }}
        role="group"
        aria-label="Vergelijkingsfilter"
      >
        {(["all", "match", "conflict", "hardno"] as const).map((filter) => {
          const badge = filter === "match"
            ? matchCount
            : filter === "conflict"
              ? discussCount
              : filter === "hardno"
                ? hardLimitCount
                : null;
          const badgeColour = filter === "match"
            ? "var(--yes)"
            : filter === "hardno"
              ? "var(--hard-no-text)"
              : "var(--conflict)";
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
              {badge !== null && badge > 0 && (
                <span
                  className="text-[11px] px-1 py-px rounded-full font-semibold tabular-nums"
                  style={{
                    background: `color-mix(in srgb, ${badgeColour} 20%, transparent)`,
                    color: badgeColour,
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <DiscussedToggle
        count={discussedCount}
        hidden={hideDiscussed}
        onToggle={onToggleHideDiscussed}
      />
    </>
  );
}
