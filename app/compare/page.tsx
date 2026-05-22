"use client";
import { useState, Suspense, useEffect } from "react";
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
  if (isHardLimit(a, b)) return true;
  const ok = ["yes", "willing", "maybe"];
  return !(ok.includes(a) && ok.includes(b));
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

  const profileA = profiles.find((p) => p.id === aId);
  const profileB = profiles.find((p) => p.id === bId);

  // Trigger the match-pulse animation once on each new comparison pair
  useEffect(() => {
    if (!profileA || !profileB) return;
    setPulsed(false);
    const t = setTimeout(() => setPulsed(true), 60);
    return () => clearTimeout(t);
  }, [aId, bId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Compute summary counts
  let matchCount = 0, hardLimitCount = 0, discussCount = 0;
  if (profileA && profileB) {
    for (const kink of KINKS) {
      const a = profileA.entries[kink.id]?.status ?? null;
      const b = profileB.entries[kink.id]?.status ?? null;
      if (!a && !b) continue;
      if (isHardLimit(a, b)) hardLimitCount++;
      else if (isMatch(a, b)) matchCount++;
      else if (a && b) discussCount++;
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/" className="focus-ring text-sm transition-colors" style={{ color: "var(--text2)" }}>
          ← Terug
        </Link>
        <h1 className="text-xl font-bold flex-1">Vergelijk profielen</h1>
        {profileA && profileB && (
          <Link
            href={`/contract?a=${aId}&b=${bId}`}
            className="focus-ring px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            ✍ Teken het contract
          </Link>
        )}
      </div>

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
      </div>

      {!profileA || !profileB ? (
        <p className="text-center py-12 text-sm" style={{ color: "var(--text2)" }}>
          Kies twee spelers — dan kijken we wat jullie gemeen hebben.
        </p>
      ) : (
        <>
          {CATEGORIES.map((cat) => {
            const kinks = getKinksByCategory(cat).filter((k) => {
              const a = getEntry(profileA, k.id).status;
              const b = getEntry(profileB, k.id).status;
              return passesFilter(a, b);
            });
            if (!kinks.length) return null;
            return (
              <section key={cat} className="mb-6">
                <h2 className="text-xs font-semibold mb-2 px-1 uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                  {cat}
                </h2>
                <div className="flex flex-col gap-2">
                  {kinks.map((kink) => {
                    const eA = getEntry(profileA, kink.id);
                    const eB = getEntry(profileB, kink.id);
                    const matched = isMatch(eA.status, eB.status);
                    const hardLimit = isHardLimit(eA.status, eB.status);
                    return (
                      <div
                        key={kink.id}
                        className={`rounded-xl px-3 py-2.5 transition-colors ${pulsed && matched ? "match-pulse" : ""}`}
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderLeft: hardLimit ? "4px solid var(--hard-no)" : matched ? "4px solid var(--yes)" : "4px solid transparent",
                        }}
                      >
                        <div className="text-sm font-medium mb-2">
                          {kink.name}
                          {matched && <span className="sr-only"> — match</span>}
                          {hardLimit && <span className="sr-only"> — harde grens</span>}
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
          })}

          {/* Meer — custom kinks from both profiles, always visible */}
          {(() => {
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
                    const key = item.name.trim().toLowerCase();
                    if (!passesFilter(eA.status, eB.status)) return null;
                    return (
                      <div
                        key={key}
                        className={`rounded-xl px-3 py-2.5 ${pulsed && matched ? "match-pulse" : ""}`}
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderLeft: hardLimit ? "4px solid var(--hard-no)" : matched ? "4px solid var(--yes)" : "4px solid transparent",
                        }}
                      >
                        <div className="text-sm font-medium mb-2 flex items-center gap-1.5">
                          {item.name}
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--surface2)", color: "var(--text2)" }}>eigen</span>
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
