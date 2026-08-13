"use client";

import DiscussedToggle from "@/components/DiscussedToggle";
import type { CompareFilterMode, CompareSummary } from "@/lib/compare";

const FILTERS: CompareFilterMode[] = ["all", "shared", "complementary", "discuss", "soft", "hard"];

export default function CompareToolbar({
  filterMode,
  summary,
  discussedCount,
  hideDiscussed,
  onFilterChange,
  onToggleHideDiscussed,
}: {
  categoryScores: unknown[];
  filterMode: CompareFilterMode;
  summary: CompareSummary;
  discussedCount: number;
  hideDiscussed: boolean;
  onFilterChange: (filter: CompareFilterMode) => void;
  onToggleHideDiscussed: () => void;
}) {
  return (
    <>
      <div className="no-scrollbar flex items-stretch mb-4 border-b overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => onFilterChange(filter)}
            aria-pressed={filterMode === filter}
            className="focus-ring min-h-11 flex-none px-3 text-xs font-medium"
          >
            {filter}
          </button>
        ))}
      </div>
      <span className="sr-only">{summary.jointlyAssessed}</span>
      <DiscussedToggle count={discussedCount} hidden={hideDiscussed} onToggle={onToggleHideDiscussed} />
    </>
  );
}
