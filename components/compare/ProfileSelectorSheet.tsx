"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Lock, MagnifyingGlass } from "@phosphor-icons/react";
import Sheet, { SheetContent } from "@/components/Sheet";
import { PROFILE_COLOUR_A, PROFILE_COLOUR_B } from "@/lib/compare";
import { splitProfilesByOwnership } from "@/lib/profileType";
import type { Profile } from "@/types";

const SEARCH_THRESHOLD = 8;

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
  const [query, setQuery] = useState("");
  const selectedRowRef = useRef<HTMLButtonElement | null>(null);
  const ownership = useMemo(
    () => splitProfilesByOwnership(profiles, pinnedProfileId),
    [profiles, pinnedProfileId],
  );
  const sharedIds = useMemo(
    () => new Set(ownership.shared.map((profile) => profile.id)),
    [ownership.shared],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("nl");

  const visible = useMemo(() => {
    const matches = (profile: Profile) => {
      if (!normalizedQuery) return true;
      return `${profile.name} ${profile.role}`.toLocaleLowerCase("nl").includes(normalizedQuery);
    };
    return {
      mine: ownership.mine.filter(matches),
      shared: ownership.shared.filter(matches),
    };
  }, [normalizedQuery, ownership.mine, ownership.shared]);

  const closeAndReset = () => {
    setQuery("");
    onClose();
  };

  useEffect(() => {
    if (!open || normalizedQuery) return;
    const frame = requestAnimationFrame(() => {
      selectedRowRef.current?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, normalizedQuery, selectedId]);

  const renderRow = (profile: Profile) => {
    const isSelected = profile.id === selectedId;
    const isOther = profile.id === otherSelectedId;
    const isPrimary = profile.id === pinnedProfileId;
    const isShared = sharedIds.has(profile.id);

    return (
      <button
        key={profile.id}
        ref={isSelected ? selectedRowRef : undefined}
        type="button"
        onClick={() => {
          if (!isOther) {
            onSelect(profile.id);
            closeAndReset();
          }
        }}
        disabled={isOther}
        aria-label={`${profile.name}, ${profile.role}${isPrimary ? ", primair" : ""}${isShared ? ", gedeeld" : ""}${isOther ? `, al geselecteerd als ${slot === "A" ? "B" : "A"}` : ""}`}
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
            {isShared ? " · Gedeeld" : ""}
            {isOther ? ` · Al geselecteerd als ${slot === "A" ? "B" : "A"}` : ""}
          </p>
        </div>
        {isSelected && (
          <span className="text-xs font-bold shrink-0" style={{ color: textColour }}>
            {slot}
          </span>
        )}
        {isShared && !isSelected && !isOther && (
          <Lock aria-hidden="true" size={12} className="shrink-0" style={{ color: "var(--text2)" }} />
        )}
      </button>
    );
  };

  const hasResults = visible.mine.length > 0 || visible.shared.length > 0;

  return (
    <Sheet open={open} onClose={closeAndReset} scrollable aria-label={`Kies profiel ${slot}`}>
      <SheetContent
        className="flex flex-col overflow-hidden px-0 pb-0 pt-3"
        style={{ maxHeight: "calc(var(--visual-viewport-height, 100dvh) - env(safe-area-inset-top))" }}
      >
        <div className="flex-none px-5 pb-3">
          <h2
            className="text-sm mb-3"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontStyle: "italic",
              fontWeight: 400,
              color: "var(--text2)",
            }}
          >
            Kies profiel {slot}
          </h2>
          {profiles.length >= SEARCH_THRESHOLD && (
            <label className="relative block">
              <span className="sr-only">Zoek profiel</span>
              <MagnifyingGlass
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text2)" }}
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Zoek op naam of rol…"
                autoComplete="off"
                spellCheck={false}
                className="focus-ring min-h-11 w-full rounded-xl pl-9 pr-3 text-base"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </label>
          )}
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          data-testid="profile-selector-scroll"
        >
          {visible.mine.length > 0 && (
            <section aria-labelledby={`own-profiles-${slot}`}>
              <h3
                id={`own-profiles-${slot}`}
                className="sticky top-0 z-10 px-1 py-2 text-xs font-semibold"
                style={{ color: "var(--text2)", background: "var(--surface)" }}
              >
                Mijn profielen
              </h3>
              {visible.mine.map(renderRow)}
            </section>
          )}
          {visible.shared.length > 0 && (
            <section className="mt-2" aria-labelledby={`shared-profiles-${slot}`}>
              <h3
                id={`shared-profiles-${slot}`}
                className="sticky top-0 z-10 px-1 py-2 text-xs font-semibold"
                style={{ color: "var(--text2)", background: "var(--surface)" }}
              >
                Gedeeld met mij
              </h3>
              {visible.shared.map(renderRow)}
            </section>
          )}
          {!hasResults && (
            <p className="py-6 text-center text-sm" style={{ color: "var(--text2)" }}>
              Geen profielen gevonden.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
