"use client";

import { useRef, useState } from "react";
import {
  ArrowSquareOut,
  ArrowsClockwise,
  CameraPlus,
  Lock,
  PencilSimple,
  ShareNetwork,
  Trash,
} from "@phosphor-icons/react";
import ContextMenu from "@/components/ui/ContextMenu";
import FetLifeMark from "@/components/brand/FetLifeMark";
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
    <section className="ks-fade-in mx-4 px-3 pb-2.5 pt-3">
      <div className="flex items-start gap-3">
        <div className="relative flex-none">
          <ContextMenu
            open={menuOpen && !!onAvatarChange}
            onClose={() => setMenuOpen(false)}
            align="left"
            items={profile.avatarDataUrl ? [
              {
                label: "Foto bijwerken",
                icon: <ArrowsClockwise size={14} weight="regular" aria-hidden="true" />,
                onClick: () => fileInputRef.current?.click(),
              },
              {
                label: "Foto verwijderen",
                icon: <Trash size={14} weight="regular" aria-hidden="true" />,
                danger: true,
                onClick: () => onAvatarChange?.(undefined),
              },
            ] : [
              {
                label: "Upload foto",
                icon: <CameraPlus size={14} weight="regular" aria-hidden="true" />,
                onClick: () => fileInputRef.current?.click(),
              },
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
            {profileType === "partner" && <Lock size={10} weight="regular" aria-hidden="true" className="shrink-0" />}
          </p>
        </div>

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Profiel bewerken"
            title="Bewerken"
            className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-xl transition-colors active:opacity-70"
            style={{ color: "var(--text2)", background: "transparent", border: "none" }}
          >
            <PencilSimple size={16} weight="regular" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5" aria-label="Profielinformatie en acties">
        <ProfileTrust profile={profile} />

        {profileType === "partner" && profile.lockedAt && (
          <span
            className="inline-flex min-h-8 items-center rounded-full px-2.5 text-[11px] font-normal"
            style={{
              color: "var(--text2)",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
            }}
          >
            Geïmporteerd {new Date(profile.lockedAt).toLocaleDateString("nl-NL", { month: "short", year: "numeric" })}
          </span>
        )}

        {hasActions && <span className="hidden min-[420px]:block min-[420px]:flex-1" aria-hidden="true" />}

        {onShare && (
          <button
            type="button"
            onClick={onShare}
            aria-label="Profiel delen"
            className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-normal transition-opacity active:opacity-65"
            style={{ color: "var(--text2)", background: "transparent", border: "none" }}
          >
            <ShareNetwork size={17} weight="regular" aria-hidden="true" />
            <span>Delen</span>
          </button>
        )}

        {profile.fetLifeUsername && (
          <a
            href={`https://fetlife.com/${encodeURIComponent(profile.fetLifeUsername)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open het FetLife-profiel van ${profile.fetLifeUsername}`}
            className="profile-fetlife-link focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-full px-1.5 pr-2.5 text-[12.5px] font-normal underline-offset-4 transition-colors hover:underline focus-visible:underline active:opacity-70"
            style={{
              color: "var(--text)",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
            }}
          >
            <span
              aria-hidden="true"
              className="profile-fetlife-mark flex h-6 w-6 flex-none items-center justify-center rounded-full"
              style={{ color: "var(--text)", background: "var(--surface3)" }}
            >
              <FetLifeMark className="h-[15px] w-[15px]" />
            </span>
            <span>FetLife</span>
            <ArrowSquareOut size={11} weight="regular" style={{ color: "var(--text2)" }} aria-hidden="true" />
          </a>
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
        .profile-fetlife-link:hover,
        .profile-fetlife-link:focus-visible {
          border-color: color-mix(in srgb, var(--text2) 45%, var(--border));
        }

        .profile-fetlife-link:hover .profile-fetlife-mark,
        .profile-fetlife-link:focus-visible .profile-fetlife-mark {
          background: color-mix(in srgb, var(--text2) 14%, var(--surface3));
        }
      `}</style>
    </section>
  );
}
