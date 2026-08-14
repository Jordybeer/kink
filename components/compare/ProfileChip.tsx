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

function compareRoleLabel(profile: Profile): string {
  if (profile.perspective === "dominant") return "Dominant";
  if (profile.perspective === "submissive") return "Submissive";
  return profile.role.trim();
}

export default function ProfileChip({
  profile,
  colour,
  slot,
  isPartner,
  onClick,
}: ProfileChipProps) {
  const labelColour = slot === "B" ? "var(--accent2-text)" : "var(--accent-text)";
  const roleLabel = profile ? compareRoleLabel(profile) : "";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={profile ? `Kies profiel ${slot}: ${profile.name}` : `Kies profiel ${slot}`}
      className="focus-ring min-h-14 flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors text-left min-w-0"
      style={profile
        ? { borderColor: colour, background: `color-mix(in srgb, ${colour} 10%, transparent)` }
        : { borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div
        className="w-9 h-9 rounded-full flex-none overflow-hidden flex items-center justify-center text-sm font-bold shrink-0"
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
        <p className="text-[15px] font-semibold truncate leading-tight" style={{ color: "var(--text)" }}>
          {profile ? profile.name : "Kies profiel…"}
        </p>
        {profile && roleLabel && (
          <p className="mt-1 text-[14px] truncate leading-tight" style={{ color: labelColour }}>
            {isPartner && <Lock size={12} className="inline mr-1" aria-hidden="true" />}
            {roleLabel}
          </p>
        )}
      </div>
      <CaretDown aria-hidden="true" size={15} className="shrink-0" style={{ color: "var(--text2)" }} />
    </button>
  );
}
