"use client";
import { useState, Suspense, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { KINKS, CATEGORIES, getKinksByCategory } from "@/lib/kinks";
import type { KinkStatus, KinkEntry } from "@/types";

const STATUS_LABEL: Record<NonNullable<KinkStatus>, string> = {
  yes:     "✓ Heel graag",
  willing: "↗ Interesse",
  maybe:   "♡ Voor hen",
  no:      "✕ Liever niet",
  hard_no: "✕✕ Harde grens",
};

const COLOUR_A = "var(--accent)";
const COLOUR_B = "var(--accent2)";

function StatusBadge({ status, colour }: { status: KinkStatus; colour: string }) {
  if (!status) {
    return <span className="text-xs" style={{ color: "var(--text2)" }}>—</span>;
  }
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded border whitespace-nowrap"
      style={{
        color: colour,
        borderColor: `color-mix(in srgb, ${colour} 35%, transparent)`,
        background: `color-mix(in srgb, ${colour} 15%, transparent)`,
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function isMatch(a: KinkStatus, b: KinkStatus) {
  return !!a && !!b && (a === "yes" || a === "willing") && (b === "yes" || b === "willing");
}
function isHardLimit(a: KinkStatus, b: KinkStatus) {
  return a === "hard_no" || b === "hard_no";
}
function isConflict(a: KinkStatus, b: KinkStatus) {
  if (!a || !b) return false;
  if (isHardLimit(a, b)) return false;
  const ok = ["yes", "willing", "maybe"];
  return !(ok.includes(a) && ok.includes(b));
}

/** Abbreviate a category name to its first word, max 8 chars. */
function catAbbrev(cat: string): string {
  const first = cat.split(/\s+/)[0];
  return first.length > 8 ? first.slice(0, 8) : first;
}

function categoryPillStyle(rate: number | null): { background: string; borderColor: string } {
  if (rate === null) return { background: "var(--border)", borderColor: "var(--border)" };
  if (rate === 0)    return { background: "color-mix(in srgb, var(--hard-no) 20%, transparent)", borderColor: "color-mix(in srgb, var(--hard-no) 50%, transparent)" };
  if (rate < 0.4)   return { background: "color-mix(in srgb, #f59e0b 20%, transparent)", borderColor: "color-mix(in srgb, #f59e0b 50%, transparent)" };
  if (rate < 0.7)   return { background: "color-mix(in srgb, #3b82f6 20%, transparent)", borderColor: "color-mix(in srgb, #3b82f6 50%, transparent)" };
  return { background: "color-mix(in srgb, var(--yes) 20%, transparent)", borderColor: "color-mix(in srgb, var(--yes) 50%, transparent)" };
}

function ComparePage() {
  const searchParams = useSearchParams();
  const { profiles } = useStore();
  const _hasHydrated = useHasHydrated();

  const [aId, setAId] = useState(searchParams.get("a") ?? "");
  const [bId, setBId] = useState(searchParams.get("b") ?? "");
  const [filterMode, setFilterMode] = useState<"all" | "match" | "conflict" | "hardno">("all");
  const [showEmpty, setShowEmpty] = useState(false);
  const [pulsed, setPulsed] = useState(false);

  // Feature 1: discussion tracker — session-only, not persisted
  const [discussed, setDiscussed] = useState<Set<string>>(new Set());
  const [hideDiscussed, setHideDiscussed] = useState(false);

  // Feature 2: confetti trigger
  const [showConfetti, setShowConfetti] = useState(false);

  const profileA = profiles.find((p) => p.id === aId);
  const profileB = profiles.find((p) => p.id === bId);

  useEffect(() => {
    if (!profileA || !profileB) return;
    setPulsed(false);
    const t = setTimeout(() => setPulsed(true), 60);
    return () => clearTimeout(t);
  }, [aId, bId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDiscussed = useCallback((id: string) => {
    setDiscussed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Compute summary counts — must be above all hooks (Rules of Hooks)
  let matchCount = 0, hardLimitCount = 0, discussCount = 0, totalRated = 0;
  if (profileA && profileB) {
    for (const kink of KINKS) {
      const a = profileA.entries[kink.id]?.status ?? null;
      const b = profileB.entries[kink.id]?.status ?? null;
      if (!a && !b) continue;
      if (a && b) totalRated++;
      if (isHardLimit(a, b)) hardLimitCount++;
      else if (isMatch(a, b)) matchCount++;
      else if (a && b) discussCount++;
    }
  }

  const score = Math.round((matchCount / Math.max(totalRated, 1)) * 100);

  // Fire confetti once when score >= 70 — must be above early return (Rules of Hooks)
  useEffect(() => {
    if (profileA && profileB && score >= 70) {
      setShowConfetti(false);
      const t = setTimeout(() => setShowConfetti(true), 200);
      return () => clearTimeout(t);
    } else {
      setShowConfetti(false);
    }
  }, [aId, bId, score]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!_hasHydrated) return null;

  function getEntry(profile: typeof profileA, kinkId: string): KinkEntry {
    return profile?.entries[kinkId] ?? { status: null, score: null, comment: "" };
  }

  function passesFilter(a: KinkStatus, b: KinkStatus): boolean {
    if (!showEmpty && !a && !b) return false;
    if (filterMode === "all") return true;
    if (filterMode === "hardno") return isHardLimit(a, b);
    if (filterMode === "conflict") return isConflict(a, b);
    if (filterMode === "match") return isMatch(a, b);
    return true;
  }

  // Category heatmap scores
  const categoryScores = (profileA && profileB)
    ? CATEGORIES.map((cat) => {
        const kinks = getKinksByCategory(cat);
        let catMatches = 0, catRated = 0;
        for (const k of kinks) {
          const a = profileA.entries[k.id]?.status ?? null;
          const b = profileB.entries[k.id]?.status ?? null;
          if (a || b) {
            catRated++;
            if (isMatch(a, b)) catMatches++;
          }
        }
        const rate: number | null = catRated > 0 ? catMatches / catRated : null;
        return { cat, rate };
      })
    : [];

  function scrollToCategory(cat: string) {
    const el = document.getElementById(`cat-${cat}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const confettiColors = [
    "var(--accent)",
    "var(--accent2)",
    "var(--yes)",
    "#f59e0b",
    "#3b82f6",
    "var(--maybe)",
    "var(--accent)",
    "var(--yes)",
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 w-full">
      {/* Header — full width, above the two-column split */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/" className="focus-ring text-sm transition-colors" style={{ color: "var(--text2)" }}>
          ← Terug
        </Link>
        <h1 className="text-xl font-bold flex-1">Vergelijk profielen</h1>
        {profileA && profileB && (
          <>
            <Link
              href={`/scene?a=${aId}&b=${bId}`}
              className="focus-ring px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 border"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              🎭 Plan een scène
            </Link>
            <Link
              href={`/contract?a=${aId}&b=${bId}`}
              className="focus-ring px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              ✍ Teken het contract
            </Link>
          </>
        )}
      </div>

      <div className="md:flex md:gap-6 md:items-start">

        {/* Left panel — sticky sidebar on md+ */}
        <div className="md:w-72 md:flex-none md:sticky md:top-6 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto">

          {/* Profile selectors */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {(
              [
                { id: aId, setId: setAId, label: "Profiel A", colour: COLOUR_A },
                { id: bId, setId: setBId, label: "Profiel B", colour: COLOUR_B },
              ] as const
            ).map(({ id, setId, label, colour }) => (
              <div key={label}>
                <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text2)" }}>
                  {label}
                </label>
                <select
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="focus-ring w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: "var(--surface)", border: `1px solid ${colour}`, color: "var(--text)" }}
                >
                  <option value="">— selecteer —</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Profile identity chips */}
          {profileA && profileB && (
            <div className="flex gap-3 flex-wrap mb-5">
              {[
                { p: profileA, colour: COLOUR_A },
                { p: profileB, colour: COLOUR_B },
              ].map(({ p, colour }) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                  style={{
                    border: `1px solid ${colour}`,
                    background: `color-mix(in srgb, ${colour} 8%, transparent)`,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black flex-none"
                    style={{ background: colour }}
                  >
                    {p.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: colour }}>{p.name}</div>
                    <div className="text-xs" style={{ color: "var(--text2)" }}>
                      {Object.values(p.entries).filter((e) => e.status).length} beoordeeld
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary card */}
          {profileA && profileB && (
            <div
              className="rounded-xl p-4 mb-5"
              style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
            >
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 text-center min-w-[72px]">
                  <div className="text-2xl font-bold tabular-nums" style={{ color: "var(--yes)" }}>
                    {matchCount}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>gedeelde interesses</div>
                </div>
                <div className="w-px self-stretch" style={{ background: "var(--border)" }} />
                <div className="flex-1 text-center min-w-[72px]">
                  <div className="text-2xl font-bold tabular-nums" style={{ color: "var(--maybe)" }}>
                    {discussCount}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>te bespreken</div>
                </div>
                <div className="w-px self-stretch" style={{ background: "var(--border)" }} />
                <div className="flex-1 text-center min-w-[72px]">
                  <div className="text-2xl font-bold tabular-nums" style={{ color: "var(--hard-no)" }}>
                    {hardLimitCount}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>harde grenzen</div>
                </div>
              </div>
            </div>
          )}

          {/* Compatibility score card */}
          {profileA && profileB && (
            <div
              className="rounded-xl p-4 mb-5 relative overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
            >
              {/* CSS confetti dots */}
              {showConfetti && (
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  {confettiColors.map((color, i) => (
                    <span
                      key={i}
                      className="absolute w-1 h-1 rounded-full"
                      style={{
                        background: color,
                        left: `${10 + i * 11}%`,
                        top: "60%",
                        animation: `confetti-pop 0.6s ease-out ${i * 0.07}s both`,
                      }}
                    />
                  ))}
                </div>
              )}
              <style>{`
                @keyframes confetti-pop {
                  0%   { transform: translateY(0) scale(0); opacity: 1; }
                  60%  { transform: translateY(-40px) scale(1); opacity: 1; }
                  100% { transform: translateY(-50px) scale(0.5); opacity: 0; }
                }
              `}</style>

              <div className="flex items-center gap-6 flex-wrap">
                <div className="text-center">
                  <div
                    className="text-4xl font-bold tabular-nums"
                    style={{
                      background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {score}%
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>Compatibiliteit</div>
                </div>
                <div className="flex-1">
                  <div className="text-xs mb-1" style={{ color: "var(--text2)" }}>
                    {matchCount} van {totalRated} beoordeeld samen
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "var(--border)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${score}%`,
                        background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                      }}
                    />
                  </div>
                </div>
              </div>

              {score >= 70 && (
                <div className="mt-3 text-xs font-medium" style={{ color: "var(--accent)" }}>
                  Jullie passen goed samen 🖤
                </div>
              )}

              {/* Category heatmap */}
              {categoryScores.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: "var(--text2)" }}>
                    Per categorie
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {categoryScores.map(({ cat, rate }) => {
                      const pillStyle = categoryPillStyle(rate);
                      return (
                        <button
                          key={cat}
                          onClick={() => scrollToCategory(cat)}
                          aria-label={`Scroll naar ${cat}`}
                          className="text-[10px] px-2 py-1 rounded-full font-medium cursor-pointer border transition-opacity hover:opacity-80 focus-ring"
                          style={{
                            background: pillStyle.background,
                            borderColor: pillStyle.borderColor,
                            color: "var(--text)",
                          }}
                        >
                          {catAbbrev(cat)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {(["all", "match", "conflict", "hardno"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterMode(f)}
                className="focus-ring px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                style={
                  filterMode === f
                    ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                    : { background: "transparent", color: "var(--text2)", borderColor: "var(--border)" }
                }
              >
                {f === "all" ? "Alles" : f === "match" ? "Match ✓" : f === "conflict" ? "Spanning ⚡" : "Grenzen ⛔"}
              </button>
            ))}
            <label
              className="flex items-center gap-1.5 text-xs ml-2 cursor-pointer"
              style={{ color: "var(--text2)" }}
            >
              <input
                type="checkbox"
                checked={showEmpty}
                onChange={(e) => setShowEmpty(e.target.checked)}
                className="rounded"
              />
              Toon onbeoordeeld
            </label>

            {/* Discussion tracker controls */}
            {discussed.size > 0 && (
              <span className="text-xs ml-1" style={{ color: "var(--text2)" }}>
                💬 {discussed.size} besproken
              </span>
            )}
            {discussed.size > 0 && (
              <label
                className="flex items-center gap-1.5 text-xs cursor-pointer"
                style={{ color: "var(--text2)" }}
              >
                <input
                  type="checkbox"
                  checked={hideDiscussed}
                  onChange={(e) => setHideDiscussed(e.target.checked)}
                  className="rounded"
                />
                Verberg besproken
              </label>
            )}
          </div>

        </div>{/* end left panel */}

        {/* Right panel — scrollable kink list */}
        <div className="md:flex-1 mt-5 md:mt-0">
          {!profileA || !profileB ? (
            <p className="text-center py-12 text-sm" style={{ color: "var(--text2)" }}>
              Kies twee spelers — dan kijken we wat jullie gemeen hebben.
            </p>
          ) : (
            <>
              {(() => {
                let matchIdx = 0;
                return CATEGORIES.map((cat) => {
                  const kinks = getKinksByCategory(cat).filter((k) => {
                    if (hideDiscussed && discussed.has(k.id)) return false;
                    const a = getEntry(profileA, k.id).status;
                    const b = getEntry(profileB, k.id).status;
                    return passesFilter(a, b);
                  });
                  if (!kinks.length) return null;
                  return (
                    <section key={cat} id={`cat-${cat}`} className="mb-6">
                      <h2 className="text-xs font-semibold mb-2 px-1 uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                        {cat}
                      </h2>
                      <div className="flex flex-col gap-2">
                        {kinks.map((kink) => {
                          const eA = getEntry(profileA, kink.id);
                          const eB = getEntry(profileB, kink.id);
                          const matched = isMatch(eA.status, eB.status);
                          const hardLimit = isHardLimit(eA.status, eB.status);
                          const isDiscussed = discussed.has(kink.id);
                          const matchDelay = matched ? `${Math.min(matchIdx++ * 60, 1500)}ms` : "0ms";
                          return (
                            <div
                              key={kink.id}
                              className={`rounded-xl px-3 py-2.5 transition-colors ${pulsed && matched ? "match-pulse" : ""}`}
                              style={{
                                background: "var(--surface)",
                                border: "1px solid var(--border)",
                                borderLeft: hardLimit ? "4px solid var(--hard-no)" : matched ? "4px solid var(--yes)" : "4px solid transparent",
                                animationDelay: pulsed && matched ? matchDelay : "0ms",
                              }}
                            >
                              {/* Name row with Besproken toggle */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium flex-1">
                                  {kink.name}
                                  {matched && <span className="sr-only"> — match</span>}
                                  {hardLimit && <span className="sr-only"> — harde grens</span>}
                                </span>
                                <button
                                  onClick={() => toggleDiscussed(kink.id)}
                                  aria-label={isDiscussed ? `${kink.name} als niet besproken markeren` : `${kink.name} als besproken markeren`}
                                  className="text-[10px] px-2 py-0.5 rounded border transition-colors whitespace-nowrap flex-none"
                                  style={
                                    isDiscussed
                                      ? {
                                          background: "color-mix(in srgb, var(--yes) 15%, transparent)",
                                          borderColor: "var(--yes)",
                                          color: "var(--yes)",
                                        }
                                      : {
                                          background: "transparent",
                                          borderColor: "var(--border)",
                                          color: "var(--text2)",
                                        }
                                  }
                                >
                                  {isDiscussed ? "✓ Besproken" : "Besproken"}
                                </button>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <StatusBadge status={eA.status} colour={COLOUR_A} />
                                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))", opacity: matched ? 1 : 0.18 }} />
                                <StatusBadge status={eB.status} colour={COLOUR_B} />
                              </div>
                              {(eA.score || eB.score) && (
                                <div className="flex justify-between text-xs mb-1">
                                  <span style={{ color: COLOUR_A }}>{eA.score ? "★".repeat(eA.score) : ""}</span>
                                  <span style={{ color: COLOUR_B }}>{eB.score ? "★".repeat(eB.score) : ""}</span>
                                </div>
                              )}
                              {(eA.comment || eB.comment) && (
                                <div className="mt-1 text-xs space-y-0.5" style={{ color: "var(--text2)" }}>
                                  {eA.comment && <div><span className="font-medium" style={{ color: COLOUR_A }}>{profileA.name}:</span> {eA.comment}</div>}
                                  {eB.comment && <div><span className="font-medium" style={{ color: COLOUR_B }}>{profileB.name}:</span> {eB.comment}</div>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                });
              })()}

              {/* Meer — custom kinks from both profiles */}
              {(() => {
                let matchIdx = 0;
                const allCustom = [
                  ...(profileA.customKinks ?? []).map((k) => ({ ...k, side: "a" as const })),
                  ...(profileB.customKinks ?? []).map((k) => ({ ...k, side: "b" as const })),
                ];
                const merged = new Map<string, { name: string; aId?: string; bId?: string }>();
                for (const ck of allCustom) {
                  const key = ck.name.trim().toLowerCase();
                  const existing = merged.get(key) ?? { name: ck.name };
                  merged.set(key, ck.side === "a" ? { ...existing, aId: ck.id } : { ...existing, bId: ck.id });
                }
                if (!merged.size) return null;
                return (
                  <section className="mb-6">
                    <h2 className="text-xs font-semibold mb-2 px-1 uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                      Meer
                    </h2>
                    <div className="flex flex-col gap-2">
                      {Array.from(merged.values()).map((item) => {
                        const eA = item.aId ? (profileA.entries[item.aId] ?? { status: null, score: null, comment: "" }) : { status: null as KinkStatus, score: null, comment: "" };
                        const eB = item.bId ? (profileB.entries[item.bId] ?? { status: null, score: null, comment: "" }) : { status: null as KinkStatus, score: null, comment: "" };
                        const matched = isMatch(eA.status, eB.status);
                        const hardLimit = isHardLimit(eA.status, eB.status);
                        const rowKey = item.name.trim().toLowerCase();
                        if (!passesFilter(eA.status, eB.status)) return null;
                        if (hideDiscussed && discussed.has(rowKey)) return null;
                        const isDiscussed = discussed.has(rowKey);
                        const matchDelay = matched ? `${Math.min(matchIdx++ * 60, 1500)}ms` : "0ms";
                        return (
                          <div
                            key={rowKey}
                            className={`rounded-xl px-3 py-2.5 ${pulsed && matched ? "match-pulse" : ""}`}
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              borderLeft: hardLimit ? "4px solid var(--hard-no)" : matched ? "4px solid var(--yes)" : "4px solid transparent",
                              animationDelay: pulsed && matched ? matchDelay : "0ms",
                            }}
                          >
                            {/* Name row with Besproken toggle */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium flex-1 flex items-center gap-1.5">
                                {item.name}
                                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--surface2)", color: "var(--text2)" }}>eigen</span>
                              </span>
                              <button
                                onClick={() => toggleDiscussed(rowKey)}
                                aria-label={isDiscussed ? `${item.name} als niet besproken markeren` : `${item.name} als besproken markeren`}
                                className="text-[10px] px-2 py-0.5 rounded border transition-colors whitespace-nowrap flex-none"
                                style={
                                  isDiscussed
                                    ? {
                                        background: "color-mix(in srgb, var(--yes) 15%, transparent)",
                                        borderColor: "var(--yes)",
                                        color: "var(--yes)",
                                      }
                                    : {
                                        background: "transparent",
                                        borderColor: "var(--border)",
                                        color: "var(--text2)",
                                      }
                                }
                              >
                                {isDiscussed ? "✓ Besproken" : "Besproken"}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={eA.status} colour={COLOUR_A} />
                              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))", opacity: matched ? 1 : 0.18 }} />
                              <StatusBadge status={eB.status} colour={COLOUR_B} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })()}
            </>
          )}
        </div>{/* end right panel */}

      </div>
    </main>
  );
}

export default function CompareSuspense() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-sm" style={{ color: "var(--text2)" }}>
          Laden…
        </div>
      }
    >
      <ComparePage />
    </Suspense>
  );
}
