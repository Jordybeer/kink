"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowSquareOut,
  ArrowsClockwise,
  ArrowsOutSimple,
  CameraPlus,
  FileText,
  Lock,
  PencilSimple,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import ContextMenu from "@/components/ui/ContextMenu";
import PlatformShareIcon from "@/components/ui/PlatformShareIcon";
import Sheet, { SheetContent } from "@/components/Sheet";
import FetLifeMark from "@/components/brand/FetLifeMark";
import BdsmtestMark from "@/components/brand/BdsmtestMark";
import ProfileEnrichmentModal from "@/components/profile/ProfileEnrichmentModal";
import { useTopNavActions, type TopNavAction } from "@/components/nav/TopNavContext";
import type { Profile } from "@/types";
import { resizeImage } from "@/lib/imageUtils";
import { avatarStyle } from "@/lib/avatar";
import type { ProfileType } from "@/lib/profileType";
import ProfileTrust from "@/components/ProfileTrust";
import { useContractStore } from "@/lib/contractStore";
import { mostRecentReadableContractForProfile } from "@/lib/contractLifecycle";
import { useLegacyContractMigration } from "@/hooks/useLegacyContractMigration";

interface ProfileHeroProps {
  profile: Profile;
  onShare?: () => void;
  onEdit?: () => void;
  onAvatarChange?: (dataUrl: string | undefined) => void;
  onError?: (message: string) => void;
  profileType?: ProfileType;
  embedded?: boolean;
}

export default function ProfileHero({ profile, onShare, onEdit, onAvatarChange, onError, profileType, embedded = false }: ProfileHeroProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shareRef = useRef(onShare);
  const editRef = useRef(onEdit);

  useLayoutEffect(() => {
    shareRef.current = onShare;
    editRef.current = onEdit;
  }, [onEdit, onShare]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [enrichmentOpen, setEnrichmentOpen] = useState(false);
  useLegacyContractMigration();
  const contractSeries = useContractStore((state) => state.series);
  const latestContract = mostRecentReadableContractForProfile(contractSeries, profile);
  const canShare = Boolean(onShare);
  const canEdit = Boolean(onEdit);

  const navActions = useMemo<TopNavAction[]>(() => {
    const next: TopNavAction[] = [];
    if (canShare) {
      next.push({
        id: "share-profile",
        label: "Profiel delen",
        icon: <PlatformShareIcon size={18} weight="regular" aria-hidden="true" />,
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
  }, [canEdit, canShare]);
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
        className={`ks-fade-in relative px-4 pb-4 pt-4 ${embedded ? "" : "mx-4 rounded-[24px]"}`}
        style={{
          zIndex: menuOpen ? 30 : undefined,
          ...(embedded
            ? {}
            : {
                background:
                  "linear-gradient(145deg, color-mix(in srgb, var(--accent) 6%, var(--surface2)), color-mix(in srgb, var(--surface) 90%, var(--surface2)))",
                border: "1px solid color-mix(in srgb, var(--border-accent) 62%, var(--border))",
                boxShadow: "0 14px 34px color-mix(in srgb, var(--bg) 35%, transparent)",
              }),
        }}
      >
        <div className="flex items-start gap-3.5">
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
                className="ks-icon-pop focus-ring relative h-14 w-14 overflow-hidden rounded-full disabled:cursor-default"
                aria-label={profile.avatarDataUrl ? "Profielfoto-opties" : "Profielfoto uploaden"}
              >
                {profile.avatarDataUrl ? (
                  <img src={profile.avatarDataUrl} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-xl italic"
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
                fontSize: "1.65rem",
                lineHeight: 1.05,
                letterSpacing: "-0.015em",
                color: "var(--text)",
              }}
            >
              {profile.name}
            </h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-1 text-sm leading-snug" style={{ color: "var(--text2)" }}>
              {profile.role && <span style={{ color: "var(--text)", fontWeight: 500 }}>{profile.role}</span>}
              {profile.role && <span aria-hidden="true">·</span>}
              <span>{expLevel}</span>
              {profile.relationshipStatus && <><span aria-hidden="true">·</span><span>{profile.relationshipStatus}</span></>}
              {profileType === "partner" && <Lock size={11} weight="regular" aria-hidden="true" className="shrink-0" />}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Profielinformatie">
          <ProfileTrust profile={profile} />

          {canEdit && (
            <button
              type="button"
              data-tour="profile-enrichment"
              onClick={() => setEnrichmentOpen(true)}
              className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition-colors active:opacity-70"
              style={{
                color: "var(--accent-text)",
                background: "color-mix(in srgb, var(--accent) 8%, var(--surface2))",
                border: "1px solid var(--border-accent)",
              }}
            >
              <Sparkle size={14} weight="duotone" aria-hidden="true" />
              Profielinfo aanvullen
            </button>
          )}

          {profileType === "partner" && profile.lockedAt && (
            <span
              className="inline-flex min-h-8 items-center rounded-full px-2.5 text-xs font-normal"
              style={{
                color: "var(--text2)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
              }}
            >
              Geïmporteerd {new Date(profile.lockedAt).toLocaleDateString("nl-NL", { month: "short", year: "numeric" })}
            </span>
          )}

          {profileType === "partner" && latestContract && (
            <Link
              href={`/contracts/${encodeURIComponent(latestContract.id)}`}
              prefetch={false}
              aria-label={`Open het meest recente contract met ${profile.name}`}
              className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-xs font-normal"
              style={{
                color: "var(--text2)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
              }}
            >
              <FileText size={13} weight="regular" aria-hidden="true" />
              Contract
            </Link>
          )}
        </div>

        {(profile.fetLifeUsername || profile.bdsmtestUrl) && (
          <div
            className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-1.5 border-t pt-2"
            style={{ borderColor: "var(--border)" }}
            aria-label="Gekoppelde profielen"
          >
            {profile.fetLifeUsername && (
              <a
                href={`https://fetlife.com/${encodeURIComponent(profile.fetLifeUsername)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open het FetLife-profiel van ${profile.fetLifeUsername}`}
                className="profile-fetlife-link focus-ring inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-lg px-2 text-sm font-normal underline-offset-4 transition-colors hover:underline focus-visible:underline active:opacity-70"
                style={{ color: "var(--text2)", border: "1px solid transparent" }}
              >
                <span
                  aria-hidden="true"
                  className="profile-fetlife-mark flex h-6 w-6 flex-none items-center justify-center rounded-full"
                  style={{
                    color: "var(--on-danger-fill)",
                    background: "var(--danger-fill)",
                    border: "1px solid color-mix(in srgb, var(--danger-fill) 72%, var(--text))",
                  }}
                >
                  <FetLifeMark className="h-[15px] w-[15px]" />
                </span>
                <span className="truncate">FetLife</span>
                <ArrowSquareOut size={11} weight="regular" style={{ color: "var(--text2)" }} aria-hidden="true" />
              </a>
            )}

            {profile.bdsmtestUrl && (
              <a
                href={profile.bdsmtestUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open het opgeslagen BDSMTest-resultaat"
                className="profile-bdsmtest-link focus-ring inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-lg px-2 text-sm font-normal underline-offset-4 transition-colors hover:underline focus-visible:underline active:opacity-70"
                style={{ color: "var(--text2)", border: "1px solid transparent" }}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full"
                  style={{
                    color: "var(--on-accent-fill)",
                    background: "var(--accent-fill)",
                    border: "1px solid var(--border-accent)",
                  }}
                >
                  <BdsmtestMark className="h-[16px] w-[16px]" />
                </span>
                <span className="truncate">BDSMTest</span>
                <ArrowSquareOut size={11} weight="regular" style={{ color: "var(--text2)" }} aria-hidden="true" />
              </a>
            )}
          </div>
        )}

        {profile.privateNote && (
          <p
            className="mt-3 border-t pt-3 text-sm italic leading-snug"
            style={{ color: "var(--text2)", borderColor: "var(--border)" }}
          >
            {profile.privateNote.length > 120
              ? profile.privateNote.slice(0, 120) + "…"
              : profile.privateNote}
          </p>
        )}

        <style jsx>{`
          .profile-fetlife-link:hover,
          .profile-fetlife-link:focus-visible,
          .profile-bdsmtest-link:hover,
          .profile-bdsmtest-link:focus-visible {
            border-color: color-mix(in srgb, var(--text2) 45%, var(--border));
          }
        `}</style>
      </section>

      {canEdit && (
        <ProfileEnrichmentModal
          open={enrichmentOpen}
          profile={profile}
          onClose={() => setEnrichmentOpen(false)}
        />
      )}

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
