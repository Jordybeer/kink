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
  const hasJointAnswers = jointlyAssessed > 0;

  const countDetails = [
    clearOverlapCount > 0
      ? `Bij ${clearOverlapCount} ${clearOverlapCount === 1 ? "onderwerp" : "onderwerpen"} is er overlap.`
      : "",
    hardBoundaryCount > 0
      ? `Bij ${hardBoundaryCount} ${hardBoundaryCount === 1 ? "onderwerp" : "onderwerpen"} staat een harde grens.`
      : "",
  ].filter(Boolean).join(" ");

  return (
    <section className="mb-5 mt-1" aria-labelledby="compare-summary-heading">
      <h2
        id="compare-summary-heading"
        className="text-xl leading-tight"
        style={{ color: "var(--text)", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400 }}
      >
        Jullie antwoorden
      </h2>
      <p className="mt-2 max-w-3xl text-base leading-relaxed" style={{ color: "var(--text)" }}>
        {story.lead}
      </p>
      {!hasJointAnswers && (
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
          Vul allebei een antwoord in bij hetzelfde onderwerp en vergelijk opnieuw.
        </p>
      )}
      {hasJointAnswers && countDetails && (
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
          {countDetails}
        </p>
      )}
      {story.coverage && (
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
          {story.coverage}
        </p>
      )}
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
        Alleen zichtbare antwoorden tellen mee. Overlap is geen toestemming.
      </p>
    </section>
  );
}
