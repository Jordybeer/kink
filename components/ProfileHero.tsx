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
        data-testid="profile-hero"
        className={`ks-fade-in relative ${embedded ? "px-1 pb-3 pt-2" : "mx-4 rounded-[24px] px-4 pb-4 pt-4"}`}
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
        <div className="flex items-start gap-4">
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
                className="ks-icon-pop focus-ring relative h-16 w-16 overflow-hidden rounded-full disabled:cursor-default"
                style={{
                  border: "1px solid color-mix(in srgb, var(--border-accent) 62%, var(--border))",
                  boxShadow: "0 5px 16px var(--deep-shadow)",
                }}
                aria-label={profile.avatarDataUrl ? "Profielfoto-opties" : "Profielfoto uploaden"}
              >
                {profile.avatarDataUrl ? (
                  <img src={profile.avatarDataUrl} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-2xl italic"
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
                fontSize: "2rem",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: "var(--text)",
              }}
            >
              {profile.name}
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm leading-snug" style={{ color: "var(--text2)" }}>
              {profile.role && <span style={{ color: "var(--text)", fontWeight: 600 }}>{profile.role}</span>}
              {profile.role && <span aria-hidden="true">·</span>}
              <span>{expLevel}</span>
              {profile.relationshipStatus && <><span aria-hidden="true">·</span><span>{profile.relationshipStatus}</span></>}
              {profileType === "partner" && <Lock size={11} weight="regular" aria-hidden="true" className="shrink-0" />}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0" aria-label="Profielinformatie">
              <ProfileTrust profile={profile} quiet />

              {canEdit && (
                <button
                  type="button"
                  data-tour="profile-enrichment"
                  onClick={() => setEnrichmentOpen(true)}
                  className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-xs font-normal transition-colors active:opacity-70"
                  style={{ color: "var(--text2)" }}
                >
                  <PencilSimple size={13} weight="regular" aria-hidden="true" />
                  Profielinfo
                </button>
              )}

              {profileType === "partner" && profile.lockedAt && (
                <span className="inline-flex min-h-8 items-center text-xs" style={{ color: "var(--text2)" }}>
                  Geïmporteerd {new Date(profile.lockedAt).toLocaleDateString("nl-NL", { month: "short", year: "numeric" })}
                </span>
              )}

              {profileType === "partner" && latestContract && (
                <Link
                  href={`/contracts/${encodeURIComponent(latestContract.id)}`}
                  prefetch={false}
                  aria-label={`Open het meest recente contract met ${profile.name}`}
                  className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-xs font-normal"
                  style={{ color: "var(--text2)" }}
                >
                  <FileText size={13} weight="regular" aria-hidden="true" />
                  Contract
                </Link>
              )}
            </div>
          </div>
        </div>

        {(profile.fetLifeUsername || profile.bdsmtestUrl) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-0" aria-label="Gekoppelde profielen">
            {profile.fetLifeUsername && (
              <a
                href={`https://fetlife.com/${encodeURIComponent(profile.fetLifeUsername)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open het FetLife-profiel van ${profile.fetLifeUsername}`}
                className="profile-fetlife-link focus-ring inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-lg px-1 text-xs font-normal underline-offset-4 transition-colors hover:underline focus-visible:underline active:opacity-70"
                style={{ color: "var(--text2)" }}
              >
                <span
                  aria-hidden="true"
                  className="profile-fetlife-mark flex h-5 w-5 flex-none items-center justify-center rounded-full"
                  style={{ color: "var(--on-danger-fill)", background: "var(--danger-fill)" }}
                >
                  <FetLifeMark className="h-[13px] w-[13px]" />
                </span>
                <span className="truncate">FetLife</span>
                <ArrowSquareOut size={10} weight="regular" style={{ color: "var(--text2)" }} aria-hidden="true" />
              </a>
            )}

            {profile.bdsmtestUrl && (
              <a
                href={profile.bdsmtestUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open het opgeslagen BDSMTest-resultaat"
                className="profile-bdsmtest-link focus-ring inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-lg px-1 text-xs font-normal underline-offset-4 transition-colors hover:underline focus-visible:underline active:opacity-70"
                style={{ color: "var(--text2)" }}
              >
                <span
                  aria-hidden="true"
                  className="flex h-5 w-5 flex-none items-center justify-center rounded-full"
                  style={{ color: "var(--on-accent-fill)", background: "var(--accent-fill)" }}
                >
                  <BdsmtestMark className="h-[14px] w-[14px]" />
                </span>
                <span className="truncate">BDSMTest</span>
                <ArrowSquareOut size={10} weight="regular" style={{ color: "var(--text2)" }} aria-hidden="true" />
              </a>
            )}
          </div>
        )}

        {profile.privateNote && (
          <p className="mt-1 text-sm italic leading-snug" style={{ color: "var(--text2)" }}>
            {profile.privateNote.length > 120
              ? profile.privateNote.slice(0, 120) + "…"
              : profile.privateNote}
          </p>
        )}
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
