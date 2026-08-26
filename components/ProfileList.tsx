"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CaretDown,
  CaretRight,
  FileText,
  FilmSlate,
  Lock,
  PencilSimple,
  PushPin,
  PushPinSlash,
  Trash,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { STAGGER_CHILDREN, fadeUp } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { getQuestionnaireRuntime } from "@/lib/questionnaire";
import { getProfileType, splitProfilesByOwnership } from "@/lib/profileType";
import { avatarStyle } from "@/lib/avatar";
import Sheet, { SheetContent } from "@/components/Sheet";
import type { Profile } from "@/types";

interface ProfileListProps {
  onPromptDelete: (id: string) => void;
}

const HOME_PROFILE_DISCLOSURES = "kinksync-home-profile-disclosures";

interface ProfileGroup {
  key: string;
  name: string;
  profiles: Profile[];
}

function groupIdentity(profile: Profile): string {
  return profile.personGroupId ? `person:${profile.personGroupId}` : `profile:${profile.id}`;
}

function buildGroups(profiles: Profile[], pinnedProfileId: string | null): ProfileGroup[] {
  const groups = new Map<string, ProfileGroup>();
  for (const profile of profiles) {
    const key = groupIdentity(profile);
    const existing = groups.get(key);
    if (existing) existing.profiles.push(profile);
    else groups.set(key, { key, name: profile.name, profiles: [profile] });
  }

  return [...groups.values()].sort((left, right) => {
    const leftPinned = left.profiles.some((profile) => profile.id === pinnedProfileId);
    const rightPinned = right.profiles.some((profile) => profile.id === pinnedProfileId);
    if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;
    return left.profiles[0].createdAt - right.profiles[0].createdAt;
  });
}

function defaultComparePair(
  profiles: Profile[],
  pinnedProfileId: string | null,
): [Profile, Profile] | null {
  const pinned = profiles.find((profile) => profile.id === pinnedProfileId);
  if (pinned) {
    const other = profiles.find(
      (profile) => profile.id !== pinned.id && groupIdentity(profile) !== groupIdentity(pinned),
    );
    if (other) return [pinned, other];
  }

  for (let leftIndex = 0; leftIndex < profiles.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < profiles.length; rightIndex += 1) {
      if (groupIdentity(profiles[leftIndex]) !== groupIdentity(profiles[rightIndex])) {
        return [profiles[leftIndex], profiles[rightIndex]];
      }
    }
  }
  return null;
}

export default function ProfileList({ onPromptDelete }: ProfileListProps) {
  const profiles = useStore((state) => state.profiles);
  const pinnedProfileId = useStore((state) => state.pinnedProfileId);
  const pinProfile = useStore((state) => state.pinProfile);
  const unpinProfile = useStore((state) => state.unpinProfile);
  const deleteProfile = useStore((state) => state.deleteProfile);
  const [groupDeleteTarget, setGroupDeleteTarget] = useState<Profile | null>(null);
  const reduceMotion = useReducedMotion();

  const ownership = splitProfilesByOwnership(profiles, pinnedProfileId);
  const mineGroups = buildGroups(ownership.mine, pinnedProfileId);
  const sharedGroups = buildGroups(ownership.shared, pinnedProfileId);
  const comparePair = defaultComparePair(profiles, pinnedProfileId);
  const deletionGroup = groupDeleteTarget?.personGroupId
    ? profiles.filter((profile) => profile.personGroupId === groupDeleteTarget.personGroupId)
    : [];

  function closeGroupDelete() {
    setGroupDeleteTarget(null);
  }

  function deleteOnePerspective() {
    if (!groupDeleteTarget) return;
    deleteProfile(groupDeleteTarget.id);
    closeGroupDelete();
  }

  function deleteAllPerspectives() {
    for (const profile of deletionGroup) deleteProfile(profile.id);
    closeGroupDelete();
  }

  const renderGroups = (visibleGroups: ProfileGroup[]) => (
    <motion.div
      className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start"
      initial={reduceMotion ? false : "hidden"}
      animate="show"
      variants={STAGGER_CHILDREN}
    >
      {visibleGroups.map((group) => {
        const isPerspectiveGroup = group.profiles.length > 1;
        return (
          <motion.section
            key={group.key}
            variants={fadeUp(10)}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 22px rgba(0,0,0,0.20)",
            }}
          >
            {isPerspectiveGroup && (
              <div
                className="px-3.5 py-3 flex items-center gap-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <ProfileAvatar profile={group.profiles[0]} size="small" />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-lg italic truncate"
                    style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
                  >
                    {group.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                    Twee afzonderlijke perspectieven
                  </p>
                </div>
                {group.profiles.length === 2 && (
                  <Link
                    href={`/compare?a=${group.profiles[0].id}&b=${group.profiles[1].id}`}
                    prefetch={false}
                    className="focus-ring min-h-9 px-3 rounded-full inline-flex items-center text-xs font-semibold"
                    style={{ color: "var(--accent)", border: "1px solid var(--border-accent)" }}
                  >
                    Vergelijk kanten
                  </Link>
                )}
              </div>
            )}

            <div className="flex flex-col">
              {group.profiles.map((profile, index) => (
                <ProfileRow
                  key={profile.id}
                  profile={profile}
                  pinnedProfileId={pinnedProfileId}
                  showName={!isPerspectiveGroup}
                  divider={index > 0}
                  onPin={() => profile.id === pinnedProfileId ? unpinProfile() : pinProfile(profile.id)}
                  onDelete={() => isPerspectiveGroup
                    ? setGroupDeleteTarget(profile)
                    : onPromptDelete(profile.id)}
                />
              ))}
            </div>
          </motion.section>
        );
      })}
    </motion.div>
  );

  return (
    <>
      {ownership.mine.length > 0 && (
        <ProfileDisclosure
          id="mine"
          label="Mijn profielen"
          count={ownership.mine.length}
          defaultOpen
        >
          {renderGroups(mineGroups)}
        </ProfileDisclosure>
      )}
      {ownership.shared.length > 0 && (
        <ProfileDisclosure
          id="shared"
          label="Gedeeld met mij"
          count={ownership.shared.length}
          defaultOpen={ownership.mine.length === 0}
        >
          {renderGroups(sharedGroups)}
        </ProfileDisclosure>
      )}

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start">
        {comparePair ? (
          <Link
            href={`/compare?a=${comparePair[0].id}&b=${comparePair[1].id}`}
            prefetch={false}
            className="focus-ring block rounded-2xl p-5 transition-opacity hover:opacity-90 lg:col-span-2"
            style={{
              background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 8%, var(--surface)), var(--surface))",
              border: "1px solid var(--border-accent)",
              boxShadow: "0 10px 26px color-mix(in srgb, var(--accent) 12%, transparent)",
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center flex-none" aria-hidden="true">
                <CompareCoin profile={comparePair[0]} />
                <CompareCoin profile={comparePair[1]} overlap />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: "var(--text2)" }}>
                  Vergelijk
                </p>
                <p
                  className="text-lg italic leading-tight truncate"
                  style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
                >
                  {comparePair[0].name}
                  <span aria-hidden="true" style={{ color: "var(--accent)", fontStyle: "normal" }}> × </span>
                  {comparePair[1].name}
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--text2)" }}>
                  Bekijk overeenkomsten, bespreekpunten en grenzen.
                </p>
              </div>
              <CaretRight size={16} aria-hidden="true" style={{ color: "var(--accent)" }} />
            </div>
          </Link>
        ) : (
          <div
            className="rounded-2xl p-5 lg:col-span-2"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-sm" style={{ color: "var(--text2)" }}>
              Voeg een profiel van een andere persoon toe om te vergelijken.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5 lg:col-span-2">
          {[
            { href: "/contracts", label: "Contracten", icon: FileText },
            { href: "/scenes", label: "Scènes", icon: FilmSlate },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="focus-ring flex items-center gap-2.5 min-h-12 rounded-xl px-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <Icon size={16} aria-hidden="true" style={{ color: "var(--text2)" }} />
              <span className="flex-1 text-sm font-medium">{label}</span>
              <CaretRight size={14} aria-hidden="true" style={{ color: "var(--text2)" }} />
            </Link>
          ))}
        </div>
      </div>

      <Sheet
        open={groupDeleteTarget !== null}
        onClose={closeGroupDelete}
        scrollable
        aria-label="Gekoppeld profiel verwijderen"
      >
        <SheetContent showClose={false} className="px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <h2 className="text-xl font-bold mb-2">Wat wil je verwijderen?</h2>
          <p className="text-sm mb-5 leading-relaxed" style={{ color: "var(--text2)" }}>
            {groupDeleteTarget?.name} heeft een dominant en submissief profiel met aparte antwoorden.
          </p>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={deleteOnePerspective}
              className="focus-ring min-h-12 rounded-xl px-4 text-sm font-semibold text-left"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              Alleen {groupDeleteTarget?.role ?? "dit perspectief"} verwijderen
            </button>
            <button
              type="button"
              onClick={deleteAllPerspectives}
              className="focus-ring min-h-12 rounded-xl px-4 text-sm font-bold text-left"
              style={{
                background: "color-mix(in srgb, var(--hard-no) 15%, var(--surface2))",
                border: "1px solid var(--hard-no)",
                color: "var(--hard-no)",
              }}
            >
              Beide kanten verwijderen
            </button>
            <button
              type="button"
              onClick={closeGroupDelete}
              className="focus-ring min-h-12 rounded-xl text-sm font-semibold"
              style={{ color: "var(--text2)", border: "1px solid var(--border)" }}
            >
              Annuleer
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ProfileDisclosure({
  id,
  label,
  count,
  defaultOpen,
  children,
}: {
  id: "mine" | "shared";
  label: string;
  count: number;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `home-${id}-profiles`;

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(HOME_PROFILE_DISCLOSURES);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<Record<"mine" | "shared", unknown>>;
      if (typeof parsed[id] === "boolean") setOpen(parsed[id]);
    } catch {
      // UI-only preference: malformed state is ignored and never touches profile data.
    }
  }, [id]);

  function toggle() {
    setOpen((current) => {
      const next = !current;
      try {
        const stored = sessionStorage.getItem(HOME_PROFILE_DISCLOSURES);
        const parsed = stored ? JSON.parse(stored) as Record<string, unknown> : {};
        sessionStorage.setItem(HOME_PROFILE_DISCLOSURES, JSON.stringify({
          mine: typeof parsed.mine === "boolean" ? parsed.mine : undefined,
          shared: typeof parsed.shared === "boolean" ? parsed.shared : undefined,
          [id]: next,
        }));
      } catch {
        // The disclosure still works when storage is unavailable.
      }
      return next;
    });
  }

  return (
    <section className="mb-4" aria-labelledby={`${panelId}-label`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="focus-ring mb-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <span id={`${panelId}-label`} className="flex-1 text-sm font-semibold">
          {label}
        </span>
        <span className="text-xs tabular-nums" style={{ color: "var(--text2)" }}>
          {count}
        </span>
        <CaretDown
          size={15}
          aria-hidden="true"
          className="transition-transform"
          style={{ color: "var(--text2)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && <div id={panelId}>{children}</div>}
    </section>
  );
}

function ProfileRow({
  profile,
  pinnedProfileId,
  showName,
  divider,
  onPin,
  onDelete,
}: {
  profile: Profile;
  pinnedProfileId: string | null;
  showName: boolean;
  divider: boolean;
  onPin: () => void;
  onDelete: () => void;
}) {
  const runtime = getQuestionnaireRuntime(profile);
  const deepDive = runtime.intent.kind === "deepDive";
  const questionnaireTotal = deepDive ? runtime.visibleKinks.length : runtime.coverage.total;
  const ratedCount = deepDive
    ? runtime.visibleKinks.filter((kink) => profile.entries[kink.id]?.status).length
    : runtime.coverage.answered;
  const progress = questionnaireTotal > 0 ? Math.min(100, Math.round((ratedCount / questionnaireTotal) * 100)) : 0;
  const shared = getProfileType(profile, pinnedProfileId) === "partner";

  return (
    <div
      className="relative px-3 py-3"
      style={divider ? { borderTop: "1px solid var(--border)" } : undefined}
    >
      <Link
        href={`/profile/${profile.id}`}
        prefetch={false}
        className="focus-ring flex items-center gap-3 rounded-xl pr-20"
        aria-label={`${profile.name} ${profile.role} openen`}
      >
        {showName && <ProfileAvatar profile={profile} size="normal" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p
              className="text-base italic truncate"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
            >
              {showName ? profile.name : profile.role}
            </p>
            {shared && <Lock size={10} aria-label="Gedeeld profiel" style={{ color: "var(--text2)" }} />}
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text2)" }}>
            {showName && profile.role ? `${profile.role} · ` : ""}{ratedCount} van {questionnaireTotal} beoordeeld
          </p>
          <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ background: "var(--surface3)" }}>
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "var(--accent)" }} />
          </div>
        </div>
        <CaretRight size={14} aria-hidden="true" style={{ color: "var(--text2)" }} />
      </Link>

      {!shared && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          <button
            type="button"
            onClick={onPin}
            aria-label={profile.id === pinnedProfileId ? "Niet langer als mijn profiel markeren" : "Markeer als mijn profiel"}
            className="focus-ring w-9 h-9 rounded-full flex items-center justify-center"
            style={{ color: profile.id === pinnedProfileId ? "var(--accent)" : "var(--text2)" }}
          >
            {profile.id === pinnedProfileId ? <PushPinSlash aria-hidden="true" size={15} /> : <PushPin aria-hidden="true" size={15} />}
          </button>
          <Link
            href={`/profile/${profile.id}?edit=1`}
            prefetch={false}
            aria-label={`${profile.name} bewerken`}
            className="focus-ring w-9 h-9 rounded-full flex items-center justify-center"
            style={{ color: "var(--text2)" }}
          >
            <PencilSimple aria-hidden="true" size={15} />
          </Link>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`${profile.name} ${profile.role} verwijderen`}
            className="focus-ring w-9 h-9 rounded-full flex items-center justify-center"
            style={{ color: "var(--hard-no)" }}
          >
            <Trash aria-hidden="true" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileAvatar({ profile, size }: { profile: Profile; size: "small" | "normal" }) {
  const sizeClass = size === "small" ? "w-9 h-9" : "w-12 h-12";
  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden flex-none`}
      aria-hidden="true"
      style={{
        border: "1px solid color-mix(in srgb, var(--border-accent) 62%, var(--border))",
        boxShadow: "0 4px 12px rgba(0,0,0,0.22)",
      }}
    >
      {profile.avatarDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarDataUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-base italic" style={avatarStyle(profile.name)}>
          {profile.name[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}

function CompareCoin({ profile, overlap }: { profile: Profile; overlap?: boolean }) {
  return (
    <div
      className={`w-12 h-12 rounded-full overflow-hidden flex-none ${overlap ? "-ml-3" : ""}`}
      style={{
        border: "1px solid color-mix(in srgb, var(--border-accent) 62%, var(--border))",
        boxShadow: overlap
          ? "0 0 0 1px var(--surface), 0 5px 14px rgba(0,0,0,0.26)"
          : "0 5px 14px rgba(0,0,0,0.26)",
      }}
    >
      {profile.avatarDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarDataUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-lg italic" style={avatarStyle(profile.name)}>
          {profile.name[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}
