"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDots, CaretDown, CaretRight, CaretUp, DotsThree, FileText, FilmSlate,
  PencilSimple, PushPin, PushPinSlash, Trash, UsersThree,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { STAGGER_CHILDREN, fadeUp } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { splitProfilesByOwnership } from "@/lib/profileType";
import { avatarStyle } from "@/lib/avatar";
import { experienceLevelLabel } from "@/lib/roles";
import Sheet, { SheetContent } from "@/components/Sheet";
import type { Profile } from "@/types";

type Group = { key: string; name: string; profiles: Profile[] };

function identity(profile: Profile) {
  return profile.personGroupId ? `person:${profile.personGroupId}` : `profile:${profile.id}`;
}

function groupsOf(profiles: Profile[], pinnedId: string | null): Group[] {
  const map = new Map<string, Group>();
  for (const profile of profiles) {
    const key = identity(profile);
    const group = map.get(key);
    if (group) group.profiles.push(profile);
    else map.set(key, { key, name: profile.name, profiles: [profile] });
  }
  return [...map.values()].sort((a, b) => {
    const ap = a.profiles.some((p) => p.id === pinnedId);
    const bp = b.profiles.some((p) => p.id === pinnedId);
    if (ap !== bp) return ap ? -1 : 1;
    return a.profiles[0].createdAt - b.profiles[0].createdAt;
  });
}

function comparePair(profiles: Profile[], pinnedId: string | null): [Profile, Profile] | null {
  const pinned = profiles.find((p) => p.id === pinnedId);
  if (pinned) {
    const other = profiles.find((p) => p.id !== pinned.id && identity(p) !== identity(pinned));
    if (other) return [pinned, other];
  }
  for (let a = 0; a < profiles.length; a += 1) {
    const other = profiles.slice(a + 1).find((p) => identity(p) !== identity(profiles[a]));
    if (other) return [profiles[a], other];
  }
  return null;
}

export default function ProfileList({ onPromptDelete }: { onPromptDelete: (id: string) => void }) {
  const profiles = useStore((s) => s.profiles);
  const pinnedId = useStore((s) => s.pinnedProfileId);
  const pin = useStore((s) => s.pinProfile);
  const unpin = useStore((s) => s.unpinProfile);
  const remove = useStore((s) => s.deleteProfile);
  const [allMine, setAllMine] = useState(false);
  const [allShared, setAllShared] = useState(false);
  const [groupDelete, setGroupDelete] = useState<Profile | null>(null);
  const reduced = useReducedMotion();
  const ownership = splitProfilesByOwnership(profiles, pinnedId);
  const mine = groupsOf(ownership.mine, pinnedId);
  const shared = groupsOf(ownership.shared, pinnedId);
  const pair = comparePair(profiles, pinnedId);
  const deleteGroup = groupDelete?.personGroupId
    ? profiles.filter((p) => p.personGroupId === groupDelete.personGroupId)
    : [];

  const renderGroups = (groups: Group[], owned: boolean) => (
    <motion.div
      data-home-profile-stack
      className="overflow-hidden rounded-2xl"
      style={{ background: "var(--profile-stack-surface)", boxShadow: "inset 0 0 0 1px var(--profile-stack-border)" }}
      initial={reduced ? false : "hidden"}
      animate="show"
      variants={STAGGER_CHILDREN}
    >
      {groups.map((group, groupIndex) => {
        const paired = group.profiles.length > 1;
        return (
          <motion.section
            key={group.key}
            variants={fadeUp(10)}
            style={groupIndex ? { borderTop: "1px solid color-mix(in srgb, var(--border) 72%, transparent)" } : undefined}
          >
            {paired && (
              <div className="flex items-center gap-3 px-3.5 py-3" style={{ borderBottom: "1px solid color-mix(in srgb, var(--border) 72%, transparent)" }}>
                <Avatar profile={group.profiles[0]} small />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>{group.name}</p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text2)" }}>Twee afzonderlijke perspectieven</p>
                </div>
                {group.profiles.length === 2 && (
                  <Link href={`/compare?a=${group.profiles[0].id}&b=${group.profiles[1].id}`} prefetch={false} className="focus-ring inline-flex min-h-11 items-center px-1 text-xs font-semibold" style={{ color: "var(--accent)" }}>
                    Vergelijk kanten
                  </Link>
                )}
              </div>
            )}
            {group.profiles.map((profile, index) => (
              <ProfileRow
                key={profile.id}
                profile={profile}
                pinnedId={pinnedId}
                showName={!paired}
                divider={index > 0}
                owned={owned}
                onPin={owned ? () => profile.id === pinnedId ? unpin() : pin(profile.id) : undefined}
                onDelete={owned ? () => paired ? setGroupDelete(profile) : onPromptDelete(profile.id) : undefined}
              />
            ))}
          </motion.section>
        );
      })}
    </motion.div>
  );

  return (
    <>
      {mine.length > 0 && (
        <Section id="mine" label="Mijn profielen">
          {renderGroups(allMine ? mine : mine.slice(0, 1), true)}
          {mine.length > 1 && <Disclosure expanded={allMine} label={allMine ? "Minder profielen" : `Alle profielen · ${ownership.mine.length}`} onClick={() => setAllMine((v) => !v)} />}
        </Section>
      )}

      {shared.length > 0 && (
        <Section id="shared" label="Gedeeld met mij">
          {renderGroups(allShared ? shared : shared.slice(0, 3), false)}
          {shared.length > 3 && <Disclosure expanded={allShared} label={allShared ? "Minder gedeelde profielen" : `Alle gedeelde profielen · ${ownership.shared.length}`} onClick={() => setAllShared((v) => !v)} />}
        </Section>
      )}

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start">
        {pair ? (
          <Link
            data-home-compare-feature
            href={`/compare?a=${pair[0].id}&b=${pair[1].id}`}
            prefetch={false}
            className="focus-ring block rounded-2xl p-4 transition-opacity hover:opacity-90 lg:col-span-2"
            style={{
              background: "linear-gradient(145deg, color-mix(in srgb, var(--identity-a) 6%, var(--surface)), color-mix(in srgb, var(--action-primary) 6%, var(--surface)))",
              border: "1px solid var(--border-accent)",
              boxShadow: "0 8px 22px color-mix(in srgb, var(--accent) 9%, transparent)",
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex flex-none items-center" aria-hidden="true"><Coin profile={pair[0]} /><Coin profile={pair[1]} overlap /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg italic leading-tight" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>
                  {pair[0].name}<span aria-hidden="true" style={{ color: "var(--accent)", fontStyle: "normal" }}> × </span>{pair[1].name}
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>Bekijk overeenkomsten, bespreekpunten en grenzen.</p>
              </div>
              <CaretRight size={16} aria-hidden="true" style={{ color: "var(--accent)" }} />
            </div>
          </Link>
        ) : (
          <p className="px-1 py-2 text-sm leading-relaxed lg:col-span-2" style={{ color: "var(--text2)" }}>Voeg een profiel van een andere persoon toe om te vergelijken.</p>
        )}

        <div data-home-utility-list className="flex flex-col lg:col-span-2" style={{ borderTop: "1px solid color-mix(in srgb, var(--border) 72%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--border) 72%, transparent)" }}>
          {[
            { href: "/contracts", label: "Contracten", icon: FileText },
            { href: "/scenes", label: "Scènes", icon: FilmSlate },
            { href: "/intimacy", label: "Agenda", icon: CalendarDots },
          ].map(({ href, label, icon: Icon }, index) => (
            <Link key={href} href={href} className="focus-ring flex min-h-12 items-center gap-3 px-1" style={index ? { borderTop: "1px solid color-mix(in srgb, var(--border) 58%, transparent)" } : undefined}>
              <Icon size={17} aria-hidden="true" style={{ color: "var(--identity-a)" }} />
              <span className="flex-1 text-sm font-medium">{label}</span>
              <CaretRight size={14} aria-hidden="true" style={{ color: "var(--text2)" }} />
            </Link>
          ))}
        </div>
      </div>

      <Sheet open={groupDelete !== null} onClose={() => setGroupDelete(null)} scrollable aria-label="Gekoppeld profiel verwijderen">
        <SheetContent showClose={false} className="px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <h2 className="mb-2 text-xl font-bold">Wat wil je verwijderen?</h2>
          <p className="mb-5 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>{groupDelete?.name} heeft een dominant en submissief profiel met aparte antwoorden.</p>
          <div className="grid gap-2">
            <button type="button" onClick={() => { if (groupDelete) remove(groupDelete.id); setGroupDelete(null); }} className="focus-ring min-h-12 rounded-xl px-4 text-left text-sm font-semibold" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>Alleen {groupDelete?.role ?? "dit perspectief"} verwijderen</button>
            <button type="button" onClick={() => { deleteGroup.forEach((p) => remove(p.id)); setGroupDelete(null); }} className="focus-ring min-h-12 rounded-xl px-4 text-left text-sm font-bold" style={{ background: "color-mix(in srgb, var(--hard-no) 15%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--hard-no)" }}>Beide kanten verwijderen</button>
            <button type="button" onClick={() => setGroupDelete(null)} className="focus-ring min-h-12 rounded-xl text-sm font-semibold" style={{ color: "var(--text2)", border: "1px solid var(--border)" }}>Annuleer</button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Section({ id, label, children }: { id: "mine" | "shared"; label: string; children: ReactNode }) {
  const labelId = `home-${id}-profiles-label`;
  return <section className="mb-5" aria-labelledby={labelId}><h2 id={labelId} className="mb-2 px-1 text-base italic leading-6" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>{label}</h2>{children}</section>;
}

function Disclosure({ expanded, label, onClick }: { expanded: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={expanded} className="focus-ring mt-1 flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-left text-sm font-medium" style={{ color: "var(--text2)" }}>
      <UsersThree size={17} aria-hidden="true" style={{ color: "var(--identity-a)" }} /><span className="flex-1">{label}</span>{expanded ? <CaretUp size={14} aria-hidden="true" /> : <CaretDown size={14} aria-hidden="true" />}
    </button>
  );
}

function ProfileRow({ profile, pinnedId, showName, divider, owned, onPin, onDelete }: { profile: Profile; pinnedId: string | null; showName: boolean; divider: boolean; owned: boolean; onPin?: () => void; onDelete?: () => void }) {
  const [actions, setActions] = useState(false);
  const details = [showName && profile.role ? profile.role : null, owned && profile.experienceLevel ? experienceLevelLabel(profile.experienceLevel) : null].filter(Boolean).join(" · ");
  return (
    <div className="px-3 py-3" style={divider ? { borderTop: "1px solid color-mix(in srgb, var(--border) 72%, transparent)" } : undefined}>
      <div className="flex items-center gap-1">
        <Link href={`/profile/${profile.id}`} prefetch={false} className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-xl" aria-label={`${profile.name} ${profile.role} openen`}>
          {showName && <Avatar profile={profile} />}
          <div className="min-w-0 flex-1"><p className="truncate text-base italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>{showName ? profile.name : profile.role}</p>{details && <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text2)" }}>{details}</p>}</div>
          <CaretRight size={14} className="flex-none" aria-hidden="true" style={{ color: "var(--text2)" }} />
        </Link>
        {owned && onPin && onDelete && <button type="button" onClick={() => setActions(true)} aria-label={`Meer acties voor ${profile.name}`} aria-haspopup="dialog" aria-expanded={actions} className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-full" style={{ color: "var(--text2)" }}><DotsThree aria-hidden="true" size={20} weight="bold" /></button>}
      </div>
      {owned && onPin && onDelete && (
        <Sheet open={actions} onClose={() => setActions(false)} aria-label={`Acties voor ${profile.name}`}>
          <SheetContent className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
            <div className="mb-3 px-1"><h3 className="text-lg font-semibold">{profile.name}</h3><p className="mt-0.5 text-sm" style={{ color: "var(--text2)" }}>{profile.role}</p></div>
            <button type="button" onClick={() => { setActions(false); onPin(); }} aria-pressed={profile.id === pinnedId} className="focus-ring flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium" style={{ color: profile.id === pinnedId ? "var(--accent)" : "var(--text)", background: "var(--surface2)" }}>{profile.id === pinnedId ? <PushPinSlash aria-hidden="true" size={18} /> : <PushPin aria-hidden="true" size={18} />}{profile.id === pinnedId ? "Niet langer als mijn profiel" : "Markeer als mijn profiel"}</button>
            <Link href={`/profile/${profile.id}?edit=1`} prefetch={false} onClick={() => setActions(false)} className="focus-ring mt-2 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium" style={{ background: "var(--surface2)" }}><PencilSimple aria-hidden="true" size={18} />Profiel bewerken</Link>
            <button type="button" onClick={() => { setActions(false); onDelete(); }} className="focus-ring mt-2 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium" style={{ color: "var(--hard-no)", background: "color-mix(in srgb, var(--hard-no) 6%, var(--surface2))" }}><Trash aria-hidden="true" size={18} />Profiel verwijderen</button>
            <button type="button" onClick={() => setActions(false)} className="focus-ring mt-3 min-h-11 w-full rounded-xl px-3 text-sm font-medium" style={{ color: "var(--text2)" }}>Sluiten</button>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function Avatar({ profile, small = false }: { profile: Profile; small?: boolean }) {
  return <div className={`${small ? "h-9 w-9" : "h-12 w-12"} flex-none overflow-hidden rounded-full`} aria-hidden="true" style={{ border: "1px solid color-mix(in srgb, var(--border-accent) 62%, var(--border))", boxShadow: "0 3px 10px var(--deep-shadow)" }}>{profile.avatarDataUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={profile.avatarDataUrl} alt="" className="h-full w-full object-cover" />
  ) : <div className="flex h-full w-full items-center justify-center text-base italic" style={avatarStyle(profile.name)}>{profile.name[0]?.toUpperCase() ?? "?"}</div>}</div>;
}

function Coin({ profile, overlap = false }: { profile: Profile; overlap?: boolean }) {
  return <div className={`h-12 w-12 flex-none overflow-hidden rounded-full ${overlap ? "-ml-3" : ""}`} style={{ border: "1px solid color-mix(in srgb, var(--border-accent) 62%, var(--border))", boxShadow: overlap ? "0 0 0 1px var(--surface), 0 5px 14px var(--deep-shadow)" : "0 5px 14px var(--deep-shadow)" }}>{profile.avatarDataUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={profile.avatarDataUrl} alt="" className="h-full w-full object-cover" />
  ) : <div className="flex h-full w-full items-center justify-center text-lg italic" style={avatarStyle(profile.name)}>{profile.name[0]?.toUpperCase() ?? "?"}</div>}</div>;
}
