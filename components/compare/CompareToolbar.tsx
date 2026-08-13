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

export default function CompareToolbar({ categoryScores, discussedCount, hideDiscussed, onToggleHideDiscussed }: Props) {
  return (
    <>
      <nav className="no-scrollbar flex gap-2 overflow-x-auto pb-2 mb-3" aria-label="Spring naar categorie">
        {categoryScores.filter((item) => item.jointlyAssessed > 0).map((item) => (
          <button
            key={item.category}
            type="button"
            onClick={() => document.getElementById(`cat-${item.category}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="focus-ring flex-none min-h-11 rounded-full px-3 text-xs whitespace-nowrap"
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
