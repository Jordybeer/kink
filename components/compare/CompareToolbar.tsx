"use client";

import DiscussedToggle from "@/components/DiscussedToggle";
import { kinkCategoryLabel } from "@/lib/kinkCategories";
import type { CompareCategoryScore, CompareFilterMode } from "@/lib/compare";

interface Props {
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

const FILTERS: ReadonlyArray<{ mode: CompareFilterMode; label: string }> = [
  { mode: "all", label: "Alles" },
  { mode: "shared", label: "Samen" },
  { mode: "complementary", label: "Rollen" },
  { mode: "discuss", label: "Bespreken" },
  { mode: "soft", label: "Zachte verschillen" },
  { mode: "conflict", label: "Conflicten" },
  { mode: "limit", label: "Grenzen" },
];

export default function CompareToolbar({
  categoryScores,
  filterMode,
  discussedCount,
  hideDiscussed,
  onFilterChange,
  onToggleHideDiscussed,
}: Props) {
  return (
    <>
      <nav className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-2" aria-label="Filter vergelijking">
        {FILTERS.map(({ mode, label }) => {
          const active = filterMode === mode;
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={active}
              onClick={() => onFilterChange(mode)}
              className="focus-ring min-h-11 flex-none whitespace-nowrap rounded-full px-3.5 text-[14px] font-medium"
              style={{
                color: active ? "var(--on-accent)" : "var(--text)",
                background: active ? "var(--action-primary)" : "var(--surface2)",
                border: active ? "1px solid transparent" : "1px solid var(--border)",
              }}
            >
              {label}
            </button>
          );
        })}
      </nav>

      <nav className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-2" aria-label="Spring naar categorie">
        {categoryScores.filter((item) => item.jointlyAssessed > 0).map((item) => (
          <button
            key={item.category}
            type="button"
            onClick={() => document.getElementById(`cat-${item.category}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="focus-ring min-h-11 flex-none whitespace-nowrap rounded-full px-3.5 text-[14px]"
            style={{ color: "var(--text)", background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            {kinkCategoryLabel(item.category)} · {item.jointlyAssessed}
          </button>
        ))}
      </nav>
      <DiscussedToggle count={discussedCount} hidden={hideDiscussed} onToggle={onToggleHideDiscussed} />
    </>
  );
}
