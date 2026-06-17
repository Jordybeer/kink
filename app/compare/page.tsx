"use client";
import { useState, Suspense, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftRight, Clapperboard, FileText, ChevronDown, Lock } from "lucide-react";
import { useStore, useHasHydrated } from "@/lib/store";
import { KINKS, CATEGORIES, getKinksByCategory } from "@/lib/kinks";
import type { KinkStatus, KinkEntry, Profile } from "@/types";
import { isKinkMatch, isHardLimit, isConflict, profileMatchScore } from "@/lib/matching";
import type { MatchKind } from "@/lib/matching";
import PageShell from "@/components/PageShell";
import Sheet, { SheetContent } from "@/components/Sheet";

const STATUS_LABEL: Record<NonNullable<KinkStatus>, string> = {
  yes:     "Heel graag",
  willing: "Ja",
  maybe:   "Misschien",
  no:      "Voor hen",
  hard_no: "Harde grens",
};

const COLOUR_A = "var(--accent)";
const COLOUR_B = "var(--accent2)";

function StatusBadge({ status, colour }: { status: KinkStatus; colour: string }) {
  if (!status) return <span className="text-xs" style={{ color: "var(--text2)" }}>—</span>;
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

function EntryBadge({ entry, colour }: { entry: KinkEntry; colour: string }) {
  if (entry.statusGive && entry.statusReceive) {
    return (
      <div
        className="flex flex-col gap-0.5"
        aria-label={`Geven: ${STATUS_LABEL[entry.statusGive]}, Ontvangen: ${STATUS_LABEL[entry.statusReceive]}`}
      >
        <StatusBadge status={entry.statusGive} colour={colour} />
        <StatusBadge status={entry.statusReceive} colour={colour} />
      </div>
    );
  }
  if (entry.statusGive) return <StatusBadge status={entry.statusGive} colour={colour} />;
  if (entry.statusReceive) return <StatusBadge status={entry.statusReceive} colour={colour} />;
  return <StatusBadge status={entry.status} colour={colour} />;
}

function ScoreMasthead({ match, discuss, limit }: { match: number; discuss: number; limit: number }) {
  const total = match + discuss + limit;
  const score = total > 0 ? Math.round((match / total) * 100) : null;
  const verdictColor =
    score === null ? "var(--text2)" : score >= 70 ? "var(--yes)" : "var(--text)";

  return (
    <div className="text-center mb-4 mt-1">
      <div
        aria-label={
          score === null
            ? "Nog niets vergeleken"
            : `${score} procent overlap`
        }
        style={{
          fontFamily: 'var(--font-display, Georgia, "Times New Roman", serif)',
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
      <p
        className="text-[10px] uppercase tracking-[0.22em] mt-1"
        style={{ color: "var(--text2)" }}
      >
        {score === null ? "nog niets gewaardeerd" : "overlap"}
      </p>
      {total > 0 && (
        <div
          className="flex justify-center flex-wrap gap-x-3 gap-y-1 text-xs mt-2"
          style={{ color: "var(--text2)" }}
        >
          <span>
            <span className="font-semibold tabular-nums" style={{ color: "var(--yes)" }}>{match}</span>{" "}
            match
          </span>
          {discuss > 0 && (
            <span>
              <span className="font-semibold tabular-nums" style={{ color: "var(--conflict)" }}>{discuss}</span>{" "}
              te bespreken
            </span>
          )}
          {limit > 0 && (
            <span>
              <span className="font-semibold tabular-nums" style={{ color: "var(--hard-no)" }}>{limit}</span>{" "}
              {limit === 1 ? "grens" : "grenzen"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AlignmentBar({ match, discuss, limit }: { match: number; discuss: number; limit: number }) {
  const total = match + discuss + limit;
  if (total === 0) return null;
  const mPct = (match / total) * 100;
  const dPct = (discuss / total) * 100;
  const lPct = (limit / total) * 100;
  return (
    <div
      className="flex rounded overflow-hidden mb-4"
      style={{ height: 6, background: "var(--surface3)" }}
      role="img"
      aria-label={`Verdeling: ${match} match, ${discuss} te bespreken, ${limit} grenzen`}
    >
      {match > 0 && (
        <div style={{ width: `${mPct}%`, background: "var(--yes)", transition: "width 500ms ease-out" }} />
      )}
      {discuss > 0 && (
        <div style={{ width: `${dPct}%`, background: "var(--conflict)", transition: "width 500ms ease-out" }} />
      )}
      {limit > 0 && (
        <div style={{ width: `${lPct}%`, background: "var(--hard-no)", transition: "width 500ms ease-out" }} />
      )}
    </div>
  );
}

function ProfileChip({
  profile,
  colour,
  slot,
  isPartner,
  onClick,
}: {
  profile: Profile | undefined;
  colour: string;
  slot: "A" | "B";
  isPartner?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={profile ? `Kies profiel ${slot}: ${profile.name}` : `Kies profiel ${slot}`}
      className="focus-ring flex-1 flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-colors text-left min-w-0"
      style={
        profile
          ? { borderColor: colour, background: `color-mix(in srgb, ${colour} 10%, transparent)` }
          : { borderColor: "var(--border)", background: "var(--surface)" }
      }
    >
      <div
        className="w-7 h-7 rounded-full flex-none overflow-hidden flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: profile ? colour : "var(--surface3)" }}
      >
        {profile?.avatarDataUrl ? (
          <img src={profile.avatarDataUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span style={{ color: profile ? "#000" : "var(--text2)" }}>
            {profile ? profile.name[0].toUpperCase() : slot}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate leading-tight">
          {profile ? profile.name : "Kies profiel…"}
        </p>
        {profile && (
          <p className="text-[10px] truncate leading-tight" style={{ color: colour }}>
            {isPartner && <Lock size={9} className="inline mr-0.5" aria-hidden />}
            Profiel {slot}
          </p>
        )}
      </div>
      <ChevronDown size={12} className="shrink-0" style={{ color: "var(--text2)" }} />
    </button>
  );
}

function ProfileSelectorSheet({
  open,
  onClose,
  slot,
  profiles,
  selectedId,
  otherSelectedId,
  pinnedProfileId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  slot: "A" | "B";
  profiles: Profile[];
  selectedId: string;
  otherSelectedId: string;
  pinnedProfileId: string | null;
  onSelect: (id: string) => void;
}) {
  const colour = slot === "A" ? COLOUR_A : COLOUR_B;
  const own = profiles.filter((p) => !p.isImported && p.origin !== "shared");
  const partners = profiles.filter((p) => p.isImported || p.origin === "shared");

  const renderRow = (p: Profile) => {
    const isSelected = p.id === selectedId;
    const isOther = p.id === otherSelectedId;
    const isPrimary = p.id === pinnedProfileId;
    const isPartner = p.isImported || p.origin === "shared";
    return (
      <button
        key={p.id}
        onClick={() => { if (!isOther) { onSelect(p.id); onClose(); } }}
        disabled={isOther}
        aria-pressed={isSelected}
        className="focus-ring w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left"
        style={
          isSelected
            ? { background: `color-mix(in srgb, ${colour} 12%, transparent)`, border: `1px solid ${colour}` }
            : isOther
            ? { background: "transparent", border: "1px solid transparent", opacity: 0.35, cursor: "not-allowed" }
            : { background: "transparent", border: "1px solid transparent" }
        }
      >
        <div
          className="w-8 h-8 rounded-full flex-none overflow-hidden flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: isSelected ? colour : "var(--surface3)" }}
        >
          {p.avatarDataUrl ? (
            <img src={p.avatarDataUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span style={{ color: isSelected ? "#000" : "var(--text2)" }}>{p.name[0].toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium truncate">{p.name}</p>
          <p className="text-xs truncate" style={{ color: "var(--text2)" }}>
            {p.role}
            {isPrimary ? " · Primair" : ""}
            {isPartner ? " · Partner" : ""}
            {isOther ? ` · Al geselecteerd als ${slot === "A" ? "B" : "A"}` : ""}
          </p>
        </div>
        {isSelected && (
          <span className="text-xs font-bold shrink-0" style={{ color: colour }}>{slot}</span>
        )}
        {isPartner && !isSelected && !isOther && (
          <Lock size={12} className="shrink-0" style={{ color: "var(--text2)" }} />
        )}
      </button>
    );
  };

  return (
    <Sheet open={open} onClose={onClose} aria-label={`Kies profiel ${slot}`}>
      <SheetContent>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: colour }}>
          Profiel {slot}
        </p>
        {own.length > 0 && (
          <>
            <p className="text-[10px] uppercase tracking-widest mb-1 px-1" style={{ color: "var(--text2)" }}>
              Jouw profielen
            </p>
            {own.map(renderRow)}
          </>
        )}
        {partners.length > 0 && (
          <>
            <p className="text-[10px] uppercase tracking-widest mt-3 mb-1 px-1" style={{ color: "var(--text2)" }}>
              Partners
            </p>
            {partners.map(renderRow)}
          </>
        )}
        {profiles.length === 0 && (
          <p className="text-sm py-4 text-center" style={{ color: "var(--text2)" }}>
            Geen profielen gevonden.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function catAbbrev(cat: string): string {
  const first = cat.split(/\s+/)[0];
  return first.length > 8 ? first.slice(0, 8) : first;
}

function categoryPillStyle(rate: number | null): { color: string } {
  if (rate === null) return { color: "var(--text2)" };
  if (rate === 0)    return { color: "var(--hard-no)" };
  if (rate < 0.4)   return { color: "var(--conflict)" };
  if (rate < 0.7)   return { color: "var(--maybe)" };
  return { color: "var(--yes)" };
}

function ComparePage() {
  const searchParams = useSearchParams();
  const { profiles, setEntry, pinnedProfileId } = useStore();
  const _hasHydrated = useHasHydrated();

  const cleanParam = (v: string | null) => (v && v !== "undefined" && v !== "null" ? v : "");
  const [aId, setAId] = useState(cleanParam(searchParams.get("a")));
  const [bId, setBId] = useState(cleanParam(searchParams.get("b")));
  const [filterMode, setFilterMode] = useState<"all" | "match" | "conflict" | "hardno">("all");
  const [discussed, setDiscussed] = useState<Set<string>>(new Set());
  const [hideDiscussed, setHideDiscussed] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState<null | "a" | "b">(null);

  const profileA = profiles.find((p) => p.id === aId);
  const profileB = profiles.find((p) => p.id === bId);

  const toggleDiscussed = useCallback((id: string) => {
    setDiscussed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const { counts } = profileA && profileB
    ? profileMatchScore(profileA, profileB)
    : { counts: {} as Record<MatchKind, number> };
  const matchCount     = (counts.perfect ?? 0) + (counts.strong ?? 0);
  const softLimitCount = counts.soft ?? 0;
  const hardLimitCount = counts.limit ?? 0;
  const discussCount   = (counts.discuss ?? 0) + (counts.conflict ?? 0);

  useEffect(() => {
    if (!_hasHydrated || profiles.length < 2) return;
    const pa = profiles.find((p) => p.id === aId);
    const pb = profiles.find((p) => p.id === bId);
    if (!pa && !pb) {
      const primary = pinnedProfileId ? profiles.find((p) => p.id === pinnedProfileId) : null;
      const own = primary ?? profiles.find((p) => !p.isImported && p.origin !== "shared") ?? profiles[0];
      const other =
        profiles.find((p) => p.id !== own.id && (p.isImported || p.origin === "shared")) ??
        profiles.find((p) => p.id !== own.id) ??
        profiles[1];
      setAId(own.id);
      setBId(other.id);
    } else if (!pa || !pb) {
      const primary = pinnedProfileId ? profiles.find((p) => p.id === pinnedProfileId) : null;
      const own = primary ?? profiles.find((p) => !p.isImported && p.origin !== "shared") ?? profiles[0];
      const other =
        profiles.find((p) => p.id !== own.id && (p.isImported || p.origin === "shared")) ??
        profiles.find((p) => p.id !== own.id) ??
        profiles[1];
      if (!pa) setAId(own.id);
      if (!pb) setBId(other.id);
    }
  }, [_hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!_hasHydrated) return <PageShell loading width="5xl" />;

  function getEntry(profile: typeof profileA, kinkId: string): KinkEntry {
    return profile?.entries[kinkId] ?? { status: null, comment: "" };
  }

  function passesFilter(eA: KinkEntry, eB: KinkEntry): boolean {
    const hasA = eA.status || eA.statusGive || eA.statusReceive;
    const hasB = eB.status || eB.statusGive || eB.statusReceive;
    if (!hasA && !hasB) return false;
    if (filterMode === "all") return true;
    if (filterMode === "hardno") return isHardLimit(eA, eB);
    if (filterMode === "conflict") return isConflict(eA, eB);
    if (filterMode === "match") return isKinkMatch(eA, eB);
    return true;
  }

  const categoryScores = profileA && profileB
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
        return { cat, rate: catRated > 0 ? catMatches / catRated : null };
      })
    : [];

  function scrollToCategory(cat: string) {
    const el = document.getElementById(`cat-${cat}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const samePairError = aId && bId && aId === bId;
  const isPartnerA = profileA?.isImported || profileA?.origin === "shared";
  const isPartnerB = profileB?.isImported || profileB?.origin === "shared";

  const hasPair = !!profileA && !!profileB && !samePairError;

  return (
    <PageShell width="5xl">

      {/* ── Sticky profile strip ──────────────────────────────────────── */}
      <div
        className="sticky z-10 pb-3 mb-3"
        style={{
          top: "var(--nav-h)",
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2 pt-3">
          <ProfileChip
            profile={profileA}
            colour={COLOUR_A}
            slot="A"
            isPartner={!!isPartnerA}
            onClick={() => setSelectorOpen("a")}
          />
          <button
            onClick={() => { const tmp = aId; setAId(bId); setBId(tmp); }}
            className="focus-ring flex-none w-9 h-9 rounded-xl border flex items-center justify-center transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            aria-label="Wissel profielen"
          >
            <ArrowLeftRight size={15} />
          </button>
          <ProfileChip
            profile={profileB}
            colour={COLOUR_B}
            slot="B"
            isPartner={!!isPartnerB}
            onClick={() => setSelectorOpen("b")}
          />
        </div>
        {samePairError && (
          <p className="text-xs mt-2 px-1" style={{ color: "var(--conflict)" }}>
            Kies twee verschillende profielen om te vergelijken.
          </p>
        )}
      </div>

      {/* ── Score masthead + alignment ribbon + category nav + filter tabs ── */}
      {hasPair && (
        <>
          <ScoreMasthead match={matchCount} discuss={discussCount} limit={hardLimitCount} />
          <AlignmentBar match={matchCount} discuss={discussCount} limit={hardLimitCount} />

          {/* Category heatmap strip */}
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 mb-4">
            {categoryScores
              .filter((c) => c.rate !== null)
              .map(({ cat, rate }) => (
                <button
                  key={cat}
                  onClick={() => scrollToCategory(cat)}
                  className="focus-ring flex-none px-1.5 py-0.5 text-[10px] uppercase tracking-widest whitespace-nowrap transition-opacity hover:opacity-70"
                  style={categoryPillStyle(rate)}
                >
                  — {catAbbrev(cat)}
                </button>
              ))}
          </div>

          {/* Filter tabs row */}
          <div
            className="flex items-stretch mb-4 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            {(["all", "match", "conflict", "hardno"] as const).map((f) => {
              const labels: Record<typeof f, string> = {
                all: "Alles",
                match: "Match",
                conflict: "Bespreken",
                hardno: "Grenzen",
              };
              const badge = f === "conflict" ? discussCount : f === "hardno" ? hardLimitCount : null;
              const badgeColour = f === "hardno" ? "var(--hard-no)" : "var(--conflict)";
              const active = filterMode === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilterMode(f)}
                  className="focus-ring flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors"
                  style={{
                    color: active ? "var(--text)" : "var(--text2)",
                    borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                    marginBottom: "-1px",
                  }}
                >
                  {labels[f]}
                  {badge !== null && badge > 0 && (
                    <span
                      className="text-[10px] px-1 py-px rounded font-semibold tabular-nums"
                      style={{
                        background: `color-mix(in srgb, ${badgeColour} 20%, transparent)`,
                        color: badgeColour,
                      }}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setHideDiscussed((v) => !v)}
              className="focus-ring ml-auto px-3 py-2 text-xs transition-colors whitespace-nowrap"
              style={{ color: hideDiscussed ? "var(--accent)" : "var(--text2)" }}
            >
              {hideDiscussed ? "Toon alles" : "Verberg besproken"}
            </button>
          </div>
        </>
      )}

      {/* ── Kink list ─────────────────────────────────────────────────── */}
      <div>
        {!hasPair ? (
          <p className="text-center py-12 text-sm" style={{ color: "var(--text2)" }}>
            {samePairError
              ? "Kies twee verschillende profielen."
              : "Kies twee profielen — dan kijken we wat jullie gemeen hebben."}
          </p>
        ) : (
          <>
            {(() => {
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
                        return (
                          <div
                            key={kink.id}
                            className="rounded-sm px-3 py-2.5 transition-opacity"
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              borderLeft: hardLimit
                                ? "4px solid var(--hard-no)"
                                : matched
                                ? "4px solid var(--yes)"
                                : conflict
                                ? "4px solid var(--conflict)"
                                : "4px solid transparent",
                              opacity: isDiscussed ? 0.45 : 1,
                            }}
                          >
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
                                    ? { background: "color-mix(in srgb, var(--yes) 15%, transparent)", borderColor: "var(--yes)", color: "var(--yes)" }
                                    : { background: "transparent", borderColor: "var(--border)", color: "var(--text2)" }
                                }
                              >
                                {isDiscussed ? "✓ Besproken" : "Bespreken"}
                              </button>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <EntryBadge entry={eA} colour={COLOUR_A} />
                              <div
                                className="flex-1 h-px"
                                style={{
                                  background: "var(--border)",
                                  opacity: matched ? 0.6 : 0.25,
                                }}
                              />
                              <EntryBadge entry={eB} colour={COLOUR_B} />
                            </div>
                            {(() => {
                              const showReadOnlyA = profileA.isImported && !!eA.comment;
                              const showReadOnlyB = profileB.isImported && !!eB.comment;
                              return (
                                <>
                                  {(showReadOnlyA || showReadOnlyB) && (
                                    <div className="mt-1 text-xs space-y-0.5" style={{ color: "var(--text2)" }}>
                                      {showReadOnlyA && (
                                        <div>
                                          <span className="font-medium" style={{ color: COLOUR_A }}>{profileA.name}:</span>{" "}
                                          {eA.comment}
                                        </div>
                                      )}
                                      {showReadOnlyB && (
                                        <div>
                                          <span className="font-medium" style={{ color: COLOUR_B }}>{profileB.name}:</span>{" "}
                                          {eB.comment}
                                        </div>
                                      )}
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
                                        style={{
                                          background: "var(--surface2)",
                                          border: `1px solid color-mix(in srgb, ${COLOUR_A} 30%, var(--border))`,
                                          color: "var(--text)",
                                        }}
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
                                        style={{
                                          background: "var(--surface2)",
                                          border: `1px solid color-mix(in srgb, ${COLOUR_B} 30%, var(--border))`,
                                          color: "var(--text)",
                                        }}
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

            {/* Custom kinks */}
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
                      const eA = item.aId
                        ? (profileA.entries[item.aId] ?? { status: null, comment: "" })
                        : { status: null as KinkStatus, comment: "" };
                      const eB = item.bId
                        ? (profileB.entries[item.bId] ?? { status: null, comment: "" })
                        : { status: null as KinkStatus, comment: "" };
                      const matched = isKinkMatch(eA, eB);
                      const hardLimit = isHardLimit(eA, eB);
                      const conflict = !matched && !hardLimit && isConflict(eA, eB);
                      const rowKey = item.name.trim().toLowerCase();
                      if (!passesFilter(eA, eB)) return null;
                      if (hideDiscussed && discussed.has(rowKey)) return null;
                      const isDiscussed = discussed.has(rowKey);
                      return (
                        <div
                          key={rowKey}
                          className="rounded-sm px-3 py-2.5 transition-opacity"
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderLeft: hardLimit
                              ? "4px solid var(--hard-no)"
                              : matched
                              ? "4px solid var(--yes)"
                              : conflict
                              ? "4px solid var(--conflict)"
                              : "4px solid transparent",
                            opacity: isDiscussed ? 0.45 : 1,
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium flex-1 flex items-center gap-1.5">
                              {item.name}
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--surface2)", color: "var(--text2)" }}>
                                eigen
                              </span>
                            </span>
                            <button
                              onClick={() => toggleDiscussed(rowKey)}
                              aria-label={isDiscussed ? `${item.name} als niet besproken markeren` : `${item.name} als besproken markeren`}
                              className="text-[10px] px-2 py-0.5 rounded border transition-colors whitespace-nowrap flex-none"
                              style={
                                isDiscussed
                                  ? { background: "color-mix(in srgb, var(--yes) 15%, transparent)", borderColor: "var(--yes)", color: "var(--yes)" }
                                  : { background: "transparent", borderColor: "var(--border)", color: "var(--text2)" }
                              }
                            >
                              {isDiscussed ? "✓ Besproken" : "Bespreken"}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <EntryBadge entry={eA} colour={COLOUR_A} />
                            <div
                              className="flex-1 h-px"
                              style={{
                                background: "var(--border)",
                                opacity: matched ? 0.6 : 0.25,
                              }}
                            />
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
                                style={{
                                  background: "var(--surface2)",
                                  border: `1px solid color-mix(in srgb, ${COLOUR_A} 30%, var(--border))`,
                                  color: "var(--text)",
                                }}
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
                                style={{
                                  background: "var(--surface2)",
                                  border: `1px solid color-mix(in srgb, ${COLOUR_B} 30%, var(--border))`,
                                  color: "var(--text)",
                                }}
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

            {/* ── Bottom actions ──────────────────────────────────────── */}
            <div className="pt-2 pb-2 flex flex-col gap-2">
              <div className="flex gap-2">
                <Link
                  href={`/scene?a=${aId}&b=${bId}`}
                  className="focus-ring flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  <Clapperboard size={14} aria-hidden="true" />
                  Plan een scène
                </Link>
                <Link
                  href={`/contract?a=${aId}&b=${bId}`}
                  className="focus-ring flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ background: "var(--accent)", color: "#000" }}
                >
                  <FileText size={14} aria-hidden="true" />
                  Contract
                </Link>
              </div>
              <div className="flex justify-center pt-1">
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="focus-ring text-xs px-4 py-2 rounded-full border transition-colors"
                  style={{ color: "var(--text2)", borderColor: "var(--border)" }}
                >
                  ↑ Terug naar boven
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Profile selector sheets ──────────────────────────────────── */}
      <ProfileSelectorSheet
        open={selectorOpen === "a"}
        onClose={() => setSelectorOpen(null)}
        slot="A"
        profiles={profiles}
        selectedId={aId}
        otherSelectedId={bId}
        pinnedProfileId={pinnedProfileId}
        onSelect={setAId}
      />
      <ProfileSelectorSheet
        open={selectorOpen === "b"}
        onClose={() => setSelectorOpen(null)}
        slot="B"
        profiles={profiles}
        selectedId={bId}
        otherSelectedId={aId}
        pinnedProfileId={pinnedProfileId}
        onSelect={setBId}
      />

    </PageShell>
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
