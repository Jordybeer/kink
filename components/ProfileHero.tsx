"use client";
import { useRef, useState } from "react";
import { ImagePlus, Lock, Pencil, RefreshCw, Share2, Trash2 } from "lucide-react";
import ContextMenu from "@/components/ui/ContextMenu";
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

const DOMINANT_LABEL: Record<Status, string> = {
  yes:     "wil heel graag",
  willing: "is bereid",
  maybe:   "twijfelt",
  no:      "liever niet",
  hard_no: "sluit uit",
};

export default function ProfileHero({ profile, maxLevel, onShare, onEdit, onViewKinks, onAvatarChange, onError, profileType }: ProfileHeroProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const customKinkCount = (profile.customKinks ?? []).length;

  const topCategory = CATEGORIES.reduce((best, cat) => {
    const count = getKinksByCategoryAndLevel(cat, maxLevel).filter((k) => profile.entries[k.id]?.status).length;
    const bestCount = getKinksByCategoryAndLevel(best, maxLevel).filter((k) => profile.entries[k.id]?.status).length;
    return count > bestCount ? cat : best;
  }, CATEGORIES[0]);
  const topCategoryHasRatings = getKinksByCategoryAndLevel(topCategory, maxLevel).some(
    (k) => profile.entries[k.id]?.status
  );

  const expLevel = profile.experienceLevel ?? "beginner";
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

  const distributionLabel = dnaSegments
    .map((s) => `${s.count} ${DOMINANT_LABEL[s.status]}`)
    .join(", ");

  return (
    <section className="ks-card ks-fade-in overflow-hidden rounded-2xl mx-4 px-4 pt-5 pb-5">
      {/* Header: avatar + identity + actions */}
      <div className="flex items-start gap-3 mb-4">
        <div className="relative flex-none">
          <ContextMenu
            open={menuOpen && !!onAvatarChange}
            onClose={() => setMenuOpen(false)}
            align="left"
            items={profile.avatarDataUrl ? [
              { label: "Foto bijwerken", icon: <RefreshCw size={14} />, onClick: () => fileInputRef.current?.click() },
              { label: "Foto verwijderen", icon: <Trash2 size={14} />, danger: true, onClick: () => onAvatarChange?.(undefined) },
            ] : [
              { label: "Upload foto", icon: <ImagePlus size={14} />, onClick: () => fileInputRef.current?.click() },
            ]}
          >
            <button
              type="button"
              data-tour="avatar"
              onClick={() => onAvatarChange && (profile.avatarDataUrl ? setMenuOpen(true) : fileInputRef.current?.click())}
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
          </ContextMenu>
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
          <h2 className="text-xl font-bold truncate" style={{ color: "var(--text)" }}>
            {profile.name}
            {profileType === "partner" && (
              <Lock size={14} aria-hidden="true" style={{ display: "inline-block", marginLeft: "0.4em", color: "var(--text2)" }} />
            )}
          </h2>
          <p className="text-sm mt-0.5 leading-snug" style={{ color: "var(--text2)" }}>
            {profile.role && <>{profile.role}{" · "}</>}
            <span style={{ color: "var(--accent)" }}>{expLevel}</span>
            {profile.relationshipStatus && <>{" · "}{profile.relationshipStatus}</>}
          </p>
          {profileType === "partner" && profile.lockedAt && (
            <span
              className="inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
            >
              Geïmporteerd {new Date(profile.lockedAt).toLocaleDateString("nl-NL", { month: "short", year: "numeric" })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-none">
          {onShare && (
            <button
              onClick={onShare}
              aria-label="Profiel delen"
              title="Delen"
              className="focus-ring flex items-center justify-center rounded-md transition-colors"
              style={{ minWidth: 44, minHeight: 44, color: "var(--accent)" }}
            >
              <Share2 size={18} aria-hidden="true" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              aria-label="Profiel bewerken"
              title="Bewerken"
              className="focus-ring flex items-center justify-center rounded-md transition-colors"
              style={{ minWidth: 44, minHeight: 44, color: "var(--text2)", border: "1px solid var(--border)" }}
            >
              <Pencil size={16} />
            </button>
          )}
        </div>
      </div>

      {/* DNA section */}
      {dnaSegments.length === 0 ? (
        <div className="mb-3">
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
        </div>
      ) : (
        <div className="mb-3">
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-3 rounded-full overflow-hidden flex"
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
            <span className="text-sm font-semibold tabular-nums flex-none" style={{ color: "var(--text)" }}>
              {progressPct}%
            </span>
          </div>
          <p className="text-xs italic mt-2" style={{ color: "var(--text2)" }}>
            {totalRated} van {totalVisible} beoordeeld · {DOMINANT_LABEL[dominantStatus]}
          </p>
          <div
            className="flex items-center gap-3 mt-1.5 flex-wrap"
            role="img"
            aria-label={distributionLabel}
          >
            {dnaSegments.map((seg) => (
              <span
                key={seg.status}
                className="text-xs flex items-center gap-1 tabular-nums"
                style={{ color: DNA_COLORS[seg.status] }}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block flex-none"
                  style={{ background: DNA_COLORS[seg.status] }}
                  aria-hidden="true"
                />
                {seg.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metadata + external links */}
      {totalVisible > 0 && (
        <p className="text-xs" style={{ color: "var(--text2)" }}>
          {formatProfileMetadata({ totalRated, totalVisible, customKinkCount, topCategory, topCategoryHasRatings })}
        </p>
      )}
      {(profile.fetLifeUsername || profile.bdsmtestUrl) && (
        <div className="text-sm mt-2" style={{ color: "var(--accent)" }}>
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
    </section>
  );
}
