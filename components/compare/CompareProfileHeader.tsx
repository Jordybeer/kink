"use client";

import ProfileChip from "@/components/compare/ProfileChip";
import { PROFILE_COLOUR_A, PROFILE_COLOUR_B } from "@/lib/compare";
import type { Profile } from "@/types";

interface CompareProfileHeaderProps {
  profileA: Profile | undefined;
  profileB: Profile | undefined;
  samePairError: boolean;
  onOpenA: () => void;
  onOpenB: () => void;
}

export default function CompareProfileHeader({
  profileA,
  profileB,
  samePairError,
  onOpenA,
  onOpenB,
}: CompareProfileHeaderProps) {
  const isPartnerA = Boolean(profileA?.isImported || profileA?.origin === "shared");
  const isPartnerB = Boolean(profileB?.isImported || profileB?.origin === "shared");

  return (
    <div className="ks-relational-surface mb-3 rounded-2xl px-3 pb-3 pt-3" style={{ border: "1px solid var(--border)" }}>
      <div className={profileA && profileB
        ? "grid grid-cols-2 items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_3.25rem_minmax(0,1fr)] sm:items-center"
        : "grid grid-cols-2 gap-2"}>
        <ProfileChip
          profile={profileA}
          colour={PROFILE_COLOUR_A}
          slot="A"
          isPartner={isPartnerA}
          onClick={onOpenA}
        />
        {profileA && profileB && (
          <span className="hidden sm:block" aria-hidden="true">
            <span className="ks-relation-thread" />
          </span>
        )}
        <ProfileChip
          profile={profileB}
          colour={PROFILE_COLOUR_B}
          slot="B"
          isPartner={isPartnerB}
          onClick={onOpenB}
        />
      </div>
      {samePairError && (
        <p role="alert" className="text-sm mt-2 px-1" style={{ color: "var(--conflict)" }}>
          Kies twee verschillende profielen om te vergelijken.
        </p>
      )}
    </div>
  );
}
