import type { CompareSummary } from "@/lib/compare";

function compatibilityVerdict(score: number | null): string | null {
  if (score === null) return null;
  if (score >= 85) return "Sterke compatibiliteit";
  if (score >= 70) return "Goede basis";
  if (score >= 55) return "Gemengde compatibiliteit";
  if (score >= 40) return "Veel te bespreken";
  return "Grote verschillen";
}

function AlignmentBar({ match, discuss, soft, limit }: Omit<CompareSummary, "score">) {
  const total = match + discuss + soft + limit;
  if (total === 0) return null;

  const segments = [
    { key: "match", count: match, color: "var(--yes)" },
    { key: "discuss", count: discuss, color: "var(--conflict)" },
    { key: "soft", count: soft, color: "var(--maybe)" },
    { key: "limit", count: limit, color: "var(--hard-no)" },
  ];

  return (
    <div
      className="flex rounded-full overflow-hidden mb-4"
      style={{ height: 6, background: "var(--surface3)" }}
      role="img"
      aria-label={`Verdeling: ${match} match, ${discuss} te bespreken, ${soft} zacht, ${limit} grenzen`}
    >
      {segments.map((segment) => segment.count > 0 ? (
        <span
          key={segment.key}
          aria-hidden="true"
          style={{
            width: `${(segment.count / total) * 100}%`,
            background: segment.color,
            transition: "width 500ms ease-out",
          }}
        />
      ) : null)}
    </div>
  );
}

export default function CompareScoreSummary({
  score,
  match,
  discuss,
  soft,
  limit,
}: CompareSummary) {
  const total = match + discuss + soft + limit;
  const verdict = compatibilityVerdict(score);
  const verdictColor = score === null
    ? "var(--text2)"
    : score >= 75
      ? "var(--yes)"
      : score >= 55
        ? "var(--maybe)"
        : score < 40
          ? "var(--conflict)"
          : "var(--text)";

  return (
    <>
      <div className="text-center mb-4 mt-1">
        <div
          aria-label={score === null
            ? "Nog geen gezamenlijk beoordeelde kinks"
            : `${score} procent kinkcompatibiliteit`}
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "clamp(56px, 16vw, 80px)",
            lineHeight: 1,
            letterSpacing: "-0.025em",
            color: verdictColor,
            transition: "color 600ms ease-out",
          }}
        >
          {score === null ? (
            <span style={{ opacity: 0.55 }}>—</span>
          ) : (
            <>
              {score}
              <span
                style={{
                  fontSize: "0.42em",
                  verticalAlign: "0.62em",
                  marginLeft: "0.06em",
                  fontStyle: "normal",
                  fontWeight: 300,
                  color: "var(--text2)",
                }}
              >
                %
              </span>
            </>
          )}
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--text2)" }}>
          {score === null ? "Beoordeel allebei minstens één kink" : "Compatibiliteit"}
        </p>
        {verdict && (
          <p className="text-sm font-semibold mt-2" style={{ color: verdictColor }}>
            {verdict}
          </p>
        )}
        {total > 0 && (
          <div
            className="flex justify-center flex-wrap gap-x-3 gap-y-1 text-xs mt-2"
            style={{ color: "var(--text2)" }}
          >
            <span>
              <span className="font-semibold tabular-nums" style={{ color: "var(--yes)" }}>
                {match}
              </span>{" "}
              match
            </span>
            {discuss > 0 && (
              <span>
                <span className="font-semibold tabular-nums" style={{ color: "var(--conflict)" }}>
                  {discuss}
                </span>{" "}
                te bespreken
              </span>
            )}
            {soft > 0 && (
              <span>
                <span className="font-semibold tabular-nums" style={{ color: "var(--maybe)" }}>
                  {soft}
                </span>{" "}
                zacht
              </span>
            )}
            {limit > 0 && (
              <span>
                <span className="font-semibold tabular-nums" style={{ color: "var(--hard-no-text)" }}>
                  {limit}
                </span>{" "}
                {limit === 1 ? "grens" : "grenzen"}
              </span>
            )}
          </div>
        )}
      </div>
      <AlignmentBar match={match} discuss={discuss} soft={soft} limit={limit} />
    </>
  );
}
