import { ChatCircle, Heart, Info, ShieldWarning, WaveSine } from "@phosphor-icons/react";
import { planCompareStory, type CompareInsightKind } from "@/lib/compareCopy";
import type { CompareCategoryScore, CompareSummary } from "@/lib/compare";

interface Props extends CompareSummary {
  categoryScores: CompareCategoryScore[];
}

const INSIGHT_STYLE: Record<CompareInsightKind, { color: string; icon: typeof ShieldWarning }> = {
  boundaries: { color: "var(--hard-no-text)", icon: ShieldWarning },
  discuss: { color: "var(--conflict)", icon: ChatCircle },
  differences: { color: "var(--maybe)", icon: WaveSine },
  category: { color: "var(--accent-text)", icon: Info },
};

export default function CompareScoreSummary({
  shared,
  complementary,
  discuss,
  soft,
  conflict,
  limit,
  jointlyAssessed,
  unpairedVisible,
  reasons,
  match,
  categoryScores,
}: Props) {
  const summary: CompareSummary = {
    shared,
    complementary,
    discuss,
    soft,
    conflict,
    limit,
    jointlyAssessed,
    unpairedVisible,
    reasons,
    match,
  };
  const story = planCompareStory(summary, categoryScores);
  const hardBoundaryCount = conflict + limit;
  const clearOverlapCount = shared + complementary;

  const stats = [
    {
      key: "overlap",
      count: clearOverlapCount,
      label: "Overlap",
      color: "var(--yes)",
      icon: Heart,
    },
    {
      key: "discuss",
      count: discuss,
      label: "Bespreekbaar",
      color: "var(--conflict)",
      icon: ChatCircle,
    },
    {
      key: "soft",
      count: soft,
      label: "Verschillen",
      color: "var(--maybe)",
      icon: WaveSine,
    },
    {
      key: "boundaries",
      count: hardBoundaryCount,
      label: "Grenzen",
      color: hardBoundaryCount > 0 ? "var(--hard-no-text)" : "var(--text2)",
      icon: ShieldWarning,
    },
  ];

  return (
    <section className="mb-5 mt-1" aria-labelledby="compare-summary-heading">
      <div
        className="rounded-2xl border p-4 sm:p-5"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div
          className="rounded-2xl px-4 py-4 sm:px-5"
          style={{
            background: "color-mix(in srgb, var(--accent) 7%, var(--surface2))",
            border: "1px solid color-mix(in srgb, var(--accent) 20%, var(--border))",
          }}
        >
          <h2
            id="compare-summary-heading"
            className="text-xl font-semibold leading-tight"
            style={{ color: "var(--text)" }}
          >
            Wat valt op tussen jullie
          </h2>
          <p className="mt-2.5 max-w-3xl text-base leading-relaxed" style={{ color: "var(--text)" }}>
            {story.lead}
          </p>
        </div>

        <div
          className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border"
          style={{ borderColor: "var(--border)", background: "var(--border)" }}
          aria-label="Vergelijkingssamenvatting"
        >
          {stats.map(({ key, count, label, color, icon: Icon }) => (
            <div key={key} className="min-w-0 px-3 py-4 text-center sm:px-4 sm:py-5" style={{ background: "var(--surface2)" }}>
              <div className="flex items-center justify-center gap-1.5" style={{ color }}>
                <Icon size={18} weight="duotone" className="shrink-0" aria-hidden="true" />
                <span className="text-3xl font-semibold leading-none tabular-nums">{count}</span>
              </div>
              <div className="mt-2 text-sm font-semibold leading-tight" style={{ color: "var(--text)" }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {story.insights.length > 0 && (
          <div
            className="mt-4 overflow-hidden rounded-2xl border"
            style={{ borderColor: "var(--border)", background: "var(--surface2)" }}
            aria-label="Inzichten"
          >
            <div className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text2)" }}>
              Inzichten
            </div>
            {story.insights.map((insight, index) => {
              const meta = INSIGHT_STYLE[insight.kind];
              const Icon = meta.icon;
              return (
                <div
                  key={`${insight.kind}-${insight.title}`}
                  className="flex gap-3 px-4 py-3.5"
                  style={index > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
                >
                  <span
                    className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-xl"
                    style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 10%, transparent)` }}
                  >
                    <Icon size={17} weight="duotone" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text)" }}>
                      {insight.title}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                      {insight.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div
          className="mt-4 space-y-2 border-t pt-4 text-sm leading-relaxed"
          style={{ color: "var(--text2)", borderColor: "var(--border)" }}
        >
          <div className="flex items-start gap-2.5">
            <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>{story.coverage}</p>
          </div>
          <div className="flex items-start gap-2.5">
            <ShieldWarning size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>Alleen zichtbare antwoorden tellen mee. Overlap is geen toestemming.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
