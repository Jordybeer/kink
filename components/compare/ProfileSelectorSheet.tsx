"use client";

import { Lock } from "@phosphor-icons/react";
import Sheet, { SheetContent } from "@/components/Sheet";
import { PROFILE_COLOUR_A, PROFILE_COLOUR_B } from "@/lib/compare";
import type { Profile } from "@/types";

interface ProfileSelectorSheetProps {
  open: boolean;
  onClose: () => void;
  slot: "A" | "B";
  profiles: Profile[];
  selectedId: string;
  otherSelectedId: string;
  pinnedProfileId: string | null;
  onSelect: (id: string) => void;
}

export default function ProfileSelectorSheet({
  open,
  onClose,
  slot,
  profiles,
  selectedId,
  otherSelectedId,
  pinnedProfileId,
  onSelect,
}: ProfileSelectorSheetProps) {
  const colour = slot === "A" ? PROFILE_COLOUR_A : PROFILE_COLOUR_B;
  const textColour = slot === "A" ? "var(--accent-text)" : "var(--accent2-text)";
  const own = profiles.filter((profile) => !profile.isImported && profile.origin !== "shared");
  const partners = profiles.filter((profile) => profile.isImported || profile.origin === "shared");

  const renderRow = (profile: Profile) => {
    const isSelected = profile.id === selectedId;
    const isOther = profile.id === otherSelectedId;
    const isPrimary = profile.id === pinnedProfileId;
    const isPartner = profile.isImported || profile.origin === "shared";

    return (
      <button
        key={profile.id}
        type="button"
        onClick={() => {
          if (!isOther) {
            onSelect(profile.id);
            onClose();
          }
        }}
        disabled={isOther}
        aria-pressed={isSelected}
        className="focus-ring min-h-12 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left"
        style={isSelected
          ? { background: `color-mix(in srgb, ${colour} 12%, transparent)`, border: `1px solid ${colour}` }
          : isOther
            ? { background: "transparent", border: "1px solid transparent", opacity: 0.35, cursor: "not-allowed" }
            : { background: "transparent", border: "1px solid transparent" }}
      >
        <div
          className="w-8 h-8 rounded-full flex-none overflow-hidden flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: isSelected ? colour : "var(--surface3)" }}
        >
          {profile.avatarDataUrl ? (
            <img src={profile.avatarDataUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span style={{ color: isSelected ? "var(--on-accent)" : "var(--text2)" }}>
              {profile.name[0].toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium truncate">{profile.name}</p>
          <p className="text-xs truncate" style={{ color: "var(--text2)" }}>
            {profile.role}
            {isPrimary ? " · Primair" : ""}
            {isPartner ? " · Partner" : ""}
            {isOther ? ` · Al geselecteerd als ${slot === "A" ? "B" : "A"}` : ""}
          </p>
        </div>
        {isSelected && (
          <span className="text-xs font-bold shrink-0" style={{ color: textColour }}>
            {slot}
          </span>
        )}
        {isPartner && !isSelected && !isOther && (
          <Lock aria-hidden="true" size={12} className="shrink-0" style={{ color: "var(--text2)" }} />
        )}
      </button>
    );
  };

  return (
    <Sheet open={open} onClose={onClose} aria-label={`Kies profiel ${slot}`}>
      <SheetContent>
        <h2
          className="text-sm mb-3"
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontStyle: "italic",
            fontWeight: 400,
            color: "var(--text2)",
          }}
        >
          Profiel {slot}
        </h2>
        {own.length > 0 && (
          <section aria-labelledby={`own-profiles-${slot}`}>
            <h3
              id={`own-profiles-${slot}`}
              className="text-xs font-semibold mb-1 px-1"
              style={{ color: "var(--text2)" }}
            >
              Jouw profielen
            </h3>
            {own.map(renderRow)}
          </section>
        )}
        {partners.length > 0 && (
          <section className="mt-3" aria-labelledby={`partner-profiles-${slot}`}>
            <h3
              id={`partner-profiles-${slot}`}
              className="text-xs font-semibold mb-1 px-1"
              style={{ color: "var(--text2)" }}
            >
              Partners
            </h3>
            {partners.map(renderRow)}
          </section>
        )}
        {profiles.length === 0 && (
          <p className="text-sm py-4 text-center" style={{ color: "var(--text2)" }}>
            Geen profielen gevonden.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
