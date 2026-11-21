"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import Wordmark from "@/components/Wordmark";
import KinkListRow from "@/components/KinkListRow";
import { useTopNavActions, type TopNavAction } from "@/components/nav/TopNavContext";
import { avatarStyle } from "@/lib/avatar";
import { KINKS } from "@/lib/kinks";
import { perspectives, FOLIO_HOME, type FolioProfile } from "./fixtures";
import { useFolioArrival } from "./FolioMotion";

const NO_ACTIONS: TopNavAction[] = [];
const noop = () => {};
const linked = perspectives.filter(person => person.linked);
const groupKeys = linked.map(person => person.id).join(" ");

function Portrait({ profile, keys }: { profile: FolioProfile; keys: string }) {
  return <span aria-hidden="true" data-folio-avatar={keys} className="folio-portrait" style={avatarStyle(profile.name)}>
    {profile.name.charAt(0)}
  </span>;
}

function Row({ profile }: { profile: FolioProfile }) {
  return <Link href={`${FOLIO_HOME}/${profile.id}`} data-folio-open={profile.id}
    aria-label={`${profile.name} · ${profile.role} openen`} className="folio-row focus-ring">
    {!profile.linked && <Portrait profile={profile} keys={profile.id} />}
    <span className="min-w-0 flex-1">
      {!profile.linked && <span className="folio-name" data-folio-name={profile.id}>{profile.name}</span>}
      <span className="folio-role" data-folio-role={profile.id}>{profile.role}</span>
    </span>
    <CaretRight size={15} aria-hidden="true" />
    <span data-folio-rule={profile.id} className="folio-rule" aria-hidden="true" />
  </Link>;
}

export default function FolioScreen({ profile }: { profile?: FolioProfile }) {
  const screen = useRef<HTMLDivElement>(null);
  const arrive = useFolioArrival();
  useTopNavActions(NO_ACTIONS, profile ? "Profiel" : "Mijn profielen", profile ? FOLIO_HOME : "/hot");
  useLayoutEffect(() => { if (screen.current) arrive(screen.current, profile?.id); }, [arrive, profile?.id]);

  return <PageShell width="lg">
    <div ref={screen} data-folio-screen={profile?.id ?? "home"} className="folio-screen">
      {profile ? <>
        <header className="folio-hero">
          <Portrait profile={profile} keys={profile.id} />
          <div className="min-w-0">
            <h1 tabIndex={-1}><span data-folio-name={profile.id} className="folio-name">{profile.name}</span></h1>
            <span className="folio-role" data-folio-role={profile.id}>{profile.role}</span>
          </div>
          <span className="folio-rule" data-folio-rule={profile.id} aria-hidden="true" />
        </header>
        <section data-folio-body className="folio-reading">
          <h2>Interesses &amp; grenzen</h2>
          {profile.topics.map((id, index) => {
            const kink = KINKS.find(item => item.id === id);
            return kink && <KinkListRow key={id} kink={kink} entry={{ status: index === 0 ? "yes" : "maybe", comment: "" }} onOpen={noop} editable={false} />;
          })}
        </section>
      </> : <>
        <h1 className="folio-mast"><Wordmark /></h1>
        <h2 className="folio-subhead">Mijn profielen</h2>
        {perspectives.filter(person => !person.linked).map(person => <Row profile={person} key={person.id} />)}
        <div className="folio-group">
          <Portrait profile={linked[0]} keys={groupKeys} />
          <span className="folio-name" data-folio-name={groupKeys}>{linked[0].name}</span>
        </div>
        {linked.map(person => <Row profile={person} key={person.id} />)}
      </>}
    </div>
  </PageShell>;
}
