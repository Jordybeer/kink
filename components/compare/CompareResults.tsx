"use client";

import type { CompareFilterMode, CompareModel } from "@/lib/compare";
import type { Profile } from "@/types";

export default function CompareResults({
  profileA,
  profileB,
  samePairError,
  model,
  filterMode,
}: {
  profileA: Profile | undefined;
  profileB: Profile | undefined;
  samePairError: boolean;
  model: CompareModel;
  filterMode: CompareFilterMode;
  discussed: ReadonlySet<string>;
  hideDiscussed: boolean;
  onToggleDiscussed: (id: string) => void;
  onComment: (profileId: string, itemId: string, comment: string) => void;
}) {
  if (!profileA || !profileB || samePairError) {
    return <p className="text-center py-12 text-sm">Kies twee verschillende profielen.</p>;
  }

  return (
    <section id="compare-details" data-filter={filterMode}>
      <p className="text-sm" style={{ color: "var(--text2)" }}>
        {model.summary.jointlyAssessed} gezamenlijk vergelijkbare antwoordparen.
      </p>
    </section>
  );
}
