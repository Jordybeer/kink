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
  const labelColour = slot === "A" ? "var(--accent2-text)" : "var(--accent-text)";
  const roleLabel = profile ? compareRoleLabel(profile) : "";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={profile ? `Kies profiel ${slot}: ${profile.name}` : `Kies profiel ${slot}`}
      className="focus-ring grid min-h-14 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-2 rounded-xl border px-3 py-2.5 text-left transition-colors sm:flex"
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
      <div className="col-span-2 row-start-2 min-w-0 flex-1">
        <p
          className="break-words text-[15px] font-semibold leading-tight"
          style={{ color: "var(--text)", overflowWrap: "anywhere" }}
        >
          {profile ? profile.name : "Kies profiel…"}
        </p>
        {profile && roleLabel && (
          <p className="mt-1 break-words text-[14px] leading-tight [overflow-wrap:anywhere]" style={{ color: labelColour }}>
            {isPartner && <Lock size={12} className="inline mr-1" aria-hidden="true" />}
            {roleLabel}
          </p>
        )}
      </div>
      <CaretDown aria-hidden="true" size={15} className="col-start-2 row-start-1 shrink-0" style={{ color: "var(--text2)" }} />
    </button>
  );
}
