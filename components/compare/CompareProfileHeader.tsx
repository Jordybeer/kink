"use client";

import { ArrowsLeftRight } from "@phosphor-icons/react";
import ProfileChip from "@/components/compare/ProfileChip";
import { PROFILE_COLOUR_A, PROFILE_COLOUR_B } from "@/lib/compare";
import type { Profile } from "@/types";

interface CompareProfileHeaderProps {
  profileA: Profile | undefined;
  profileB: Profile | undefined;
  samePairError: boolean;
  onOpenA: () => void;
  onOpenB: () => void;
  onSwap: () => void;
}

export default function CompareProfileHeader({
  profileA,
  profileB,
  samePairError,
  onOpenA,
  onOpenB,
  onSwap,
}: CompareProfileHeaderProps) {
  const isPartnerA = Boolean(profileA?.isImported || profileA?.origin === "shared");
  const isPartnerB = Boolean(profileB?.isImported || profileB?.origin === "shared");

  return (
    <div
      className="sticky z-10 pb-3 mb-3"
      style={{
        top: "var(--nav-h)",
        background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2 pt-3">
        <ProfileChip
          profile={profileA}
          colour={PROFILE_COLOUR_A}
          slot="A"
          isPartner={isPartnerA}
          onClick={onOpenA}
        />
        <button
          type="button"
          onClick={onSwap}
          className="focus-ring flex-none w-11 h-11 rounded-xl border flex items-center justify-center transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--text2)" }}
          aria-label="Wissel profielen"
        >
          <ArrowsLeftRight aria-hidden="true" size={17} />
        </button>
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
