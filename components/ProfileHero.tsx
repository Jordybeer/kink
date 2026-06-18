"use client";
import { useRef } from "react";
import { Lock, Pencil, QrCode, X } from "lucide-react";
import type { Profile } from "@/types";
import { CATEGORIES, getKinksByCategoryAndLevel } from "@/lib/kinks";
import { resizeImage } from "@/lib/imageUtils";
import type { ProfileType } from "@/lib/profileType";
import { formatProfileMetadata } from "@/lib/profileMetadata";

interface ProfileHeroProps {
  profile: Profile;
  maxLevel: number;
  onShare?: () => void;
  onEdit?: () => void;
  onViewKinks?: () => void;
  onAvatarChange?: (dataUrl: string | undefined) => void;
  onError?: (message: string) => void;
  profileType?: ProfileType;
}

const STATUSES = ["willing", "yes", "maybe", "no", "hard_no"] as const;
type Status = typeof STATUSES[number];

const DNA_COLORS: Record<Status, string> = {
  willing: "var(--willing)",
  yes:     "var(--yes)",
  maybe:   "var(--maybe)",
  no:      "var(--no)",
  hard_no: "var(--hard-no)",
};

const DNA_ICONS: Record<Status, string> = {
  willing: "↗",
  yes:     "✓",
  maybe:   "♡",
  no:      "✕",
  hard_no: "✕✕",
};

const DOMINANT_LABEL: Record<Status, string> = {
  yes:     "wil heel graag",
  willing: "is bereid",
  maybe:   "twijfelt",
  no:      "liever niet",
  hard_no: "sluit uit",
};

export default function ProfileHero({ profile, maxLevel, onShare, onEdit, onViewKinks, onAvatarChange, onError, profileType }: ProfileHeroProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const customKinkCount = (profile.customKinks ?? []).length;

  const topCategory = CATEGORIES.reduce((best, cat) => {
    const count = getKinksByCategoryAndLevel(cat, maxLevel).filter((k) => profile.entries[k.id]?.status).length;
    const bestCount = getKinksByCategoryAndLevel(best, maxLevel).filter((k) => profile.entries[k.id]?.status).length;
    return count > bestCount ? cat : best;
  }, CATEGORIES[0]);
  const topCategoryHasRatings = getKinksByCategoryAndLevel(topCategory, maxLevel).some(
    (k) => profile.entries[k.id]?.status
  );

  const createdAtDate = profile.createdAt ? new Date(profile.createdAt) : null;
  const memberSince = createdAtDate && !isNaN(createdAtDate.getTime())
    ? createdAtDate.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const initial = profile.name.charAt(0).toUpperCase();

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      onAvatarChange?.(dataUrl);
    } catch (err) {
      console.error("Avatar upload failed:", err);
      onError?.("Afbeelding kon niet worden verwerkt. Probeer een andere afbeelding.");
    }
    e.target.value = "";
  }

  return (
    <section className="ks-card ks-fade-in overflow-hidden rounded-2xl mx-4 px-4 pt-5 pb-5">

      {/* Identity row */}
      <div className="flex items-end gap-4 mb-5">
        {/* Avatar with upload */}
        <div className="relative flex-none">
          <button
            type="button"
            data-tour="avatar"
            onClick={() => fileInputRef.current?.click()}
            className="ks-icon-pop w-16 h-16 rounded-full overflow-hidden focus-ring relative"
            aria-label="Profielfoto wijzigen"
          >
            {profile.avatarDataUrl ? (
              <img src={profile.avatarDataUrl} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-2xl font-bold text-black"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
              >
                {initial}
              </div>
            )}
          </button>
          {profile.avatarDataUrl && (
            <button
              type="button"
              onClick={() => onAvatarChange?.(undefined)}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-[10px] focus-ring border-2 border-[var(--bg)]"
              style={{ background: "var(--hard-no)", color: "var(--text)" }}
              aria-label="Profielfoto verwijderen"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="absolute w-px h-px overflow-hidden opacity-0 pointer-events-none"
            onChange={handleAvatarUpload}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-2xl font-bold truncate flex-1">
              <span style={{ color: "var(--text)" }}>{profile.name}</span>
              {profileType === "partner" && <Lock size={16} aria-hidden="true" style={{ display: "inline-block", marginLeft: "0.5em", color: "var(--text2)" }} />}
              {profile.role && (
                <>
                  <span style={{ color: "var(--text2)", margin: "0 0.3em", fontWeight: 400 }}>—</span>
                  <span style={{ color: "var(--text2)", fontWeight: 500, fontStyle: "italic" }}>
                    {profile.role}
                  </span>
                </>
              )}
            </h2>
            {onEdit && (
              <button
                onClick={onEdit}
                aria-label="Profiel bewerken"
                title="Bewerken"
                className="focus-ring flex-none w-10 h-10 flex items-center justify-center rounded-md transition-colors"
                style={{ color: "var(--text2)", border: "1px solid var(--border)" }}
              >
                <Pencil size={16} />
              </button>
            )}
          </div>

          {/* DNA bar — promoted above pills */}
          <div className="mt-5 mb-4">
            {dnaSegments.length === 0 ? (
              <>
                <div
                  className="h-0.5 rounded-full w-full"
                  style={{ background: "var(--border)" }}
                  aria-label="Nog geen keuzes gemaakt"
                  role="img"
                />
                <button
                  onClick={onViewKinks}
                  className="text-xs italic mt-2 block focus-ring rounded text-left px-2 py-1"
                  style={{ color: "var(--text2)", background: "transparent", border: "none", cursor: "pointer" }}
                >
                  Nog niets beoordeeld — start met de eerste categorie
                </button>
              </>
            ) : (
              <>
                <div
                  className="h-5 rounded-full overflow-hidden flex"
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
                {totalRated > 0 && (
                  <p className="text-xs italic mt-2" style={{ color: "var(--text2)" }}>
                    {Math.round(dominantPct)}% {DOMINANT_LABEL[dominantStatus]}
                  </p>
                )}
                <details className="mt-1">
                  <summary className="text-[10px] uppercase tracking-widest cursor-pointer focus-ring rounded px-2 py-1" style={{ color: "var(--text2)" }}>
                    Verdeling
                  </summary>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
                    {(["yes", "willing", "maybe", "no", "hard_no"] as const).map((s) => (
                      <span key={s} className="text-[10px] flex items-center gap-1" style={{ color: "var(--text2)" }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-none inline-block" style={{ background: DNA_COLORS[s] }} />
                        {s === "yes" ? "Heel graag" : s === "willing" ? "Ja" : s === "maybe" ? "Misschien" : s === "no" ? "Voor hen" : "Harde grens"}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
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
                </details>
              </>
            )}
          </div>

          {/* Pills — only experience + relationship */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "var(--surface2)", color: "var(--accent)", border: "1px solid var(--border)" }}
            >
              {profile.experienceLevel ?? "beginner"}
            </span>
            {profile.relationshipStatus && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
              >
                {profile.relationshipStatus}
              </span>
            )}
          </div>
          <p className="text-xs mt-1.5" style={{ color: "var(--text2)" }}>
            {profileType === "partner" && profile.lockedAt
              ? `Geïmporteerd op ${new Date(profile.lockedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })} · `
              : memberSince
              ? `Lid sinds ${memberSince} · `
              : ""
            }
            {progressPct}% ingevuld
          </p>
          {(onShare || profile.fetLifeUsername || profile.bdsmtestUrl) && (
            <div className="text-sm mt-2" style={{ color: "var(--accent)" }}>
              {onShare && (
                <>
                  <button onClick={onShare} className="focus-ring rounded">
                    …Deel profiel
                  </button>
                  <span style={{ color: "var(--text2)" }}> · </span>
                </>
              )}
              {profile.fetLifeUsername && (
                <>
                  <a
                    href={`https://fetlife.com/${encodeURIComponent(profile.fetLifeUsername)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open FetLife profiel"
                    className="focus-ring rounded"
                  >
                    FetLife ↗
                  </a>
                  {profile.bdsmtestUrl && <span style={{ color: "var(--text2)" }}> · </span>}
                </>
              )}
              {profile.bdsmtestUrl && (
                <a
                  href={profile.bdsmtestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open BDSMTest resultaat"
                  className="focus-ring rounded"
                >
                  BDSMTest ↗
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Metadata line */}
      {totalVisible > 0 && (
        <p className="text-xs mt-3 mb-3" style={{ color: "var(--text2)" }}>
          {formatProfileMetadata({ totalRated, totalVisible, customKinkCount, topCategory, topCategoryHasRatings })}
        </p>
      )}

    </section>
  );
}
