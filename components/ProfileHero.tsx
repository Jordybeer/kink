"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CaretRight,
  FileText,
  Lock,
} from "@phosphor-icons/react";
import PlatformShareIcon from "@/components/ui/PlatformShareIcon";
import Sheet, { SheetContent } from "@/components/Sheet";
import FetLifeMark from "@/components/brand/FetLifeMark";
import BdsmtestScores from "@/components/BdsmtestScores";
import ProfileEnrichmentModal from "@/components/profile/ProfileEnrichmentModal";
import { useTopNavActions, type TopNavAction } from "@/components/nav/TopNavContext";
import type { Profile } from "@/types";
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
  profileType,
  embedded = false,
}: ProfileHeroProps) {
  const shareRef = useRef(onShare);
  const editRef = useRef(onEdit);

  useLayoutEffect(() => {
    shareRef.current = onShare;
    editRef.current = onEdit;
  }, [onEdit, onShare]);

  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [enrichmentOpen, setEnrichmentOpen] = useState(false);
  useLegacyContractMigration();
  const contractSeries = useContractStore((state) => state.series);
  const latestContract = mostRecentReadableContractForProfile(contractSeries, profile);
  const canShare = Boolean(onShare);
  const canEdit = Boolean(onEdit);
  const hasBdsmtest = (profile.bdsmtestScores?.length ?? 0) > 0;
  const hasLinkedSources = hasBdsmtest || Boolean(profile.fetLifeUsername) || (profileType === "partner" && Boolean(latestContract));
  const showSourceSection = hasLinkedSources || canEdit;

  const navActions = useMemo<TopNavAction[]>(() => {
    const next: TopNavAction[] = [];
    if (canEdit) {
      next.push({
        id: "edit-profile",
        label: "Profiel bewerken",
        shortLabel: "Bewerk",
        icon: null,
        onClick: () => editRef.current?.(),
        placement: "primary",
      });
    }
    if (canShare) {
      next.push({
        id: "share-profile",
        label: "Profiel delen",
        icon: <PlatformShareIcon size={18} weight="regular" aria-hidden="true" />,
        onClick: () => shareRef.current?.(),
        placement: "overflow",
      });
    }
    return next;
  }, [canEdit, canShare]);
  useTopNavActions(navActions);

  const initial = profile.name.charAt(0).toUpperCase();

  return (
    <>
      <section
        data-testid="profile-hero"
        className={`ks-fade-in relative pb-2 pt-2 ${embedded ? "" : "mx-[var(--page-gutter)]"}`}
      >
        <div className="flex items-start gap-5">
          <div className="relative flex-none">
            <button
              type="button"
              data-tour="avatar"
              onClick={() => {
                if (profile.avatarDataUrl) setPhotoViewerOpen(true);
              }}
              disabled={!profile.avatarDataUrl}
              className="focus-ring relative h-[6.6rem] w-[6.6rem] overflow-hidden rounded-full disabled:cursor-default"
              style={{ border: "1px solid var(--border-accent)", background: "var(--surface2)" }}
              aria-label={profile.avatarDataUrl ? "Profielfoto bekijken" : `Geen profielfoto voor ${profile.name}`}
            >
              {profile.avatarDataUrl ? (
                <img src={profile.avatarDataUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl italic" style={avatarStyle(profile.name)}>{initial}</div>
              )}
            </button>
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
            <p className="mt-3 text-base font-semibold" style={{ color: "var(--text)" }}>
              <span className="sr-only">Hoofdperspectief: </span>
              {profile.role || "Perspectief nog niet gekozen"}
            </p>
            {profile.relationshipStatus && (
              <p className="mt-1.5 text-sm" style={{ color: "var(--text2)" }}>
                <span className="sr-only">Relatiestatus: </span>
                {profile.relationshipStatus}
              </p>
            )}
            {profileType === "partner" && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text2)" }}>
                <Lock size={12} weight="regular" aria-hidden="true" /> Gedeeld profiel
              </p>
            )}
          </div>
        </div>

        {profileType === "partner" && (
          <div className="mt-3 flex justify-start">
            <ProfileTrust profile={profile} quiet />
          </div>
        )}

        {showSourceSection && (
          <div data-testid="profile-linked-sources" className="mt-6">
            <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
              <h3 className="text-xs font-medium" style={{ color: "var(--text2)" }}>Gekoppelde bronnen</h3>
              {canEdit && (
                <button
                  type="button"
                  data-tour="profile-enrichment"
                  onClick={() => setEnrichmentOpen(true)}
                  aria-label="Gekoppelde bronnen en profielinfo beheren"
                  className="focus-ring min-h-11 px-1 text-xs font-semibold active:opacity-70"
                  style={{ color: "var(--text2)" }}
                >
                  Beheer
                </button>
              )}
            </div>

            {hasLinkedSources ? (
              <div className="grid gap-0.5">
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
                    className="focus-ring flex min-h-[60px] items-center gap-3 rounded-lg px-1 text-left"
                  >
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg" style={{ color: "var(--on-danger-fill)", background: "var(--danger-fill)" }} aria-hidden="true">
                      <FetLifeMark className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">FetLife</span>
                      <span className="mt-0.5 block truncate text-xs" style={{ color: "var(--text2)" }}>@{profile.fetLifeUsername}</span>
                    </span>
                    <CaretRight size={15} aria-hidden="true" style={{ color: "var(--text2)" }} />
                  </a>
                )}

                {profileType === "partner" && latestContract && (
                  <Link
                    href={`/contracts/${encodeURIComponent(latestContract.id)}`}
                    prefetch={false}
                    aria-label={`Open het meest recente contract met ${profile.name}`}
                    className="focus-ring flex min-h-[60px] items-center gap-3 rounded-lg px-1 text-left"
                  >
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg" style={{ color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 8%, transparent)" }}>
                      <FileText size={16} weight="regular" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">Contract</span>
                      <span className="mt-0.5 block text-xs" style={{ color: "var(--text2)" }}>Meest recente afspraak</span>
                    </span>
                    <CaretRight size={15} aria-hidden="true" style={{ color: "var(--text2)" }} />
                  </Link>
                )}
              </div>
            ) : (
              <p className="py-2 text-sm" style={{ color: "var(--text2)" }}>
                Voeg BDSMTest of FetLife toe om externe profielcontext hier terug te vinden.
              </p>
            )}
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
