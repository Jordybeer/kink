"use client";
import { useRef, useState } from "react";
import { ArrowSquareOut, CameraPlus, Lock, PencilSimple, ArrowsClockwise, ShareNetwork, Trash } from "@phosphor-icons/react";
import ContextMenu from "@/components/ui/ContextMenu";
import type { Profile } from "@/types";
import { resizeImage } from "@/lib/imageUtils";
import { avatarStyle } from "@/lib/avatar";
import type { ProfileType } from "@/lib/profileType";
import ProfileTrust from "@/components/ProfileTrust";

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
  const hasActions = Boolean(onShare || profile.fetLifeUsername);

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
    <section className="ks-fade-in mx-4 px-3 pt-3 pb-3.5">
      <div className="flex items-start gap-3">
        <div className="relative flex-none">
          <ContextMenu
            open={menuOpen && !!onAvatarChange}
            onClose={() => setMenuOpen(false)}
            align="left"
            items={profile.avatarDataUrl ? [
              { label: "Foto bijwerken", icon: <ArrowsClockwise size={14} aria-hidden="true" />, onClick: () => fileInputRef.current?.click() },
              { label: "Foto verwijderen", icon: <Trash size={14} aria-hidden="true" />, danger: true, onClick: () => onAvatarChange?.(undefined) },
            ] : [
              { label: "Upload foto", icon: <CameraPlus size={14} aria-hidden="true" />, onClick: () => fileInputRef.current?.click() },
            ]}
          >
            <button
              type="button"
              data-tour="avatar"
              onClick={() => onAvatarChange && (profile.avatarDataUrl ? setMenuOpen(true) : fileInputRef.current?.click())}
              className="ks-icon-pop focus-ring relative h-12 w-12 overflow-hidden rounded-full"
              aria-label="Profielfoto wijzigen"
            >
              {profile.avatarDataUrl ? (
                <img src={profile.avatarDataUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-lg italic"
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
            className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
            onChange={handleAvatarUpload}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <h2
            className="serif-safe truncate"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: "1.5rem",
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              color: "var(--text)",
            }}
          >
            {profile.name}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-1 text-xs leading-snug" style={{ color: "var(--text2)" }}>
            {profile.role && <span style={{ color: "var(--text)", fontWeight: 500 }}>{profile.role}</span>}
            {profile.role && <span aria-hidden="true">·</span>}
            <span>{expLevel}</span>
            {profile.relationshipStatus && <><span aria-hidden="true">·</span><span>{profile.relationshipStatus}</span></>}
            {profileType === "partner" && <Lock size={10} aria-hidden="true" className="shrink-0" />}
          </p>
        </div>

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Profiel bewerken"
            title="Bewerken"
            className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-xl transition-opacity active:opacity-70"
            style={{ color: "var(--text2)", background: "transparent", border: "none" }}
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-[10px]"
              style={{ background: "color-mix(in srgb, var(--surface2) 82%, transparent)" }}
            >
              <PencilSimple size={15} aria-hidden="true" />
            </span>
          </button>
        )}
      </div>

      <div className="mt-2.5 flex flex-col gap-1.5 min-[520px]:flex-row min-[520px]:items-center min-[520px]:gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1" aria-label="Profielinformatie">
          <ProfileTrust profile={profile} />

          {profileType === "partner" && profile.lockedAt && (
            <span className="inline-flex min-h-7 items-center text-[11px]" style={{ color: "var(--text2)" }}>
              Geïmporteerd {new Date(profile.lockedAt).toLocaleDateString("nl-NL", { month: "short", year: "numeric" })}
            </span>
          )}
        </div>

        {hasActions && (
          <div className="flex min-w-0 flex-wrap items-center gap-2.5 min-[520px]:ml-auto min-[520px]:flex-nowrap" aria-label="Profielacties">
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                aria-label="Profiel delen"
                className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1.5 text-[13px] font-medium transition-opacity active:opacity-70"
                style={{ color: "var(--text)", background: "transparent", border: "none" }}
              >
                <ShareNetwork size={16} style={{ color: "var(--accent)" }} aria-hidden="true" />
                <span>Delen</span>
              </button>
            )}

            {profile.fetLifeUsername && (
              <a
                href={`https://fetlife.com/${encodeURIComponent(profile.fetLifeUsername)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open het FetLife-profiel van ${profile.fetLifeUsername}`}
                className="profile-fetlife-link focus-ring group inline-flex min-h-11 items-center gap-2 rounded-xl px-0.5 pr-1.5 text-[13px] font-medium underline-offset-4 transition-opacity hover:underline focus-visible:underline active:opacity-70"
                style={{ color: "var(--text)" }}
              >
                <span
                  aria-hidden="true"
                  className="profile-fetlife-circle flex h-8 w-8 flex-none items-center justify-center rounded-full transition-colors"
                  style={{
                    color: "var(--accent)",
                    background: "var(--surface2)",
                    border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                  }}
                >
                  <svg
                    data-brand-icon="fetlife"
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                    preserveAspectRatio="xMidYMid meet"
                    aria-hidden="true"
                    focusable="false"
                    className="block max-h-[60%] max-w-[60%]"
                  >
                    <path fill="currentColor" d="M7 4h10v3H10v3.5h6v3h-6V20H7V4Z" />
                  </svg>
                </span>
                <span>FetLife</span>
                <ArrowSquareOut size={12} style={{ color: "var(--text2)" }} aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </div>

      {profile.privateNote && (
        <p className="mt-2.5 text-xs italic leading-snug" style={{ color: "var(--text2)" }}>
          {profile.privateNote.length > 120
            ? profile.privateNote.slice(0, 120) + "…"
            : profile.privateNote}
        </p>
      )}

      <style jsx>{`
        .profile-fetlife-link:hover .profile-fetlife-circle,
        .profile-fetlife-link:focus-visible .profile-fetlife-circle,
        .profile-fetlife-link:active .profile-fetlife-circle {
          background: color-mix(in srgb, var(--accent) 9%, var(--surface2));
        }
      `}</style>
    </section>
  );
}
