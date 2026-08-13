import { planCompareSentences } from "@/lib/compareCopy";
import type { CompareSummary } from "@/lib/compareV2";

const STAT_ITEMS = [
  { key: "shared", label: "Gedeeld", color: "var(--yes)" },
  { key: "complementary", label: "Complementair", color: "var(--yes)" },
  { key: "discuss", label: "Bespreken", color: "var(--conflict)" },
  { key: "soft", label: "Zacht", color: "var(--maybe)" },
  { key: "conflict", label: "Conflict", color: "var(--hard-no-text)" },
  { key: "limit", label: "Harde grens", color: "var(--hard-no-text)" },
] as const;

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
}: CompareSummary) {
  const copy = planCompareSentences(reasons, jointlyAssessed);

  return (
    <section className="mb-5 mt-1" aria-labelledby="compare-summary-heading">
      <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 id="compare-summary-heading" className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Wat jullie expliciet deelden
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--text2)" }}>
              {jointlyAssessed === 0
                ? "Nog geen gezamenlijk vergelijkbare antwoorden."
                : `${jointlyAssessed} gezamenlijk ${jointlyAssessed === 1 ? "beoordeeld punt" : "beoordeelde punten"}`}
            </p>
          </div>
          {unpairedVisible > 0 && (
            <span className="text-[11px] text-right" style={{ color: "var(--text2)" }}>
              +{unpairedVisible} nog niet door beiden beoordeeld
            </span>
          )}
        </div>

        {jointlyAssessed > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {STAT_ITEMS.map(({ key, label, color }) => {
              const count = { shared, complementary, discuss, soft, conflict, limit }[key];
              return (
                <div key={key} className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
                  <div className="text-lg font-semibold tabular-nums" style={{ color }}>{count}</div>
                  <div className="text-[11px]" style={{ color: "var(--text2)" }}>{label}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-1.5 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
          {copy.map((sentence) => <p key={sentence}>{sentence}</p>)}
        </div>

        <p className="text-[11px] mt-3 pt-3 border-t" style={{ color: "var(--text2)", borderColor: "var(--border)" }}>
          Dit beschrijft alleen zichtbare profieldata. Het is geen toestemming, veiligheidsclaim of oordeel over jullie relatie.
        </p>
      </div>
    </section>
  );
}
