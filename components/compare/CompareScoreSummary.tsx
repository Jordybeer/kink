import { ArrowsLeftRight, ChatCircle, Heart, Info, WaveSine } from "@phosphor-icons/react";
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

  const stats = [
    {
      key: "together",
      count: shared,
      label: "samen",
      helper: "Allebei positief",
      color: "var(--yes)",
      icon: Heart,
    },
    {
      key: "roles",
      count: complementary,
      label: "rollen",
      helper: "Geven en ontvangen sluiten aan",
      color: "var(--yes)",
      icon: ArrowsLeftRight,
    },
    {
      key: "discuss",
      count: discuss,
      label: "bespreken",
      helper: "Verschil of twijfel",
      color: "var(--conflict)",
      icon: ChatCircle,
    },
    {
      key: "soft",
      count: soft,
      label: "zachte verschillen",
      helper: "De één staat er positiever tegenover",
      color: "var(--maybe)",
      icon: WaveSine,
    },
  ].filter((item) => item.count > 0);
  const statColumns = stats.length > 3 ? 2 : Math.max(stats.length, 1);

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
          <div className="mt-4 grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4">
            <div className="pt-0.5 text-center">
              <div
                className="text-[48px] font-semibold leading-none tabular-nums"
                style={{ color: "var(--accent-text)" }}
              >
                {story.overlapPercent}%
              </div>
              <div className="mt-1 text-[15px] font-medium" style={{ color: "var(--accent-text)" }}>
                overlap
              </div>
            </div>
            <p className="text-[17px] leading-[1.55]" style={{ color: "var(--text)" }}>
              {story.lead}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-[17px] leading-[1.55]" style={{ color: "var(--text)" }}>
            {story.lead}
          </p>
        )}

        {stats.length > 0 && (
          <div
            className="mt-5 grid gap-px overflow-hidden rounded-2xl border"
            style={{
              gridTemplateColumns: `repeat(${statColumns}, minmax(0, 1fr))`,
              borderColor: "var(--border)",
              background: "var(--border)",
            }}
          >
            {stats.map(({ key, count, label, helper, color, icon: Icon }) => (
              <div key={key} className="min-w-0 px-2 py-4 text-center" style={{ background: "var(--surface2)" }}>
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
        )}

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

        <div className="mt-4 flex items-start gap-2.5 text-[14px] leading-[1.45]" style={{ color: "var(--text2)" }}>
          <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>{story.coverage}</p>
        </div>

        <p
          className="mt-4 border-t pt-4 text-[14px] leading-[1.45]"
          style={{ color: "var(--text2)", borderColor: "var(--border)" }}
        >
          Dit vergelijkt alleen wat jullie zelf zichtbaar hebben gemaakt. Een match in jullie antwoorden betekent natuurlijk niet automatisch toestemming.
        </p>
      </div>
    </section>
  );
}
