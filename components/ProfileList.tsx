"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDots,
  CaretRight,
  DotsThree,
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
      data-home-profile-stack
      className="overflow-hidden rounded-2xl"
      style={{
        background: "var(--profile-stack-surface)",
        boxShadow: "inset 0 0 0 1px var(--profile-stack-border)",
      }}
      initial={reduceMotion ? false : "hidden"}
      animate="show"
      variants={STAGGER_CHILDREN}
    >
      {visibleGroups.map((group, groupIndex) => {
        const isPerspectiveGroup = group.profiles.length > 1;
        return (
          <motion.section
            key={group.key}
            variants={fadeUp(10)}
            style={groupIndex > 0
              ? { borderTop: "1px solid color-mix(in srgb, var(--border) 72%, transparent)" }
              : undefined}
          >
            {isPerspectiveGroup && (
              <div
                className="flex items-center gap-3 px-3.5 py-3"
                style={{ borderBottom: "1px solid color-mix(in srgb, var(--border) 72%, transparent)" }}
              >
                <ProfileAvatar profile={group.profiles[0]} size="small" />
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-lg italic"
                    style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
                  >
                    {group.name}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text2)" }}>
                    Twee afzonderlijke perspectieven
                  </p>
                </div>
                {group.profiles.length === 2 && (
                  <Link
                    href={`/compare?a=${group.profiles[0].id}&b=${group.profiles[1].id}`}
                    prefetch={false}
                    className="focus-ring inline-flex min-h-11 items-center px-1 text-xs font-semibold"
                    style={{ color: "var(--accent)" }}
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
        <ProfileSection id="mine" label="Mijn profielen">
          {renderGroups(mineGroups)}
        </ProfileSection>
      )}
      {ownership.shared.length > 0 && (
        <ProfileSection id="shared" label="Gedeeld met mij">
          {renderGroups(sharedGroups)}
        </ProfileSection>
      )}

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start">
        {comparePair ? (
          <Link
            data-home-compare-feature
            href={`/compare?a=${comparePair[0].id}&b=${comparePair[1].id}`}
            prefetch={false}
            className="focus-ring block rounded-2xl p-4 transition-opacity hover:opacity-90 lg:col-span-2"
            style={{
              background: "linear-gradient(145deg, color-mix(in srgb, var(--identity-a) 6%, var(--surface)), color-mix(in srgb, var(--action-primary) 6%, var(--surface)))",
              border: "1px solid var(--border-accent)",
              boxShadow: "0 8px 22px color-mix(in srgb, var(--accent) 9%, transparent)",
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex flex-none items-center" aria-hidden="true">
                <CompareCoin profile={comparePair[0]} />
                <CompareCoin profile={comparePair[1]} overlap />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-xs uppercase tracking-widest" style={{ color: "var(--text2)" }}>
                  Vergelijk
                </p>
                <p
                  className="truncate text-lg italic leading-tight"
                  style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
                >
                  {comparePair[0].name}
                  <span aria-hidden="true" style={{ color: "var(--accent)", fontStyle: "normal" }}> × </span>
                  {comparePair[1].name}
                </p>
                <p className="mt-0.5 text-sm" style={{ color: "var(--text2)" }}>
                  Bekijk overeenkomsten, bespreekpunten en grenzen.
                </p>
              </div>
              <CaretRight size={16} aria-hidden="true" style={{ color: "var(--accent)" }} />
            </div>
          </Link>
        ) : (
          <p
            className="px-1 py-2 text-sm leading-relaxed lg:col-span-2"
            style={{ color: "var(--text2)" }}
          >
            Voeg een profiel van een andere persoon toe om te vergelijken.
          </p>
        )}

        <div
          data-home-utility-list
          className="flex flex-col lg:col-span-2"
          style={{
            borderTop: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
            borderBottom: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
          }}
        >
          {[
            { href: "/contracts", label: "Contracten", icon: FileText },
            { href: "/scenes", label: "Scènes", icon: FilmSlate },
            { href: "/intimacy", label: "Agenda", icon: CalendarDots },
          ].map(({ href, label, icon: Icon }, index) => (
            <Link
              key={href}
              href={href}
              className="focus-ring flex min-h-12 items-center gap-3 px-1"
              style={index > 0
                ? { borderTop: "1px solid color-mix(in srgb, var(--border) 58%, transparent)" }
                : undefined}
            >
              <Icon size={17} aria-hidden="true" style={{ color: "var(--identity-a)" }} />
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
          <h2 className="mb-2 text-xl font-bold">Wat wil je verwijderen?</h2>
          <p className="mb-5 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
            {groupDeleteTarget?.name} heeft een dominant en submissief profiel met aparte antwoorden.
          </p>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={deleteOnePerspective}
              className="focus-ring min-h-12 rounded-xl px-4 text-left text-sm font-semibold"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              Alleen {groupDeleteTarget?.role ?? "dit perspectief"} verwijderen
            </button>
            <button
              type="button"
              onClick={deleteAllPerspectives}
              className="focus-ring min-h-12 rounded-xl px-4 text-left text-sm font-bold"
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

function ProfileSection({
  id,
  label,
  children,
}: {
  id: "mine" | "shared";
  label: string;
  children: ReactNode;
}) {
  const labelId = `home-${id}-profiles-label`;

  return (
    <section className="mb-5" aria-labelledby={labelId}>
      <h2
        id={labelId}
        className="mb-2 px-1 text-base italic leading-6"
        style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
      >
        {label}
      </h2>
      {children}
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
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <div
      className="px-3 py-3"
      style={divider ? { borderTop: "1px solid color-mix(in srgb, var(--border) 72%, transparent)" } : undefined}
    >
      <div className="flex items-center gap-1">
        <Link
          href={`/profile/${profile.id}`}
          prefetch={false}
          className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-xl"
          aria-label={`${profile.name} ${profile.role} openen`}
        >
          {showName && <ProfileAvatar profile={profile} size="normal" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p
                className="truncate text-base italic"
                style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
              >
                {showName ? profile.name : profile.role}
              </p>
              {shared && <Lock size={10} aria-label="Gedeeld profiel" style={{ color: "var(--text2)" }} />}
            </div>
            <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text2)" }}>
              {showName && profile.role ? `${profile.role} · ` : ""}{ratedCount} van {questionnaireTotal} beoordeeld
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: "var(--surface3)" }}>
              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "var(--accent)" }} />
            </div>
          </div>
          <CaretRight size={14} className="flex-none" aria-hidden="true" style={{ color: "var(--text2)" }} />
        </Link>

        {!shared && (
          <button
            type="button"
            onClick={() => setActionsOpen(true)}
            aria-label={`Meer acties voor ${profile.name}`}
            aria-haspopup="dialog"
            aria-expanded={actionsOpen}
            className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-full"
            style={{ color: "var(--text2)" }}
          >
            <DotsThree aria-hidden="true" size={20} weight="bold" />
          </button>
        )}
      </div>

      {!shared && (
        <Sheet open={actionsOpen} onClose={() => setActionsOpen(false)} aria-label={`Acties voor ${profile.name}`}>
          <SheetContent className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
            <div className="mb-3 px-1">
              <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>{profile.name}</h3>
              <p className="mt-0.5 text-sm" style={{ color: "var(--text2)" }}>{profile.role}</p>
            </div>
            <button
              type="button"
              onClick={() => { setActionsOpen(false); onPin(); }}
              aria-pressed={profile.id === pinnedProfileId}
              className="focus-ring flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium"
              style={{ color: profile.id === pinnedProfileId ? "var(--accent)" : "var(--text)", background: "var(--surface2)" }}
            >
              {profile.id === pinnedProfileId ? <PushPinSlash aria-hidden="true" size={18} /> : <PushPin aria-hidden="true" size={18} />}
              {profile.id === pinnedProfileId ? "Niet langer als mijn profiel" : "Markeer als mijn profiel"}
            </button>
            <Link
              href={`/profile/${profile.id}?edit=1`}
              prefetch={false}
              onClick={() => setActionsOpen(false)}
              className="focus-ring mt-2 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium"
              style={{ color: "var(--text)", background: "var(--surface2)" }}
            >
              <PencilSimple aria-hidden="true" size={18} />
              Profiel bewerken
            </Link>
            <button
              type="button"
              onClick={() => { setActionsOpen(false); onDelete(); }}
              className="focus-ring mt-2 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium"
              style={{ color: "var(--hard-no)", background: "color-mix(in srgb, var(--hard-no) 6%, var(--surface2))" }}
            >
              <Trash aria-hidden="true" size={18} />
              Profiel verwijderen
            </button>
            <button
              type="button"
              onClick={() => setActionsOpen(false)}
              className="focus-ring mt-3 min-h-11 w-full rounded-xl px-3 text-sm font-medium"
              style={{ color: "var(--text2)" }}
            >
              Annuleren
            </button>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function ProfileAvatar({ profile, size }: { profile: Profile; size: "small" | "normal" }) {
  const sizeClass = size === "small" ? "h-9 w-9" : "h-12 w-12";
  return (
    <div
      className={`${sizeClass} flex-none overflow-hidden rounded-full`}
      aria-hidden="true"
      style={{
        border: "1px solid color-mix(in srgb, var(--border-accent) 62%, var(--border))",
        boxShadow: "0 3px 10px var(--deep-shadow)",
      }}
    >
      {profile.avatarDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarDataUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-base italic" style={avatarStyle(profile.name)}>
          {profile.name[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}

function CompareCoin({ profile, overlap }: { profile: Profile; overlap?: boolean }) {
  return (
    <div
      className={`h-12 w-12 flex-none overflow-hidden rounded-full ${overlap ? "-ml-3" : ""}`}
      style={{
        border: "1px solid color-mix(in srgb, var(--border-accent) 62%, var(--border))",
        boxShadow: overlap
          ? "0 0 0 1px var(--surface), 0 5px 14px var(--deep-shadow)"
          : "0 5px 14px var(--deep-shadow)",
      }}
    >
      {profile.avatarDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarDataUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-lg italic" style={avatarStyle(profile.name)}>
          {profile.name[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}
