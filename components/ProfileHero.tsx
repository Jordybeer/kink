"use client";
import { useRef, useState } from "react";
import { ArrowSquareOut, CameraPlus, Lock, PencilSimple, ArrowsClockwise, ShareNetwork, Trash } from "@phosphor-icons/react";
import ContextMenu from "@/components/ui/ContextMenu";
import type { Profile } from "@/types";
import { resizeImage } from "@/lib/imageUtils";
import { avatarStyle } from "@/lib/avatar";
import type { ProfileType } from "@/lib/profileType";

interface ProfileHeroProps {
  profile: Profile;
  onShare?: () => void;
  onEdit?: () => void;
  onAvatarChange?: (dataUrl: string | undefined) => void;
  onError?: (message: string) => void;
  profileType?: ProfileType;
}

export default function ProfileHero({ profile, onShare, onEdit, onAvatarChange, onError, profileType }: ProfileHeroProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  return (
    <section className="ks-fade-in mx-4 px-4 pt-6 pb-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex-none">
          <ContextMenu
            open={menuOpen && !!onAvatarChange}
            onClose={() => setMenuOpen(false)}
            align="left"
            items={profile.avatarDataUrl ? [
              { label: "Foto bijwerken", icon: <ArrowsClockwise size={14} />, onClick: () => fileInputRef.current?.click() },
              { label: "Foto verwijderen", icon: <Trash size={14} />, danger: true, onClick: () => onAvatarChange?.(undefined) },
            ] : [
              { label: "Upload foto", icon: <CameraPlus size={14} />, onClick: () => fileInputRef.current?.click() },
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
                  className="w-full h-full flex items-center justify-center text-2xl italic"
                  style={avatarStyle(profile.name)}
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

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <h2
            className="truncate"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: "2rem",
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
              color: "var(--text)",
            }}
          >
            {profile.name}
          </h2>
          <p className="text-xs mt-1 leading-snug flex items-center gap-1 flex-wrap" style={{ color: "var(--text2)" }}>
            {profile.role && <span style={{ color: "var(--text)", fontWeight: 500 }}>{profile.role}</span>}
            {profile.role && <span aria-hidden="true">·</span>}
            <span>{expLevel}</span>
            {profile.relationshipStatus && <><span aria-hidden="true">·</span><span>{profile.relationshipStatus}</span></>}
            {profileType === "partner" && <Lock size={10} aria-hidden="true" style={{ flexShrink: 0 }} />}
          </p>
          {profileType === "partner" && profile.lockedAt && (
            <span
              className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full"
              style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
            >
              Geïmporteerd {new Date(profile.lockedAt).toLocaleDateString("nl-NL", { month: "short", year: "numeric" })}
            </span>
          )}
          {profile.privateNote && (
            <p
              className="text-xs italic mt-2 leading-snug"
              style={{ color: "var(--text2)" }}
            >
              {profile.privateNote.length > 120
                ? profile.privateNote.slice(0, 120) + "…"
                : profile.privateNote}
            </p>
          )}
          {profile.fetLifeUsername && (
            <a
              href={`https://fetlife.com/${encodeURIComponent(profile.fetLifeUsername)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                color: "var(--accent)",
                border: "1px solid var(--border-accent)",
                background: "color-mix(in srgb, var(--accent) 8%, transparent)",
              }}
            >
              FetLife
              <ArrowSquareOut size={11} aria-hidden="true" />
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-none">
          {onShare && (
            <button
              onClick={onShare}
              aria-label="Profiel delen"
              title="Delen"
              className="ks-icon-pop focus-ring flex items-center justify-center rounded-full transition-colors"
              style={{
                minWidth: 44,
                minHeight: 44,
                color: "var(--accent)",
                background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                border: "1px solid var(--border-accent)",
              }}
            >
              <ShareNetwork size={18} aria-hidden="true" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              aria-label="Profiel bewerken"
              title="Bewerken"
              className="ks-icon-pop focus-ring flex items-center justify-center rounded-full transition-colors"
              style={{
                minWidth: 44,
                minHeight: 44,
                color: "var(--text2)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
              }}
            >
              <PencilSimple size={16} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
