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
    <div className="pb-3 mb-3" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="grid grid-cols-2 gap-2">
        <ProfileChip
          profile={profileA}
          colour={PROFILE_COLOUR_A}
          slot="A"
          isPartner={isPartnerA}
          onClick={onOpenA}
        />
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
