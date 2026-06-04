"use client";
import { useState, Suspense, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { KINKS, CATEGORIES, getKinksByCategory } from "@/lib/kinks";
import type { KinkStatus, KinkEntry } from "@/types";
import { isKinkMatch, isHardLimit, isConflict } from "@/lib/matching";

const STATUS_LABEL: Record<NonNullable<KinkStatus>, string> = {
  yes:     "✓ Heel graag",
  willing: "↗ Ja",
  maybe:   "♡ Misschien",
  no:      "↘ Voor hen",
  hard_no: "✕✕ Harde grens",
};

const COLOUR_A = "var(--accent)";
const COLOUR_B = "var(--accent2)";

function StatusBadge({ status, colour, prefix }: { status: KinkStatus; colour: string; prefix?: string }) {
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
      {prefix}{STATUS_LABEL[status]}
    </span>
  );
}

function EntryBadge({ entry, colour }: { entry: KinkEntry; colour: string }) {
  if (entry.statusGive && entry.statusReceive) {
    return (
      <div className="flex flex-col gap-0.5">
        <StatusBadge status={entry.statusGive} colour={colour} prefix="↑ " />
        <StatusBadge status={entry.statusReceive} colour={colour} prefix="↓ " />
      </div>
    );
  }
  if (entry.statusGive) return <StatusBadge status={entry.statusGive} colour={colour} prefix="↑ " />;
  if (entry.statusReceive) return <StatusBadge status={entry.statusReceive} colour={colour} prefix="↓ " />;
  return <StatusBadge status={entry.status} colour={colour} />;
}

/** Abbreviate a category name to its first word, max 8 chars. */
function catAbbrev(cat: string): string {
  const first = cat.split(/\s+/)[0];
  return first.length > 8 ? first.slice(0, 8) : first;
}

function categoryPillStyle(rate: number | null): { background: string; borderColor: string } {
  if (rate === null) return { background: "var(--border)", borderColor: "var(--border)" };
  if (rate === 0)    return { background: "color-mix(in srgb, var(--hard-no) 20%, transparent)", borderColor: "color-mix(in srgb, var(--hard-no) 50%, transparent)" };
  if (rate < 0.4)   return { background: "color-mix(in srgb, var(--conflict) 20%, transparent)", borderColor: "color-mix(in srgb, var(--conflict) 50%, transparent)" };
  if (rate < 0.7)   return { background: "color-mix(in srgb, #3b82f6 20%, transparent)", borderColor: "color-mix(in srgb, #3b82f6 50%, transparent)" };
  return { background: "color-mix(in srgb, var(--yes) 20%, transparent)", borderColor: "color-mix(in srgb, var(--yes) 50%, transparent)" };
}

function ComparePage() {
  const searchParams = useSearchParams();
  const { profiles, setEntry } = useStore();
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
      const eA = profileA.entries[kink.id] ?? { status: null, comment: "" };
      const eB = profileB.entries[kink.id] ?? { status: null, comment: "" };
      const hasA = eA.status || eA.statusGive || eA.statusReceive;
      const hasB = eB.status || eB.statusGive || eB.statusReceive;
      if (!hasA && !hasB) continue;
      if (hasA && hasB) totalRated++;
      if (isHardLimit(eA, eB)) hardLimitCount++;
      else if (isKinkMatch(eA, eB)) matchCount++;
      else if (hasA && hasB) discussCount++;
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

  useEffect(() => {
    if (!_hasHydrated || profiles.length < 2) return;
    const profileA = profiles.find((p) => p.id === aId);
    const profileB = profiles.find((p) => p.id === bId);
    if (!profileA && !profileB) {
      const own = profiles.find((p) => !p.isImported) ?? profiles[0];
      const other = profiles.find((p) => p.id !== own.id && p.isImported) ?? profiles.find((p) => p.id !== own.id) ?? profiles[1];
      setAId(own.id);
      setBId(other.id);
    } else if (!profileA || !profileB) {
      const own = profiles.find((p) => !p.isImported) ?? profiles[0];
      const other = profiles.find((p) => p.id !== own.id && p.isImported) ?? profiles.find((p) => p.id !== own.id) ?? profiles[1];
      if (!profileA) setAId(own.id);
      if (!profileB) setBId(other.id);
    }
  }, [_hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!_hasHydrated) return (
    <main className="max-w-5xl mx-auto px-4 py-6 pb-10 w-full flex items-start justify-center pt-24">
      <span className="text-2xl font-bold" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>KinkSync</span>
    </main>
  );

  function getEntry(profile: typeof profileA, kinkId: string): KinkEntry {
    return profile?.entries[kinkId] ?? { status: null, comment: "" };
  }

  function passesFilter(eA: KinkEntry, eB: KinkEntry): boolean {
    const hasA = eA.status || eA.statusGive || eA.statusReceive;
    const hasB = eB.status || eB.statusGive || eB.statusReceive;
    if (!showEmpty && !hasA && !hasB) return false;
    if (filterMode === "all") return true;
    if (filterMode === "hardno") return isHardLimit(eA, eB);
    if (filterMode === "conflict") return isConflict(eA, eB);
    if (filterMode === "match") return isKinkMatch(eA, eB);
    return true;
  }

  // Category heatmap scores
  const categoryScores = (profileA && profileB)
    ? CATEGORIES.map((cat) => {
        const kinks = getKinksByCategory(cat);
        let catMatches = 0, catRated = 0;
        for (const k of kinks) {
          const eA = profileA.entries[k.id] ?? { status: null, comment: "" };
          const eB = profileB.entries[k.id] ?? { status: null, comment: "" };
          const hasA = eA.status || eA.statusGive || eA.statusReceive;
          const hasB = eB.status || eB.statusGive || eB.statusReceive;
          if (hasA || hasB) {
            catRated++;
            if (isKinkMatch(eA, eB)) catMatches++;
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

  const confettiEmoji = ["🔗", "⛓️", "👑", "🖤", "🌹", "🕯️", "💋", "🩷"];

  return (
    <>
    <main className="max-w-5xl mx-auto px-4 py-6 pb-10 w-full">
      {/* Header — back link + title only */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/" className="focus-ring text-sm transition-colors min-h-[44px] inline-flex items-center pr-2" style={{ color: "var(--text2)" }}>
          ← Terug
        </Link>
        <h1 className="text-xl font-bold flex-1">Vergelijk profielen</h1>
      </div>

      {/* Mobile-only sticky selector strip */}
      <div className="md:hidden sticky top-0 z-10 pb-3 mb-2" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)", paddingTop: "env(safe-area-inset-top)" }}>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: aId, setId: setAId, colour: COLOUR_A },
              { id: bId, setId: setBId, colour: COLOUR_B },
            ] as const
          ).map(({ id, setId, colour }) => (
            <div key={colour} className="flex flex-col gap-1.5">
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
                {profiles.map((p) => {
                  const active = id === p.id;
                  const init = p.name[0].toUpperCase();
                  return (
                    <button
                      key={p.id}
                      onClick={() => setId(p.id)}
                      aria-pressed={active}
                      className="focus-ring flex-none flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-colors"
                      style={active
                        ? { borderColor: colour, background: `color-mix(in srgb, ${colour} 12%, transparent)` }
                        : { borderColor: "var(--border)", background: "var(--surface)" }}
                    >
                      <div className="w-7 h-7 rounded-full flex-none overflow-hidden flex items-center justify-center text-xs font-bold text-black flex-shrink-0" style={{ background: active ? colour : "var(--surface2)" }}>
                        {p.avatarDataUrl
                          ? <img src={p.avatarDataUrl} alt="" className="w-full h-full object-cover" />
                          : <span style={{ color: active ? "#000" : "var(--text2)" }}>{init}</span>}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-semibold truncate leading-tight" style={{ color: active ? "var(--text)" : "var(--text2)" }}>{p.name}</p>
                        <p className="text-[10px] truncate" style={{ color: active ? colour : "var(--text2)", opacity: 0.8 }}>{p.role}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {profileA && profileB && (
          <div className="flex gap-2 mt-2">
            <Link href={`/scene?a=${aId}&b=${bId}`}
              className="focus-ring px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-90 border flex-1 text-center"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}>
              🎭 Plan een scène
            </Link>
            <Link href={`/contract?a=${aId}&b=${bId}`}
              className="focus-ring px-3 py-1.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-90 flex-1 text-center"
              style={{ background: "var(--accent)", color: "#000" }}>
              ✍ Contract
            </Link>
          </div>
        )}
      </div>

      {/* Mobile-only summary card */}
      {profileA && profileB && (
        <div className="md:hidden rounded-xl p-3 mb-3 flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}>
          <div className="flex-1 text-center">
            <div className="text-xl font-bold tabular-nums" style={{ color: "var(--yes)" }}>{matchCount}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--text2)" }}>matches</div>
          </div>
          <div className="w-px self-stretch" style={{ background: "var(--border)" }} />
          <div className="flex-1 text-center">
            <div className="text-xl font-bold tabular-nums" style={{ color: "var(--willing)" }}>{discussCount}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--text2)" }}>bespreken</div>
          </div>
          <div className="w-px self-stretch" style={{ background: "var(--border)" }} />
          <div className="flex-1 text-center">
            <div className="text-xl font-bold tabular-nums" style={{ color: "var(--hard-no)" }}>{hardLimitCount}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--text2)" }}>grenzen</div>
          </div>
          <div className="w-px self-stretch" style={{ background: "var(--border)" }} />
          <div className="flex-1 text-center">
            <div className="text-xl font-bold tabular-nums" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{score}%</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--text2)" }}>match</div>
          </div>
        </div>
      )}

      {/* Mobile-only filter strip */}
      <div className="md:hidden flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar whitespace-nowrap">
        {(["all", "match", "conflict", "hardno"] as const).map((f) => (
          <button key={f} onClick={() => setFilterMode(f)}
            className="focus-ring px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
            style={filterMode === f
              ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
              : { background: "transparent", color: "var(--text2)", borderColor: "var(--border)" }}>
            {f === "all" ? "Alles" : f === "match" ? "Match ✓" : f === "conflict" ? "Spanning ⚡" : "Grenzen ⛔"}
          </button>
        ))}
      </div>

      <div>



        {/* Kink list */}
        <div>
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
                    return passesFilter(getEntry(profileA, k.id), getEntry(profileB, k.id));
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
                          const matched = isKinkMatch(eA, eB);
                          const hardLimit = isHardLimit(eA, eB);
                          const conflict = !matched && !hardLimit && isConflict(eA, eB);
                          const isDiscussed = discussed.has(kink.id);
                          const matchDelay = matched ? `${Math.min(matchIdx++ * 60, 1500)}ms` : "0ms";
                          return (
                            <div
                              key={kink.id}
                              className={`rounded-xl px-3 py-2.5 transition-colors ${pulsed && matched ? "match-pulse" : ""}`}
                              style={{
                                background: "var(--surface)",
                                border: "1px solid var(--border)",
                                borderLeft: hardLimit ? "4px solid var(--hard-no)" : matched ? "4px solid var(--yes)" : conflict ? "4px solid var(--conflict)" : "4px solid transparent",
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
                                  {isDiscussed ? "✓ Besproken" : "Bespreken"}
                                </button>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <EntryBadge entry={eA} colour={COLOUR_A} />
                                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))", opacity: matched ? 1 : 0.18 }} />
                                <EntryBadge entry={eB} colour={COLOUR_B} />
                              </div>
                              {(() => {
                                const showReadOnlyA = profileA.isImported && !!eA.comment;
                                const showReadOnlyB = profileB.isImported && !!eB.comment;
                                return (
                                  <>
                                    {(showReadOnlyA || showReadOnlyB) && (
                                      <div className="mt-1 text-xs space-y-0.5" style={{ color: "var(--text2)" }}>
                                        {showReadOnlyA && <div><span className="font-medium" style={{ color: COLOUR_A }}>{profileA.name}:</span> {eA.comment}</div>}
                                        {showReadOnlyB && <div><span className="font-medium" style={{ color: COLOUR_B }}>{profileB.name}:</span> {eB.comment}</div>}
                                      </div>
                                    )}
                                    <div className="mt-2 space-y-1.5">
                                      {!profileA.isImported && (
                                        <textarea
                                          aria-label={`Notitie ${profileA.name}`}
                                          placeholder={`Notitie ${profileA.name}…`}
                                          value={eA.comment}
                                          onChange={(e) => setEntry(profileA.id, kink.id, { comment: e.target.value })}
                                          rows={1}
                                          maxLength={200}
                                          className="focus-ring w-full text-xs rounded-lg px-2.5 py-1.5 resize-none focus:outline-none"
                                          style={{ background: "var(--surface2)", border: `1px solid color-mix(in srgb, ${COLOUR_A} 30%, var(--border))`, color: "var(--text)" }}
                                        />
                                      )}
                                      {!profileB.isImported && (
                                        <textarea
                                          aria-label={`Notitie ${profileB.name}`}
                                          placeholder={`Notitie ${profileB.name}…`}
                                          value={eB.comment}
                                          onChange={(e) => setEntry(profileB.id, kink.id, { comment: e.target.value })}
                                          rows={1}
                                          maxLength={200}
                                          className="focus-ring w-full text-xs rounded-lg px-2.5 py-1.5 resize-none focus:outline-none"
                                          style={{ background: "var(--surface2)", border: `1px solid color-mix(in srgb, ${COLOUR_B} 30%, var(--border))`, color: "var(--text)" }}
                                        />
                                      )}
                                    </div>
                                  </>
                                );
                              })()}
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
                        const eA = item.aId ? (profileA.entries[item.aId] ?? { status: null, comment: "" }) : { status: null as KinkStatus, comment: "" };
                        const eB = item.bId ? (profileB.entries[item.bId] ?? { status: null, comment: "" }) : { status: null as KinkStatus, comment: "" };
                        const matched = isKinkMatch(eA, eB);
                        const hardLimit = isHardLimit(eA, eB);
                        const conflict = !matched && !hardLimit && isConflict(eA, eB);
                        const rowKey = item.name.trim().toLowerCase();
                        if (!passesFilter(eA, eB)) return null;
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
                              borderLeft: hardLimit ? "4px solid var(--hard-no)" : matched ? "4px solid var(--yes)" : conflict ? "4px solid var(--conflict)" : "4px solid transparent",
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
                              <EntryBadge entry={eA} colour={COLOUR_A} />
                              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))", opacity: matched ? 1 : 0.18 }} />
                              <EntryBadge entry={eB} colour={COLOUR_B} />
                            </div>
                            <div className="mt-2 space-y-1.5">
                              {!profileA.isImported && item.aId && (
                                <textarea
                                  aria-label={`Notitie ${profileA.name}`}
                                  placeholder={`Notitie ${profileA.name}…`}
                                  value={eA.comment}
                                  onChange={(e) => setEntry(profileA.id, item.aId!, { comment: e.target.value })}
                                  rows={1}
                                  maxLength={200}
                                  className="focus-ring w-full text-xs rounded-lg px-2.5 py-1.5 resize-none focus:outline-none"
                                  style={{ background: "var(--surface2)", border: `1px solid color-mix(in srgb, ${COLOUR_A} 30%, var(--border))`, color: "var(--text)" }}
                                />
                              )}
                              {!profileB.isImported && item.bId && (
                                <textarea
                                  aria-label={`Notitie ${profileB.name}`}
                                  placeholder={`Notitie ${profileB.name}…`}
                                  value={eB.comment}
                                  onChange={(e) => setEntry(profileB.id, item.bId!, { comment: e.target.value })}
                                  rows={1}
                                  maxLength={200}
                                  className="focus-ring w-full text-xs rounded-lg px-2.5 py-1.5 resize-none focus:outline-none"
                                  style={{ background: "var(--surface2)", border: `1px solid color-mix(in srgb, ${COLOUR_B} 30%, var(--border))`, color: "var(--text)" }}
                                />
                              )}
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
          <div className="pt-4 pb-2 flex justify-center">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="focus-ring text-xs px-4 py-2 rounded-full border transition-colors"
              style={{ color: "var(--text2)", borderColor: "var(--border)" }}
            >
              ↑ Terug naar boven
            </button>
          </div>
        </div>{/* end right panel */}

      </div>
    </main>
    </>
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
