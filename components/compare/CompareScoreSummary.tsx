import Link from "next/link";
import { planCompareSentences } from "@/lib/compareCopy";
import type { CompareSummary } from "@/lib/compare";

const DIMENSIONS = [
  { key: "shared", label: "Gedeeld", colour: "var(--yes)" },
  { key: "complementary", label: "Aanvullend", colour: "var(--yes)" },
  { key: "discuss", label: "Bespreken", colour: "var(--willing)" },
  { key: "soft", label: "Zachte grens", colour: "var(--maybe)" },
  { key: "hard", label: "Hard", colour: "var(--hard-no-text)" },
] as const;

export default function CompareScoreSummary({ summary }: { summary: CompareSummary }) {
  const values = {
    shared: summary.shared,
    complementary: summary.complementary,
    discuss: summary.discuss,
    soft: summary.soft,
    hard: summary.conflict + summary.limit,
  };
  const sentences = planCompareSentences(summary.reasons, summary.jointlyAssessed);

  return (
    <section
      className="rounded-2xl p-4 sm:p-5 mb-4 mt-1"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      aria-labelledby="compare-overview-heading"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2
            id="compare-overview-heading"
            className="text-base"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontStyle: "italic",
              fontWeight: 400,
              color: "var(--text)",
            }}
          >
            Jullie vergelijking
          </h2>
          <p className="text-xs mt-1" style={{ color: "var(--text2)" }}>
            Alleen expliciet gedeelde, zichtbare antwoorden tellen mee.
          </p>
        </div>
        <div className="text-right flex-none">
          <div
            className="text-2xl font-semibold tabular-nums"
            style={{ color: "var(--text)" }}
            aria-label={`${summary.jointlyAssessed} gezamenlijk vergelijkbare antwoordparen`}
          >
            {summary.jointlyAssessed}
          </div>
          <div className="text-[11px]" style={{ color: "var(--text2)" }}>
            samen beoordeeld
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {DIMENSIONS.map((dimension) => (
          <div
            key={dimension.key}
            className="rounded-xl px-3 py-2.5"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <div className="text-lg font-semibold tabular-nums" style={{ color: dimension.colour }}>
              {values[dimension.key]}
            </div>
            <div className="text-[11px] leading-tight" style={{ color: "var(--text2)" }}>
              {dimension.label}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5" aria-label="Waarom deze vergelijking">
        {sentences.map((sentence) => (
          <p key={sentence} className="text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
            {sentence}
          </p>
        ))}
      </div>

      <div
        className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-2"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text2)" }}>
          Deze vergelijking beschrijft profieldata en is geen toestemming.
        </p>
        <Link
          href="#compare-details"
          className="focus-ring min-h-11 inline-flex items-center px-3 rounded-full text-xs font-medium"
          style={{ color: "var(--accent)", background: "var(--surface2)" }}
        >
          Bekijk alle details
        </Link>
      </div>
    </section>
  );
}
