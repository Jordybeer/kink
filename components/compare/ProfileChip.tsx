"use client";

import { CaretDown, Lock } from "@phosphor-icons/react";
import type { Profile } from "@/types";

interface ProfileChipProps {
  profile: Profile | undefined;
  colour: string;
  slot: "A" | "B";
  isPartner?: boolean;
  onClick: () => void;
}

export default function ProfileChip({
  profile,
  colour,
  slot,
  isPartner,
  onClick,
}: ProfileChipProps) {
  const labelColour = slot === "B" ? "var(--accent2-text)" : "var(--accent-text)";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={profile ? `Kies profiel ${slot}: ${profile.name}` : `Kies profiel ${slot}`}
      className="focus-ring min-h-11 flex-1 flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-colors text-left min-w-0"
      style={profile
        ? { borderColor: colour, background: `color-mix(in srgb, ${colour} 10%, transparent)` }
        : { borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div
        className="w-7 h-7 rounded-full flex-none overflow-hidden flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: profile ? colour : "var(--surface3)" }}
      >
        {profile?.avatarDataUrl ? (
          <img src={profile.avatarDataUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span style={{ color: profile ? "var(--on-accent)" : "var(--text2)" }}>
            {profile ? profile.name[0].toUpperCase() : slot}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate leading-tight">
          {profile ? profile.name : "Kies profiel…"}
        </p>
        {profile && (
          <p className="text-xs truncate leading-tight" style={{ color: labelColour }}>
            {isPartner && <Lock size={9} className="inline mr-0.5" aria-hidden="true" />}
            Profiel {slot}
          </p>
        )}
      </div>
      <CaretDown aria-hidden="true" size={12} className="shrink-0" style={{ color: "var(--text2)" }} />
    </button>
  );
}
