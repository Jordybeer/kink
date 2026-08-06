"use client";
import { useState, Suspense, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUp, ArrowsLeftRight, CaretDown, FileText, FilmSlate, Lock } from "@phosphor-icons/react";
import { useStore, useHasHydrated } from "@/lib/store";
import { CATEGORIES, getKinksByCategory } from "@/lib/kinks";
import type { KinkEntry, Profile } from "@/types";
import {
  hasRating,
  isKinkMatch,
  isHardLimit,
  isConflict,
  kinkMatchScore,
  MAX_KINK_MATCH_SCORE,
  profileMatchScore,
} from "@/lib/matching";
import type { MatchKind } from "@/lib/matching";
import PageShell from "@/components/PageShell";
import Sheet, { SheetContent } from "@/components/Sheet";
import DiscussedToggle from "@/components/DiscussedToggle";
import CompareKinkRow from "@/components/CompareKinkRow";

const COLOUR_A = "var(--identity-a)";
const COLOUR_B = "var(--identity-b)";

function compatibilityVerdict(score: number | null): string | null {
  if (score === null) return null;
  if (score >= 85) return "Sterke compatibiliteit";
  if (score >= 70) return "Goede basis";
  if (score >= 55) return "Gemengde compatibiliteit";
  if (score >= 40) return "Veel te bespreken";
  return "Grote verschillen";
}

function ScoreMasthead({ score, match, discuss, soft, limit }: {
  score: number | null;
  match: number;
  discuss: number;
  soft: number;
  limit: number;
}) {
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
    <div className="text-center mb-4 mt-1">
      <div
        aria-label={score === null ? "Nog geen gezamenlijk beoordeelde kinks" : `${score} procent kinkcompatibiliteit`}
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
      {verdict && <p className="text-sm font-semibold mt-2" style={{ color: verdictColor }}>{verdict}</p>}
      {total > 0 && (
        <div className="flex justify-center flex-wrap gap-x-3 gap-y-1 text-xs mt-2" style={{ color: "var(--text2)" }}>
          <span><span className="font-semibold tabular-nums" style={{ color: "var(--yes)" }}>{match}</span> match</span>
          {discuss > 0 && <span><span className="font-semibold tabular-nums" style={{ color: "var(--conflict)" }}>{discuss}</span> te bespreken</span>}
          {soft > 0 && <span><span className="font-semibold tabular-nums" style={{ color: "var(--maybe)" }}>{soft}</span> zacht</span>}
          {limit > 0 && <span><span className="font-semibold tabular-nums" style={{ color: "var(--hard-no-text)" }}>{limit}</span> {limit === 1 ? "grens" : "grenzen"}</span>}
        </div>
      )}
    </div>
  );
}

function AlignmentBar({ match, discuss, soft, limit }: {
  match: number; discuss: number; soft: number; limit: number;
}) {
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
          style={{ width: `${(segment.count / total) * 100}%`, background: segment.color, transition: "width 500ms ease-out" }}
        />
      ) : null)}
    </div>
  );
}

function ProfileChip({ profile, colour, slot, isPartner, onClick }: {
  profile: Profile | undefined;
  colour: string;
  slot: "A" | "B";
  isPartner?: boolean;
  onClick: () => void;
}) {
  const labelColour = slot === "B" ? "var(--accent2-text)" : "var(--accent-text)";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={profile ? `Kies profiel ${slot}: ${profile.name}` : `Kies profiel ${slot}`}
      className="focus-ring min-h-11 flex-1 flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-colors text-left min-w-0"
      style={profile
        ? { borderColor: colour, background: `color-mix(in srgb, ${colour} 10%, transparent)` }
        : { borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="w-7 h-7 rounded-full flex-none overflow-hidden flex items-center justify-center text-xs font-bold shrink-0" style={{ background: profile ? colour : "var(--surface3)" }}>
        {profile?.avatarDataUrl ? (
          <img src={profile.avatarDataUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span style={{ color: profile ? "var(--on-accent)" : "var(--text2)" }}>{profile ? profile.name[0].toUpperCase() : slot}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate leading-tight">{profile ? profile.name : "Kies profiel…"}</p>
        {profile && (
          <p className="text-xs truncate leading-tight" style={{ color: labelColour }}>
            {isPartner && <Lock size={9} className="inline mr-0.5" aria-hidden="true" />}
            Profiel {slot}
          </p>
        )}
      </div>
      <CaretDown aria-hidden="true" size={12} className="shrink-0" style={{ color: "var(--text2)" }} />
    </button>
  );
}

function ProfileSelectorSheet({ open, onClose, slot, profiles, selectedId, otherSelectedId, pinnedProfileId, onSelect }: {
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
  const textColour = slot === "A" ? "var(--accent-text)" : "var(--accent2-text)";
  const own = profiles.filter((profile) => !profile.isImported && profile.origin !== "shared");
  const partners = profiles.filter((profile) => profile.isImported || profile.origin === "shared");

  const renderRow = (profile: Profile) => {
    const isSelected = profile.id === selectedId;
    const isOther = profile.id === otherSelectedId;
    const isPrimary = profile.id === pinnedProfileId;
    const isPartner = profile.isImported || profile.origin === "shared";
    return (
      <button
        key={profile.id}
        type="button"
        onClick={() => { if (!isOther) { onSelect(profile.id); onClose(); } }}
        disabled={isOther}
        aria-pressed={isSelected}
        className="focus-ring min-h-12 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left"
        style={isSelected
          ? { background: `color-mix(in srgb, ${colour} 12%, transparent)`, border: `1px solid ${colour}` }
          : isOther
            ? { background: "transparent", border: "1px solid transparent", opacity: 0.35, cursor: "not-allowed" }
            : { background: "transparent", border: "1px solid transparent" }}
      >
        <div className="w-8 h-8 rounded-full flex-none overflow-hidden flex items-center justify-center text-sm font-bold shrink-0" style={{ background: isSelected ? colour : "var(--surface3)" }}>
          {profile.avatarDataUrl ? <img src={profile.avatarDataUrl} alt="" className="w-full h-full object-cover" /> : <span style={{ color: isSelected ? "var(--on-accent)" : "var(--text2)" }}>{profile.name[0].toUpperCase()}</span>}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium truncate">{profile.name}</p>
          <p className="text-xs truncate" style={{ color: "var(--text2)" }}>
            {profile.role}{isPrimary ? " · Primair" : ""}{isPartner ? " · Partner" : ""}{isOther ? ` · Al geselecteerd als ${slot === "A" ? "B" : "A"}` : ""}
          </p>
        </div>
        {isSelected && <span className="text-xs font-bold shrink-0" style={{ color: textColour }}>{slot}</span>}
        {isPartner && !isSelected && !isOther && <Lock aria-hidden="true" size={12} className="shrink-0" style={{ color: "var(--text2)" }} />}
      </button>
    );
  };

  return (
    <Sheet open={open} onClose={onClose} aria-label={`Kies profiel ${slot}`}>
      <SheetContent>
        <h2 className="text-sm mb-3" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--text2)" }}>
          Profiel {slot}
        </h2>
        {own.length > 0 && (
          <section aria-labelledby={`own-profiles-${slot}`}>
            <h3 id={`own-profiles-${slot}`} className="text-xs font-semibold mb-1 px-1" style={{ color: "var(--text2)" }}>Jouw profielen</h3>
            {own.map(renderRow)}
          </section>
        )}
        {partners.length > 0 && (
          <section className="mt-3" aria-labelledby={`partner-profiles-${slot}`}>
            <h3 id={`partner-profiles-${slot}`} className="text-xs font-semibold mb-1 px-1" style={{ color: "var(--text2)" }}>Partners</h3>
            {partners.map(renderRow)}
          </section>
        )}
        {profiles.length === 0 && <p className="text-sm py-4 text-center" style={{ color: "var(--text2)" }}>Geen profielen gevonden.</p>}
      </SheetContent>
    </Sheet>
  );
}

function ComparePage() {
  const searchParams = useSearchParams();
  const { profiles, setEntry, pinnedProfileId } = useStore();
  const hasHydrated = useHasHydrated();

  const cleanParam = (value: string | null) => (value && value !== "undefined" && value !== "null" ? value : "");
  const [aId, setAId] = useState(cleanParam(searchParams.get("a")));
  const [bId, setBId] = useState(cleanParam(searchParams.get("b")));
  const [filterMode, setFilterMode] = useState<"all" | "match" | "conflict" | "hardno">("all");
  const [discussed, setDiscussed] = useState<Set<string>>(new Set());
  const [hideDiscussed, setHideDiscussed] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState<null | "a" | "b">(null);

  const profileA = profiles.find((profile) => profile.id === aId);
  const profileB = profiles.find((profile) => profile.id === bId);

  const toggleDiscussed = useCallback((id: string) => {
    setDiscussed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const matchResult = profileA && profileB
    ? profileMatchScore(profileA, profileB)
    : { overall: 0, counts: {} as Record<MatchKind, number>, comparedTotal: 0, unscoredLimits: 0 };
  const { counts } = matchResult;
  const matchCount = (counts.perfect ?? 0) + (counts.strong ?? 0);
  const softLimitCount = counts.soft ?? 0;
  const hardLimitCount = counts.limit ?? 0;
  const discussCount = (counts.discuss ?? 0) + (counts.conflict ?? 0);

  useEffect(() => {
    if (!hasHydrated || profiles.length < 2) return;
    const selectedA = profiles.find((profile) => profile.id === aId);
    const selectedB = profiles.find((profile) => profile.id === bId);
    if (!selectedA || !selectedB) {
      const primary = pinnedProfileId ? profiles.find((profile) => profile.id === pinnedProfileId) : null;
      const preferredOwn = primary ?? profiles.find((profile) => !profile.isImported && profile.origin !== "shared") ?? profiles[0];
      const nextA = selectedA
        ?? (preferredOwn.id !== selectedB?.id ? preferredOwn : undefined)
        ?? profiles.find((profile) => profile.id !== selectedB?.id && !profile.isImported && profile.origin !== "shared")
        ?? profiles.find((profile) => profile.id !== selectedB?.id);
      const nextB = selectedB
        ?? profiles.find((profile) => profile.id !== nextA?.id && (profile.isImported || profile.origin === "shared"))
        ?? profiles.find((profile) => profile.id !== nextA?.id);
      if (!selectedA && nextA) setAId(nextA.id);
      if (!selectedB && nextB) setBId(nextB.id);
    }
  }, [hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasHydrated) return <PageShell loading width="5xl" />;

  function getEntry(profile: typeof profileA, kinkId: string): KinkEntry {
    return profile?.entries[kinkId] ?? { status: null, comment: "" };
  }

  function passesFilter(entryA: KinkEntry, entryB: KinkEntry): boolean {
    if (!entryA.status && !entryB.status) return false;
    if (filterMode === "all") return true;
    if (filterMode === "hardno") return isHardLimit(entryA, entryB);
    if (filterMode === "conflict") return isConflict(entryA, entryB);
    if (filterMode === "match") return isKinkMatch(entryA, entryB);
    return true;
  }

  const categoryScores = profileA && profileB
    ? CATEGORIES.map((category) => {
        const kinks = getKinksByCategory(category);
        let scoreSum = 0;
        let compared = 0;
        let rated = 0;
        for (const kink of kinks) {
          const entryA = profileA.entries[kink.id] ?? { status: null, comment: "" };
          const entryB = profileB.entries[kink.id] ?? { status: null, comment: "" };
          if (hasRating(entryA) || hasRating(entryB)) rated += 1;
          if (!hasRating(entryA) || !hasRating(entryB)) continue;
          scoreSum += kinkMatchScore(entryA, entryB).score;
          compared += 1;
        }
        return {
          category,
          rated,
          compared,
          rate: compared > 0 ? scoreSum / (compared * MAX_KINK_MATCH_SCORE) : null,
        };
      })
    : [];

  function scrollToCategory(category: string) {
    document.getElementById(`cat-${category}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const samePairError = !!aId && !!bId && aId === bId;
  const isPartnerA = profileA?.isImported || profileA?.origin === "shared";
  const isPartnerB = profileB?.isImported || profileB?.origin === "shared";
  const hasPair = !!profileA && !!profileB && !samePairError;

  return (
    <PageShell width="5xl">
      <h1 className="sr-only">Profielen vergelijken</h1>
      <div
        className="sticky z-10 pb-3 mb-3"
        style={{ top: "var(--nav-h)", background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 pt-3">
          <ProfileChip profile={profileA} colour={COLOUR_A} slot="A" isPartner={!!isPartnerA} onClick={() => setSelectorOpen("a")} />
          <button
            type="button"
            onClick={() => { const previousA = aId; setAId(bId); setBId(previousA); }}
            className="focus-ring flex-none w-11 h-11 rounded-xl border flex items-center justify-center transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            aria-label="Wissel profielen"
          >
            <ArrowsLeftRight aria-hidden="true" size={17} />
          </button>
          <ProfileChip profile={profileB} colour={COLOUR_B} slot="B" isPartner={!!isPartnerB} onClick={() => setSelectorOpen("b")} />
        </div>
        {samePairError && <p role="alert" className="text-sm mt-2 px-1" style={{ color: "var(--conflict)" }}>Kies twee verschillende profielen om te vergelijken.</p>}
      </div>

      {hasPair && (
        <>
          <ScoreMasthead
            score={matchResult.comparedTotal > 0 ? matchResult.overall : null}
            match={matchCount}
            discuss={discussCount}
            soft={softLimitCount}
            limit={hardLimitCount}
          />
          <AlignmentBar match={matchCount} discuss={discussCount} soft={softLimitCount} limit={hardLimitCount} />

          <nav className="no-scrollbar flex gap-2 overflow-x-auto pb-2 mb-3" aria-label="Spring naar categorie">
            {categoryScores.filter(({ rated }) => rated > 0).map(({ category, rate, compared }) => {
              const score = rate === null ? null : Math.round(rate * 100);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => scrollToCategory(category)}
                  aria-label={score === null
                    ? `${category}, nog geen gezamenlijke score`
                    : `${category}, ${score} procent compatibiliteit over ${compared} gezamenlijke beoordelingen`}
                  className="focus-ring flex-none min-h-11 rounded-full px-3 text-xs whitespace-nowrap"
                  style={{ color: "var(--text)", background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  {category}{score === null ? "" : ` · ${score}%`}
                </button>
              );
            })}
          </nav>

          <div className="flex items-stretch mb-4 border-b overflow-x-auto" style={{ borderColor: "var(--border)" }} role="group" aria-label="Vergelijkingsfilter">
            {(["all", "match", "conflict", "hardno"] as const).map((filter) => {
              const labels = { all: "Alles", match: "Match", conflict: "Bespreken", hardno: "Grenzen" } as const;
              const badge = filter === "match" ? matchCount : filter === "conflict" ? discussCount : filter === "hardno" ? hardLimitCount : null;
              const badgeColour = filter === "match" ? "var(--yes)" : filter === "hardno" ? "var(--hard-no-text)" : "var(--conflict)";
              const active = filterMode === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setFilterMode(filter)}
                  aria-pressed={active}
                  className="focus-ring min-h-11 flex flex-none items-center gap-1 px-3 text-xs font-medium transition-colors"
                  style={{ color: active ? "var(--text)" : "var(--text2)", borderBottom: active ? "2px solid var(--focus)" : "2px solid transparent", marginBottom: "-1px" }}
                >
                  {labels[filter]}
                  {badge !== null && badge > 0 && (
                    <span className="text-[11px] px-1 py-px rounded-full font-semibold tabular-nums" style={{ background: `color-mix(in srgb, ${badgeColour} 20%, transparent)`, color: badgeColour }}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <DiscussedToggle count={discussed.size} hidden={hideDiscussed} onToggle={() => setHideDiscussed((value) => !value)} />
        </>
      )}

      <div>
        {!hasPair ? (
          <p className="text-center py-12 text-sm" style={{ color: "var(--text2)" }}>
            {samePairError ? "Kies twee verschillende profielen." : "Kies twee profielen, dan kijken we wat jullie gemeen hebben."}
          </p>
        ) : (
          <>
            {CATEGORIES.map((category) => {
              const kinks = getKinksByCategory(category).filter((kink) => {
                if (hideDiscussed && discussed.has(kink.id)) return false;
                return passesFilter(getEntry(profileA, kink.id), getEntry(profileB, kink.id));
              });
              if (!kinks.length) return null;
              return (
                <section
                  key={category}
                  id={`cat-${category}`}
                  className="mb-6"
                  style={{ scrollMarginTop: "calc(var(--nav-h) + var(--compare-subnav-h) + 1rem)" }}
                >
                  <h2 className="text-sm mb-2 px-1" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--text)" }}>
                    {category}
                  </h2>
                  <div className="flex flex-col gap-2">
                    {kinks.map((kink) => {
                      const entryA = getEntry(profileA, kink.id);
                      const entryB = getEntry(profileB, kink.id);
                      return (
                        <CompareKinkRow
                          key={kink.id}
                          rowKey={kink.id}
                          name={kink.name}
                          entryA={entryA}
                          entryB={entryB}
                          profileA={profileA!}
                          profileB={profileB!}
                          colourA={COLOUR_A}
                          colourB={COLOUR_B}
                          isDiscussed={discussed.has(kink.id)}
                          onToggleDiscussed={() => toggleDiscussed(kink.id)}
                          onCommentA={!profileA!.isImported ? (comment) => setEntry(profileA!.id, kink.id, { comment }) : undefined}
                          onCommentB={!profileB!.isImported ? (comment) => setEntry(profileB!.id, kink.id, { comment }) : undefined}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {(() => {
              const allCustom = [
                ...(profileA!.customKinks ?? []).map((kink) => ({ ...kink, side: "a" as const })),
                ...(profileB!.customKinks ?? []).map((kink) => ({ ...kink, side: "b" as const })),
              ];
              const merged = new Map<string, { name: string; aId?: string; bId?: string }>();
              for (const custom of allCustom) {
                const key = custom.name.trim().toLowerCase();
                const existing = merged.get(key) ?? { name: custom.name };
                merged.set(key, custom.side === "a" ? { ...existing, aId: custom.id } : { ...existing, bId: custom.id });
              }
              if (!merged.size) return null;
              return (
                <section className="mb-6" aria-labelledby="compare-more-heading">
                  <h2 id="compare-more-heading" className="text-sm mb-2 px-1" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--text)" }}>
                    Meer
                  </h2>
                  <div className="flex flex-col gap-2">
                    {Array.from(merged.values()).map((item) => {
                      const entryA = item.aId ? (profileA!.entries[item.aId] ?? { status: null, comment: "" }) : { status: null, comment: "" };
                      const entryB = item.bId ? (profileB!.entries[item.bId] ?? { status: null, comment: "" }) : { status: null, comment: "" };
                      const rowKey = item.name.trim().toLowerCase();
                      if (!passesFilter(entryA, entryB) || (hideDiscussed && discussed.has(rowKey))) return null;
                      return (
                        <CompareKinkRow
                          key={rowKey}
                          rowKey={rowKey}
                          name={item.name}
                          entryA={entryA}
                          entryB={entryB}
                          profileA={profileA!}
                          profileB={profileB!}
                          colourA={COLOUR_A}
                          colourB={COLOUR_B}
                          custom
                          isDiscussed={discussed.has(rowKey)}
                          onToggleDiscussed={() => toggleDiscussed(rowKey)}
                          onCommentA={!profileA!.isImported && item.aId ? (comment) => setEntry(profileA!.id, item.aId!, { comment }) : undefined}
                          onCommentB={!profileB!.isImported && item.bId ? (comment) => setEntry(profileB!.id, item.bId!, { comment }) : undefined}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })()}

            <div className="pt-2 pb-2 flex flex-col gap-2">
              <div className="flex gap-2">
                <Link href={`/scene?a=${aId}&b=${bId}`} className="focus-ring min-h-11 flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-opacity hover:opacity-80" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                  <FilmSlate size={14} aria-hidden="true" /> Plan een scène
                </Link>
                <Link href={`/contract?a=${aId}&b=${bId}`} className="focus-ring min-h-11 flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-80" style={{ background: "var(--action-primary)", color: "var(--on-accent)" }}>
                  <FileText size={14} aria-hidden="true" /> Contract
                </Link>
              </div>
              <div className="flex justify-center pt-1">
                <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="focus-ring min-h-11 text-xs px-4 rounded-full border transition-colors" style={{ color: "var(--text2)", borderColor: "var(--border)" }}>
                  <ArrowUp size={14} aria-hidden="true" /> Terug naar boven
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ProfileSelectorSheet open={selectorOpen === "a"} onClose={() => setSelectorOpen(null)} slot="A" profiles={profiles} selectedId={aId} otherSelectedId={bId} pinnedProfileId={pinnedProfileId} onSelect={setAId} />
      <ProfileSelectorSheet open={selectorOpen === "b"} onClose={() => setSelectorOpen(null)} slot="B" profiles={profiles} selectedId={bId} otherSelectedId={aId} pinnedProfileId={pinnedProfileId} onSelect={setBId} />
    </PageShell>
  );
}

export default function CompareSuspense() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm" style={{ color: "var(--text2)" }}>Laden…</div>}>
      <ComparePage />
    </Suspense>
  );
}
