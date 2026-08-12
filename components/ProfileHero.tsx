"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowSquareOut,
  ArrowsClockwise,
  ArrowsOutSimple,
  CameraPlus,
  Export,
  FileText,
  Lock,
  PencilSimple,
  ShareNetwork,
  Trash,
} from "@phosphor-icons/react";
import ContextMenu from "@/components/ui/ContextMenu";
import Sheet, { SheetContent } from "@/components/Sheet";
import FetLifeMark from "@/components/brand/FetLifeMark";
import { useTopNavActions, type TopNavAction } from "@/components/nav/TopNavContext";
import type { Profile } from "@/types";
import { resizeImage } from "@/lib/imageUtils";
import { avatarStyle } from "@/lib/avatar";
import type { ProfileType } from "@/lib/profileType";
import ProfileTrust from "@/components/ProfileTrust";
import { useStore } from "@/lib/store";
import { useContractStore } from "@/lib/contractStore";
import { countCurrentContractsForProfile } from "@/lib/contractLifecycle";

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
  const shareRef = useRef(onShare);
  const editRef = useRef(onEdit);
  shareRef.current = onShare;
  editRef.current = onEdit;
  const [menuOpen, setMenuOpen] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [useIosShareGlyph, setUseIosShareGlyph] = useState(false);
  const allProfiles = useStore((state) => state.profiles);
  const contractSeries = useContractStore((state) => state.series);
  const contractCount = countCurrentContractsForProfile(contractSeries, profile, allProfiles);
  const contractPersonId = profile.personGroupId ?? profile.id;
  const canShare = Boolean(onShare);
  const canEdit = Boolean(onEdit);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const iosDevice = /iPhone|iPad|iPod/i.test(userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setUseIosShareGlyph(iosDevice);
  }, []);

  const navActions = useMemo<TopNavAction[]>(() => {
    const next: TopNavAction[] = [];
    if (canShare) {
      next.push({
        id: "share-profile",
        label: "Profiel delen",
        icon: useIosShareGlyph
          ? <Export size={18} weight="regular" aria-hidden="true" />
          : <ShareNetwork size={18} weight="regular" aria-hidden="true" />,
        onClick: () => shareRef.current?.(),
        placement: "primary",
      });
    }
    if (canEdit) {
      next.push({
        id: "edit-profile",
        label: "Profiel bewerken",
        icon: <PencilSimple size={17} weight="regular" aria-hidden="true" />,
        onClick: () => editRef.current?.(),
        placement: "secondary",
      });
    }
    return next;
  }, [canEdit, canShare, useIosShareGlyph]);
  useTopNavActions(navActions);

  const expLevel = profile.experienceLevel ?? "beginner";
  const initial = profile.name.charAt(0).toUpperCase();
  const avatarMenuItems = profile.avatarDataUrl
    ? [
        {
          label: "Foto bekijken",
          icon: <ArrowsOutSimple size={14} weight="regular" aria-hidden="true" />,
          onClick: () => setPhotoViewerOpen(true),
        },
        ...(onAvatarChange
          ? [
              {
                label: "Foto bijwerken",
                icon: <ArrowsClockwise size={14} weight="regular" aria-hidden="true" />,
                onClick: () => fileInputRef.current?.click(),
              },
              {
                label: "Foto verwijderen",
                icon: <Trash size={14} weight="regular" aria-hidden="true" />,
                danger: true,
                onClick: () => onAvatarChange(undefined),
              },
            ]
          : []),
      ]
    : onAvatarChange
      ? [
          {
            label: "Upload foto",
            icon: <CameraPlus size={14} weight="regular" aria-hidden="true" />,
            onClick: () => fileInputRef.current?.click(),
          },
        ]
      : [];

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
    <>
      <section
        className="ks-fade-in relative mx-4 px-3 pb-2.5 pt-3"
        style={{ zIndex: menuOpen ? 30 : undefined }}
      >
        <div className="flex items-start gap-3">
          <div className="relative flex-none">
            <ContextMenu
              open={menuOpen && avatarMenuItems.length > 0}
              onClose={() => setMenuOpen(false)}
              align="left"
              items={avatarMenuItems}
            >
              <button
                type="button"
                data-tour="avatar"
                onClick={() => {
                  if (profile.avatarDataUrl) {
                    setMenuOpen(true);
                  } else if (onAvatarChange) {
                    fileInputRef.current?.click();
                  }
                }}
                disabled={!profile.avatarDataUrl && !onAvatarChange}
                className="ks-icon-pop focus-ring relative h-12 w-12 overflow-hidden rounded-full disabled:cursor-default"
                aria-label={profile.avatarDataUrl ? "Profielfoto-opties" : "Profielfoto uploaden"}
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
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5" aria-label="Profielinformatie">
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

          {profileType === "partner" && contractCount > 0 && (
            <Link
              href={`/contracts?person=${encodeURIComponent(contractPersonId)}`}
              prefetch={false}
              aria-label={`${contractCount} ${contractCount === 1 ? "contract" : "contracten"} met ${profile.name}`}
              className="focus-ring inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-normal"
              style={{
                color: "var(--text2)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
              }}
            >
              <FileText size={13} weight="regular" aria-hidden="true" />
              Contracten · {contractCount}
            </Link>
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
                style={{ color: "#fff", background: "#c62838", border: "1px solid #000" }}
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
        `}</style>
      </section>

      <Sheet
        open={photoViewerOpen && Boolean(profile.avatarDataUrl)}
        onClose={() => setPhotoViewerOpen(false)}
        aria-label={`Profielfoto van ${profile.name}`}
      >
        <SheetContent
          showHandle={false}
          className="max-h-[calc(100dvh-env(safe-area-inset-top))] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4"
        >
          <h2 className="mb-3 px-1 text-base font-medium">Profielfoto</h2>
          <div
            className="flex min-h-[54dvh] max-h-[72dvh] items-center justify-center overflow-hidden rounded-xl"
            style={{ background: "var(--bg)" }}
          >
            {profile.avatarDataUrl && (
              <img
                src={profile.avatarDataUrl}
                alt={`Profielfoto van ${profile.name}`}
                className="max-h-[72dvh] max-w-full select-none object-contain"
                draggable={false}
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => setPhotoViewerOpen(false)}
            className="focus-ring mt-3 min-h-11 w-full rounded-xl text-sm font-medium"
            style={{ color: "var(--text)", background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            Sluit
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}
