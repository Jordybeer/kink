"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowsClockwise,
  ArrowsOutSimple,
  CameraPlus,
  CaretRight,
  ChartBar,
  Compass,
  FileText,
  Lock,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import ContextMenu from "@/components/ui/ContextMenu";
import PlatformShareIcon from "@/components/ui/PlatformShareIcon";
import Sheet, { SheetContent } from "@/components/Sheet";
import FetLifeMark from "@/components/brand/FetLifeMark";
import BdsmtestScores from "@/components/BdsmtestScores";
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

export default function ProfileHero({
  profile,
  onShare,
  onEdit,
  onAvatarChange,
  onError,
  profileType,
  embedded = false,
}: ProfileHeroProps) {
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
  const hasBdsmtest = (profile.bdsmtestScores?.length ?? 0) > 0;

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
  const explorationMode = profile.questionnaireSetup?.mode === "deepDive" ? "Deep Dive" : "Dynamic";
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
      ? [{
          label: "Upload foto",
          icon: <CameraPlus size={14} weight="regular" aria-hidden="true" />,
          onClick: () => fileInputRef.current?.click(),
        }]
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
        className={`ks-fade-in relative ${hasBdsmtest ? "pb-2" : "pb-4"} pt-2 ${embedded ? "" : "mx-[var(--page-gutter)]"}`}
        style={{ zIndex: menuOpen ? 30 : undefined }}
      >
        <div className="flex items-start gap-5">
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
                  if (profile.avatarDataUrl) setMenuOpen(true);
                  else if (onAvatarChange) fileInputRef.current?.click();
                }}
                disabled={!profile.avatarDataUrl && !onAvatarChange}
                className="focus-ring relative h-[6.6rem] w-[6.6rem] overflow-hidden rounded-full disabled:cursor-default"
                style={{ border: "1px solid var(--border-accent)", background: "var(--surface2)" }}
                aria-label={profile.avatarDataUrl ? "Profielfoto-opties" : "Profielfoto uploaden"}
              >
                {profile.avatarDataUrl ? (
                  <img src={profile.avatarDataUrl} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl italic" style={avatarStyle(profile.name)}>{initial}</div>
                )}
              </button>
            </ContextMenu>
            {onAvatarChange && (
              <span
                className="pointer-events-none absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                aria-hidden="true"
              >
                <CameraPlus size={16} weight="regular" />
              </span>
            )}
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

          <div className="min-w-0 flex-1 pt-1">
            <h2
              className="serif-safe truncate text-[clamp(2rem,9vw,2.55rem)] leading-none"
              style={{
                fontFamily: "var(--font-display, Georgia, serif)",
                fontStyle: "italic",
                fontWeight: 600,
                letterSpacing: "-0.025em",
                color: "var(--text)",
              }}
            >
              {profile.name}
            </h2>
            <p className="mt-3 text-xs" style={{ color: "var(--text2)" }}>Hoofdperspectief</p>
            <p className="mt-0.5 text-sm font-semibold" style={{ color: "var(--text)" }}>{profile.role || "Niet gekozen"}</p>
            {profile.relationshipStatus && <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>{profile.relationshipStatus}</p>}
            {profileType === "partner" && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text2)" }}>
                <Lock size={12} weight="regular" aria-hidden="true" /> Gedeeld profiel
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-b pb-5" style={{ borderColor: "var(--border)" }} aria-label="Profielkenmerken">
          <div className="flex min-w-0 items-start gap-2.5 pr-3" style={{ borderRight: "1px solid var(--border)" }}>
            <ChartBar size={20} weight="regular" aria-hidden="true" style={{ color: "var(--accent)" }} />
            <div className="min-w-0">
              <p className="text-xs" style={{ color: "var(--text2)" }}>Ervaring</p>
              <p className="mt-0.5 truncate text-sm font-medium capitalize">{expLevel}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-start gap-2.5 pl-1">
            <Compass size={20} weight="regular" aria-hidden="true" style={{ color: "var(--accent2)" }} />
            <div className="min-w-0">
              <p className="text-xs" style={{ color: "var(--text2)" }}>Verkenningsmodus</p>
              <p className="mt-0.5 truncate text-sm font-medium">{explorationMode}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3" aria-label="Profielinformatie">
          <ProfileTrust profile={profile} quiet />
          {canEdit && (
            <button
              type="button"
              data-tour="profile-enrichment"
              onClick={() => setEnrichmentOpen(true)}
              className="focus-ring inline-flex min-h-11 min-w-0 items-center justify-center gap-2 text-sm font-medium active:opacity-70"
              style={{ color: "var(--text2)" }}
            >
              <PencilSimple size={16} weight="regular" aria-hidden="true" />
              <span className="truncate">Profielinfo</span>
            </button>
          )}
        </div>

        {(hasBdsmtest || profile.fetLifeUsername || (profileType === "partner" && latestContract)) && (
          <div data-testid="profile-linked-sources" className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="mb-3 text-sm font-semibold">Gekoppelde bronnen</h3>
            <div className="grid gap-2">
              {hasBdsmtest && (
                <BdsmtestScores
                  scores={profile.bdsmtestScores!}
                  url={profile.bdsmtestUrl}
                  embedded
                />
              )}

              {profile.fetLifeUsername && (
                <a
                  href={`https://fetlife.com/${encodeURIComponent(profile.fetLifeUsername)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open het FetLife-profiel van ${profile.fetLifeUsername}`}
                  className="focus-ring flex min-h-[64px] items-center gap-3 rounded-xl px-3 text-left"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg" style={{ color: "var(--on-danger-fill)", background: "var(--danger-fill)" }} aria-hidden="true">
                    <FetLifeMark className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">FetLife</span>
                    <span className="mt-0.5 block truncate text-xs" style={{ color: "var(--text2)" }}>@{profile.fetLifeUsername}</span>
                  </span>
                  <CaretRight size={16} aria-hidden="true" style={{ color: "var(--text2)" }} />
                </a>
              )}

              {profileType === "partner" && latestContract && (
                <Link
                  href={`/contracts/${encodeURIComponent(latestContract.id)}`}
                  prefetch={false}
                  aria-label={`Open het meest recente contract met ${profile.name}`}
                  className="focus-ring flex min-h-[64px] items-center gap-3 rounded-xl px-3 text-left"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg" style={{ color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}>
                    <FileText size={18} weight="regular" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Contract</span>
                    <span className="mt-0.5 block text-xs" style={{ color: "var(--text2)" }}>Meest recente afspraak</span>
                  </span>
                  <CaretRight size={16} aria-hidden="true" style={{ color: "var(--text2)" }} />
                </Link>
              )}
            </div>
          </div>
        )}

        {profileType === "partner" && profile.lockedAt && (
          <p className="mt-3 text-xs" style={{ color: "var(--text2)" }}>
            Geïmporteerd {new Date(profile.lockedAt).toLocaleDateString("nl-NL", { month: "short", year: "numeric" })}
          </p>
        )}

        {profile.privateNote && (
          <p className="mt-4 border-t pt-3 text-sm italic leading-snug" style={{ color: "var(--text2)", borderColor: "var(--border)" }}>
            {profile.privateNote.length > 120 ? profile.privateNote.slice(0, 120) + "…" : profile.privateNote}
          </p>
        )}
      </section>

      {canEdit && <ProfileEnrichmentModal open={enrichmentOpen} profile={profile} onClose={() => setEnrichmentOpen(false)} />}

      <Sheet open={photoViewerOpen && Boolean(profile.avatarDataUrl)} onClose={() => setPhotoViewerOpen(false)} aria-label={`Profielfoto van ${profile.name}`}>
        <SheetContent showHandle={false} className="max-h-[calc(100dvh-env(safe-area-inset-top))] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
          <h2 className="mb-3 px-1 text-base font-medium">Profielfoto</h2>
          <div className="flex min-h-[54dvh] max-h-[72dvh] items-center justify-center overflow-hidden rounded-xl" style={{ background: "var(--bg)" }}>
            {profile.avatarDataUrl && <img src={profile.avatarDataUrl} alt={`Profielfoto van ${profile.name}`} className="max-h-[72dvh] max-w-full select-none object-contain" draggable={false} />}
          </div>
          <button type="button" onClick={() => setPhotoViewerOpen(false)} className="focus-ring mt-3 min-h-11 w-full rounded-xl text-sm font-medium" style={{ color: "var(--text)", background: "var(--surface2)", border: "1px solid var(--border)" }}>Sluit</button>
        </SheetContent>
      </Sheet>
    </>
  );
}