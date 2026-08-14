import { ChatCircle, Heart, Info, ShieldWarning, WaveSine } from "@phosphor-icons/react";
import { planCompareStory } from "@/lib/compareCopy";
import type { CompareCategoryScore, CompareSummary } from "@/lib/compare";

interface Props extends CompareSummary {
  categoryScores: CompareCategoryScore[];
}

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
      key: "together",
      count: clearOverlapCount,
      label: "samen",
      helper: "Duidelijke overlap",
      color: "var(--yes)",
      icon: Heart,
    },
    {
      key: "discuss",
      count: discuss,
      label: "bespreken",
      helper: "Nog niet helemaal duidelijk",
      color: "var(--conflict)",
      icon: ChatCircle,
    },
    {
      key: "soft",
      count: soft,
      label: "zachte verschillen",
      helper: "De één is positiever",
      color: "var(--maybe)",
      icon: WaveSine,
    },
    {
      key: "boundaries",
      count: hardBoundaryCount,
      label: "grenzen",
      helper: hardBoundaryCount === 0
        ? "Geen harde grens in deze antwoorden"
        : conflict > 0
          ? `${conflict} ${conflict === 1 ? "botst" : "botsen"} met een positief antwoord`
          : hardBoundaryCount === 1
            ? "Eén harde grens"
            : `${hardBoundaryCount} harde grenzen`,
      color: hardBoundaryCount > 0 ? "var(--hard-no-text)" : "var(--text2)",
      icon: ShieldWarning,
    },
  ];

  return (
    <section className="mb-5 mt-1" aria-labelledby="compare-summary-heading">
      <div
        className="rounded-2xl border p-5"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <h2
          id="compare-summary-heading"
          className="text-[22px] font-semibold leading-tight"
          style={{ color: "var(--text)" }}
        >
          Wat valt op tussen jullie
        </h2>

        {story.overlapPercent !== null ? (
          <div className="mt-4">
            <div className="flex items-end gap-2.5">
              <div
                className="text-[52px] font-semibold leading-none tabular-nums"
                style={{ color: "var(--accent-text)" }}
              >
                {story.overlapPercent}%
              </div>
              <div className="pb-1 text-[15px] font-medium" style={{ color: "var(--accent-text)" }}>
                duidelijke overlap
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-[17px] leading-[1.55]" style={{ color: "var(--text)" }}>
              {story.lead}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-[17px] leading-[1.55]" style={{ color: "var(--text)" }}>
            {story.lead}
          </p>
        )}

        <div
          className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border"
          style={{ borderColor: "var(--border)", background: "var(--border)" }}
        >
          {stats.map(({ key, count, label, helper, color, icon: Icon }) => (
            <div key={key} className="min-w-0 px-3 py-4 text-center" style={{ background: "var(--surface2)" }}>
              <div className="text-[30px] font-semibold leading-none tabular-nums" style={{ color }}>
                {count}
              </div>
              <div className="mt-2 text-[15px] font-semibold leading-tight" style={{ color: "var(--text)" }}>
                {label}
              </div>
              <div className="mt-2 flex items-start justify-center gap-1.5 text-[14px] leading-[1.35]" style={{ color: "var(--text2)" }}>
                <Icon size={16} weight="regular" className="mt-0.5 shrink-0" aria-hidden="true" style={{ color }} />
                <span>{helper}</span>
              </div>
            </div>
          ))}
        </div>

        {story.insights.length > 0 && (
          <div
            className="mt-4 space-y-3 rounded-2xl border p-4 text-[16px] leading-[1.5]"
            style={{ borderColor: "var(--border)", background: "var(--surface2)", color: "var(--text)" }}
          >
            {story.insights.map((insight) => (
              <p key={insight}>{insight}</p>
            ))}
          </div>
        )}

        <div
          className="mt-4 space-y-2 border-t pt-4 text-[14px] leading-[1.45]"
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
