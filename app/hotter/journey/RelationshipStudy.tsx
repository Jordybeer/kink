"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowsLeftRight, Check, Eye, EyeSlash, MagnifyingGlass, PencilSimple, X } from "@phosphor-icons/react";
import { KINKS } from "@/lib/kinks";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/statusLabels";
import { visibleStatus } from "@/lib/privateResponses";
import { COMPARE_FACT_LABEL, compactComparisonName, comparisonDirectionNote } from "@/lib/comparePresentation";
import type { ComparisonFact, CompareFactKind } from "@/lib/compareV2";
import type { KinkStatus, Profile } from "@/types";
import { useJourney } from "./JourneyProvider";
import { changeResponse, findRelationshipProfile, getPair, identityTone, isDiscussed, perspectiveLabel, relationshipModel, selectRelationship, toggleDiscussion } from "./relationshipSession";
import "./relationship.css";

const ROOT = "/hotter/journey/connection/people";
const topicNames = new Map(KINKS.map(k => [k.id,k.name]));
function topicName(id: string) { return topicNames.get(id) ?? id; }

export type IdentityOrigin = { id: string; rect: DOMRect; time: number };
function useIdentityArrival() {
  const { identityOrigin } = useJourney();
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const origin = identityOrigin.current;
    identityOrigin.current = null;
    if (!origin || !root.current || document.hidden || !navigator.onLine || matchMedia("(prefers-reduced-motion: reduce)").matches || performance.now()-origin.time>800) return;
    const target = Array.from(root.current.querySelectorAll<HTMLElement>("[data-identity-anchor]")).find(el => el.dataset.identityAnchor === origin.id);
    if (!target || !target.animate) return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height || !origin.rect.width || !origin.rect.height) return;
    const x = origin.rect.left+origin.rect.width/2-rect.left-rect.width/2;
    const y = origin.rect.top+origin.rect.height/2-rect.top-rect.height/2;
    if (Math.abs(x)>innerWidth || Math.abs(y)>innerHeight) return;
    const animation=target.animate([{transform:"translate("+x+"px,"+y+"px) scale("+Math.max(.4,Math.min(1.7,origin.rect.width/rect.width))+")"},{transform:"none"}],{duration:380,easing:"cubic-bezier(.22,.75,.2,1)"});
    const cancel=()=>animation.cancel();
    const mq=matchMedia("(prefers-reduced-motion: reduce)");
    window.addEventListener("pagehide",cancel); window.addEventListener("resize",cancel); window.addEventListener("pointerdown",cancel,true); window.addEventListener("scroll",cancel,true); document.addEventListener("visibilitychange",cancel); mq.addEventListener("change",cancel);
    return ()=>{cancel();window.removeEventListener("pagehide",cancel);window.removeEventListener("resize",cancel);window.removeEventListener("pointerdown",cancel,true);window.removeEventListener("scroll",cancel,true);document.removeEventListener("visibilitychange",cancel);mq.removeEventListener("change",cancel);};
  },[identityOrigin]);
  return root;
}
function Avatar({profile}:{profile:Profile}) {
  return <span className="relationship-avatar" data-person={identityTone(profile)} data-identity-anchor={profile.id} aria-hidden="true">{profile.name[0]}</span>;
}
function IdentityLink({profile,href,children,className,label}:{profile:Profile;href:string;children:ReactNode;className?:string;label?:string}) {
  const {identityOrigin}=useJourney();
  function capture(event:MouseEvent<HTMLAnchorElement>){
    if(event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
    const anchor=event.currentTarget.querySelector<HTMLElement>("[data-identity-anchor]");
    if(anchor)identityOrigin.current={id:profile.id,rect:anchor.getBoundingClientRect(),time:performance.now()};
  }
  return <Link href={href} className={className} aria-label={label} onClick={capture}>{children}</Link>;
}
function Verdict({status}:{status:KinkStatus}) {
  return <span className="journey-verdict" data-status={status??"unknown"}><span aria-hidden="true"/>{status?STATUS_LABEL[status]:"Onbeantwoord"}</span>;
}
function PersonLink({profile}:{profile:Profile}) {
  return <IdentityLink profile={profile} href={ROOT+"/"+profile.id} className="relationship-personrow" label={"Bekijk "+profile.name+(profile.id.endsWith("alt")||profile.id.endsWith("empty")?" "+perspectiveLabel(profile.id):"")}>
    <Avatar profile={profile}/><div><h3>{profile.name}</h3><p>{perspectiveLabel(profile.id)}</p></div><ArrowRight size={19} aria-hidden="true"/>
  </IdentityLink>;
}
export function PeopleStudy(){
  const {relationship}=useJourney();
  const root=useIdentityArrival();
  const [a,b]=getPair(relationship);
  return <section className="relationship-study" ref={root}>
    <header className="relationship-intro"><h1>Wie wil je ontdekken?</h1><p>Twee mensen, ieder met hun eigen perspectieven. Lees of vergelijk wat ze zelf hebben aangegeven.</p></header>
    <div className="relationship-reading">
      <section className="relationship-directory"><h2>Mijn perspectieven</h2>{relationship.profiles.filter(p=>p.origin==="own").map(p=><PersonLink key={p.id} profile={p}/>)}</section>
      <section className="relationship-directory"><h2>Gedeelde perspectieven</h2>{relationship.profiles.filter(p=>p.origin==="shared").map(p=><PersonLink key={p.id} profile={p}/>)}</section>
      <Link href={ROOT+"/compare"} className="relationship-invitation"><div className="relationship-mini-pair"><Avatar profile={a}/><Avatar profile={b}/></div><div><h2>Ontdek elkaar</h2><p>{a.name} &amp; {b.name}</p></div><ArrowRight size={20} aria-hidden="true"/></Link>
      <p className="journey-muted relationship-disclaimer">Fictieve profielen. Deze antwoorden staan los van je eigen vragenlijst.</p>
      <Link href="/hotter/journey/connection" className="conversation-reference">Bekijk de eerste vergelijkingsproef</Link>
    </div>
  </section>;
}
export function PersonStudy({id}:{id:string}){
  const {relationship,setRelationship,identityOrigin}=useJourney();
  const p=findRelationshipProfile(relationship,id)!;
  const root=useIdentityArrival();
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState<"all"|"boundary">("all");
  const [revealed,setRevealed]=useState<string[]>([]);
  const [noteOpen,setNoteOpen]=useState(false);
  const [editing,setEditing]=useState<string|null>(null);
  const [draft,setDraft]=useState<KinkStatus>(null);
  const editorRef=useRef<HTMLFieldSetElement>(null);
  const editTrigger=useRef<HTMLButtonElement|null>(null);
  const own=p.origin==="own"&&!p.isImported;
  useEffect(()=>{
    function clear(){setRevealed([]);setNoteOpen(false);setEditing(null);setDraft(null);}
    function visibility(){if(document.hidden)clear();}
    window.addEventListener("pagehide",clear);window.addEventListener("popstate",clear);document.addEventListener("visibilitychange",visibility);
    return()=>{window.removeEventListener("pagehide",clear);window.removeEventListener("popstate",clear);document.removeEventListener("visibilitychange",visibility);};
  },[]);
  useEffect(()=>{if(editing)editorRef.current?.querySelector("button")?.focus({preventScroll:true});},[editing]);
  const rows=Object.entries(p.entries).filter(([topic,entry])=>{
    const visible=visibleStatus(entry,revealed.includes(topic));
    return topicName(topic).toLocaleLowerCase("nl-BE").includes(search.trim().toLocaleLowerCase("nl-BE"))
      && (filter==="all"||visible==="hard_no");
  });
  function closeEditor(){setEditing(null);setDraft(null);requestAnimationFrame(()=>editTrigger.current?.focus());}
  return <section className="relationship-study" ref={root}>
    <header className="relationship-personhero" data-person={identityTone(p)}>
      <Link href={ROOT} className="relationship-back" onClick={()=>{const anchor=root.current?.querySelector<HTMLElement>("[data-identity-anchor]");if(anchor)identityOrigin.current={id:p.id,rect:anchor.getBoundingClientRect(),time:performance.now()};}}><ArrowLeft size={17} aria-hidden="true"/> Alle perspectieven</Link>
      <div className="relationship-personidentity"><Avatar profile={p}/><div><h1>{p.name}</h1><p>{perspectiveLabel(p.id)}</p></div></div>
      <p>{own?"Je eigen woorden, je eigen grenzen.":"Dit perspectief is gedeeld en alleen-lezen."}</p>
    </header>
    <div className="relationship-reading">
      <section className="relationship-directory"><h2>Antwoorden</h2>
        <div className="relationship-search"><MagnifyingGlass size={18} aria-hidden="true"/><input aria-label="Zoek onderwerp" placeholder="Zoek onderwerp" value={search} onChange={e=>{setSearch(e.target.value);setEditing(null);setDraft(null);}}/><button type="button" aria-label="Wis zoekterm" disabled={!search} onClick={()=>setSearch("")}><X size={17} aria-hidden="true"/></button></div>
        <div className="relationship-filters" role="group" aria-label="Antwoorden filteren">
          <button type="button" aria-pressed={filter==="all"} onClick={()=>{setFilter("all");setEditing(null);setDraft(null);}}>Alle onderwerpen</button><button type="button" aria-pressed={filter==="boundary"} onClick={()=>{setFilter("boundary");setEditing(null);setDraft(null);}}>Harde grenzen</button>
        </div>
        {rows.length===0&&<p className="journey-muted relationship-empty">{Object.keys(p.entries).length===0?"Nog geen antwoorden in dit perspectief.":"Geen onderwerpen gevonden."}</p>}
        {rows.map(([topic,entry])=>{
          const open=revealed.includes(topic), concealed=entry.privateResponse&&!open;
          return <div key={topic} className="relationship-profiletopic">
            <div className="relationship-profileline"><div><h3>{topicName(topic)}</h3>{concealed?<p className="journey-muted">Privéantwoord</p>:<Verdict status={entry.status}/>}</div>
              <div className="relationship-rowactions">
                {entry.privateResponse&&own&&<button type="button" aria-label={(open?"Verberg ":"Toon ")+topicName(topic)} aria-expanded={open} onClick={()=>{setRevealed(list=>open?list.filter(i=>i!==topic):[...list,topic]);setEditing(null);setDraft(null);}}>{open?<EyeSlash size={19} aria-hidden="true"/>:<Eye size={19} aria-hidden="true"/>}</button>}
                {own&&!concealed&&<button type="button" aria-label={"Bewerk "+topicName(topic)} onClick={e=>{editTrigger.current=e.currentTarget;setDraft(entry.status);setEditing(topic);}}><PencilSimple size={19} aria-hidden="true"/></button>}
              </div>
            </div>
            {!concealed&&entry.comment&&<p className="journey-muted relationship-comment">{entry.comment}</p>}
            {editing===topic&&!concealed&&<fieldset className="relationship-inlineedit" ref={editorRef}><legend>Antwoord aanpassen</legend><div className="relationship-editchoices">{STATUS_ORDER.map(status=><button type="button" key={status} aria-pressed={draft===status} onClick={()=>setDraft(draft===status?null:status)}>{STATUS_LABEL[status]}</button>)}</div><div className="relationship-editactions"><button type="button" onClick={closeEditor}>Annuleren</button><button type="button" className="journey-primary" onClick={()=>{setRelationship(state=>changeResponse(state,id,topic,draft));closeEditor();}}>Bewaar antwoord</button></div></fieldset>}
          </div>;
        })}
      </section>
      {own&&p.privateNote&&<section className="relationship-private"><h2>Alleen voor jou</h2><button className="journey-textaction" type="button" aria-expanded={noteOpen} onClick={()=>setNoteOpen(!noteOpen)}>{noteOpen?<EyeSlash size={18} aria-hidden="true"/>:<Eye size={18} aria-hidden="true"/>}{noteOpen?"Verberg privénotitie":"Toon privénotitie"}</button>{noteOpen&&<p className="journey-revealed">{p.privateNote}</p>}</section>}
      <section className="relationship-directory"><h2>Ander perspectief</h2>{relationship.profiles.filter(other=>other.id!==p.id&&other.personGroupId===p.personGroupId).map(other=><PersonLink key={other.id} profile={other}/>)}</section>
      <Link href={ROOT+"/compare"} className="journey-nextlink" onClick={()=>setRelationship(s=>p.personGroupId==="journey-noor"?selectRelationship(s,p.id,"jules"):selectRelationship(s,"noor",p.id))}>Vergelijk met {p.name==="Noor"?"Jules":"Noor"} <ArrowRight size={18} aria-hidden="true"/></Link>
    </div>
  </section>;
}

const GROUPS:readonly {label:string;kinds:readonly CompareFactKind[];id:string}[]=[
  {label:"Harde grenzen",kinds:["conflict","limit"],id:"boundary"},
  {label:"Ruimte voor een gesprek",kinds:["discuss","soft"],id:"conversation"},
  {label:"Waar jullie elkaar vinden",kinds:["shared","complementary"],id:"shared"},
];
export function CompareStudy(){
  const {relationship,setRelationship}=useJourney();
  const root=useIdentityArrival();
  const [a,b]=getPair(relationship);
  const model=useMemo(()=>relationshipModel(relationship),[relationship]);
  const [filter,setFilter]=useState("all");
  function sideSelect(side:"left"|"right",id:string){setRelationship(s=>side==="left"?selectRelationship(s,id,s.right):selectRelationship(s,s.left,id));}
  function side(profile:Profile,other:Profile,position:"left"|"right"){
    return <div className="relationship-side" data-person={identityTone(profile)}>
      <IdentityLink profile={profile} href={ROOT+"/"+profile.id} className="relationship-sideidentity" label={"Bekijk "+profile.name}><Avatar profile={profile}/><span>{profile.name}</span></IdentityLink>
      <select aria-label={position==="left"?"Linker perspectief":"Rechter perspectief"} value={profile.id} onChange={e=>sideSelect(position,e.target.value)}>{relationship.profiles.filter(p=>p.personGroupId!==other.personGroupId).map(p=><option key={p.id} value={p.id}>{perspectiveLabel(p.id)}</option>)}</select>
    </div>;
  }
  function factRow(fact:ComparisonFact){
    const discussed=isDiscussed(relationship,fact);
    const direction=comparisonDirectionNote(fact,a,b);
    return <article className="relationship-fact" key={fact.id} data-fact-topic={fact.kinkAId} data-kind={fact.kind}>
      <div className="relationship-factheading"><h3>{compactComparisonName(fact.label)}</h3><p>{COMPARE_FACT_LABEL[fact.kind]}</p></div>
      {direction&&<p className="journey-muted relationship-direction">{direction}</p>}
      <div className="relationship-factpair"><div data-person={identityTone(a)}><small>{a.name}</small><Verdict status={fact.statusA}/></div><div data-person={identityTone(b)}><small>{b.name}</small><Verdict status={fact.statusB}/></div></div>
      <button type="button" className="relationship-ack" aria-pressed={discussed} onClick={()=>setRelationship(s=>toggleDiscussion(s,fact.id))}>{discussed&&<Check size={16} aria-hidden="true"/>}{discussed?"Besproken":"Markeer als besproken"}</button>
    </article>;
  }
  const visibleGroups=GROUPS.filter(group=>filter==="all"||filter===group.id);
  return <section className="relationship-study" ref={root}>
    <header className="relationship-comparehero">
      <Link href={ROOT} className="relationship-back"><ArrowLeft size={17} aria-hidden="true"/> Alle perspectieven</Link>
      <div className="relationship-pairhead">{side(a,b,"left")}<button type="button" aria-label="Wissel perspectieven" className="relationship-swap" onClick={()=>setRelationship(s=>selectRelationship(s,s.right,s.left))}><ArrowsLeftRight size={20} aria-hidden="true"/></button>{side(b,a,"right")}</div>
      <h1>{a.name} &amp; {b.name}</h1><p>Naast elkaar, niet tegen elkaar. Alleen zichtbare antwoorden tellen mee.</p>
    </header>
    <div className="relationship-reading">
      <p className="relationship-consent">Overlap is geen toestemming. Een grens blijft een grens.</p>
      <div className="relationship-filters relationship-comparefilters" role="group" aria-label="Vergelijking filteren">{[{id:"all",label:"Alles"},{id:"boundary",label:"Grenzen"},{id:"conversation",label:"Bespreken"},{id:"shared",label:"Overlap"},{id:"unknown",label:"Nog open"}].map(item=><button key={item.id} type="button" aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)}>{item.label}</button>)}</div>
      {model.facts.length===0&&<p className="journey-muted relationship-empty">Nog geen gezamenlijk beoordeelde onderwerpen.</p>}
      {visibleGroups.map(group=>{const facts=model.facts.filter(f=>group.kinds.includes(f.kind));return facts.length>0?<section className="relationship-result" data-group={group.id} key={group.id}><h2>{group.label}</h2>{facts.map(factRow)}</section>:filter!=="all"?<p className="journey-muted relationship-empty" key={group.id}>Geen onderwerpen in deze groep.</p>:null;})}
      {(filter==="all"||filter==="unknown")&&<section className="relationship-result"><h2>Nog open</h2>{model.unpaired.length===0?<p className="journey-muted">Geen eenzijdig zichtbare antwoorden.</p>:model.unpaired.map(item=><article key={item.id} className="relationship-fact"><h3>{compactComparisonName(item.label)}</h3><div className="relationship-factpair"><div data-person={identityTone(a)}><small>{a.name}</small>{item.visibleSide==="a"?<Verdict status={item.status}/>:<span className="journey-muted">Geen zichtbaar antwoord</span>}</div><div data-person={identityTone(b)}><small>{b.name}</small>{item.visibleSide==="b"?<Verdict status={item.status}/>:<span className="journey-muted">Geen zichtbaar antwoord</span>}</div></div></article>)}</section>}
      <Link href="/hotter/journey/together/atelier" className="journey-nextlink">Maak ruimte voor een moment <ArrowRight size={18} aria-hidden="true"/></Link>
    </div>
  </section>;
}
