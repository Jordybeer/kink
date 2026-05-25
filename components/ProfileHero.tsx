"use client";
import type { Profile } from "@/types";
import { CATEGORIES, getKinksByCategoryAndLevel } from "@/lib/kinks";

interface ProfileHeroProps {
  profile: Profile;
  maxLevel: number;
  onShare: () => void;
}

const STATUSES = ["yes", "willing", "maybe", "no", "hard_no"] as const;
type Status = typeof STATUSES[number];

const DNA_COLORS: Record<Status, string> = {
  yes:     "#4ade80",
  willing: "#60a5fa",
  maybe:   "#fbbf24",
  no:      "#f87171",
  hard_no: "#ef4444",
};

const DNA_ICONS: Record<Status, string> = {
  yes:     "✓",
  willing: "↗",
  maybe:   "♡",
  no:      "✕",
  hard_no: "✕✕",
};

const VIBE_MAP: Record<Status, string> = {
  yes:     "Avontuurlijk 🔥",
  willing: "Open-minded ✨",
  maybe:   "Bedachtzaam 🌙",
  no:      "Selectief 🔒",
  hard_no: "Selectief 🔒",
};

export default function ProfileHero({ profile, maxLevel, onShare }: ProfileHeroProps) {
  const visibleKinks = CATEGORIES.flatMap((cat) => getKinksByCategoryAndLevel(cat, maxLevel));

  const statusCounts = Object.values(profile.entries).reduce((acc, e) => {
    if (e.status) acc[e.status as Status] = (acc[e.status as Status] ?? 0) + 1;
    return acc;
  }, {} as Record<Status, number>);

  const totalRated = visibleKinks.filter((k) => profile.entries[k.id]?.status).length;
  const totalVisible = visibleKinks.length;
  const progressPct = totalVisible > 0 ? Math.round((totalRated / totalVisible) * 100) : 0;

  const dnaSegments = STATUSES
    .map((s) => ({
      status: s,
      count: statusCounts[s] ?? 0,
      pct: totalRated > 0 ? ((statusCounts[s] ?? 0) / totalRated) * 100 : 0,
    }))
    .filter((s) => s.count > 0);

  const dominantStatus = STATUSES.reduce(
    (best, s) => ((statusCounts[s] ?? 0) > (statusCounts[best] ?? 0) ? s : best),
    STATUSES[0]
  );
  const dominantPct = totalRated > 0 ? ((statusCounts[dominantStatus] ?? 0) / totalRated) * 100 : 0;
  const vibe = totalRated === 0 ? null : dominantPct > 50 ? VIBE_MAP[dominantStatus] : "Veelzijdig ⚡";

  const customKinkCount = (profile.customKinks ?? []).length;

  const topCategory = CATEGORIES.reduce((best, cat) => {
    const count = getKinksByCategoryAndLevel(cat, maxLevel).filter((k) => profile.entries[k.id]?.status).length;
    const bestCount = getKinksByCategoryAndLevel(best, maxLevel).filter((k) => profile.entries[k.id]?.status).length;
    return count > bestCount ? cat : best;
  }, CATEGORIES[0]);
  const topCategoryHasRatings = getKinksByCategoryAndLevel(topCategory, maxLevel).some(
    (k) => profile.entries[k.id]?.status
  );

  const memberSince = new Date(profile.createdAt).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const initial = profile.name.charAt(0).toUpperCase();

  return (
    <section className="ks-fade-in px-4 pb-5">
      {/* Gradient accent strip */}
      <div
        className="h-px -mx-4 mb-5"
        style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))" }}
      />

      {/* Identity row */}
      <div className="flex items-start gap-4 mb-5">
        <div
          className="ks-icon-pop flex-none w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-black select-none"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
          aria-hidden="true"
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h2 className="text-2xl font-bold truncate">{profile.name}</h2>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
            >
              {profile.role}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "var(--surface2)", color: "var(--accent)", border: "1px solid var(--border)" }}
            >
              {profile.experienceLevel ?? "beginner"}
            </span>
            {vibe && (
              <span
                className="text-xs px-3 py-0.5 rounded-full font-semibold"
                style={{
                  background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                  color: "var(--accent)",
                }}
              >
                {vibe}
              </span>
            )}
          </div>
          <p className="text-xs mt-1.5" style={{ color: "var(--text2)" }}>
            Lid sinds {memberSince} · {progressPct}% ingevuld
          </p>
        </div>
      </div>

      {/* Kink DNA bar */}
      <div className="mb-4">
        <p className="text-xs font-semibold mb-1.5">
          Jouw kink-DNA{" "}
          <span className="font-normal" style={{ color: "var(--text2)" }}>
            — verdeling van je keuzes
          </span>
        </p>
        {dnaSegments.length === 0 ? (
          <div
            className="h-2 rounded-full w-full"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            aria-label="Nog geen keuzes gemaakt"
          />
        ) : (
          <div
            className="h-2 rounded-full overflow-hidden flex"
            style={{ background: "var(--surface2)" }}
            role="img"
            aria-label="Kink DNA verdeling"
          >
            {dnaSegments.map((seg, i) => (
              <div
                key={seg.status}
                className="h-full"
                style={{
                  width: `${seg.pct}%`,
                  background: DNA_COLORS[seg.status],
                  borderRadius:
                    dnaSegments.length === 1
                      ? "9999px"
                      : i === 0
                      ? "9999px 0 0 9999px"
                      : i === dnaSegments.length - 1
                      ? "0 9999px 9999px 0"
                      : "0",
                  transition: "width 700ms ease-out",
                }}
              />
            ))}
          </div>
        )}
        {dnaSegments.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
            {dnaSegments.map((seg) => (
              <span
                key={seg.status}
                className="text-[10px] tabular-nums flex items-center gap-0.5"
                style={{ color: DNA_COLORS[seg.status] }}
              >
                {DNA_ICONS[seg.status]} {seg.count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-0.5">
        <div
          className="ks-slide-up flex-none rounded-xl p-3 min-w-[96px]"
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            animationDelay: "80ms",
          }}
        >
          <p className="text-xl font-bold tabular-nums leading-none" style={{ color: "var(--accent)" }}>
            {totalRated}
            <span className="text-xs font-normal" style={{ color: "var(--text2)" }}>
              /{totalVisible}
            </span>
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text2)" }}>
            Beoordeeld
          </p>
        </div>

        <div
          className="ks-slide-up flex-none rounded-xl p-3 min-w-[96px]"
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            animationDelay: "160ms",
          }}
        >
          <p className="text-xl font-bold tabular-nums leading-none" style={{ color: "var(--accent)" }}>
            {customKinkCount}
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text2)" }}>
            Eigen kinks
          </p>
        </div>

        <div
          className="ks-slide-up flex-none rounded-xl p-3 min-w-[108px]"
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            animationDelay: "240ms",
          }}
        >
          <p
            className="text-sm font-bold truncate max-w-[88px] leading-none"
            style={{ color: "var(--accent)" }}
            title={topCategoryHasRatings ? topCategory : "—"}
          >
            {topCategoryHasRatings ? topCategory : "—"}
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text2)" }}>
            Meest actief
          </p>
        </div>
      </div>

      {/* QR share CTA */}
      <button
        onClick={onShare}
        className="focus-ring w-full rounded-xl py-3 text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ background: "var(--accent)", color: "#000" }}
      >
        ↗ Deel profiel via QR
      </button>
    </section>
  );
}
