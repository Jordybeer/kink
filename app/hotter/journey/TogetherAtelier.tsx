"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Bell, CalendarPlus, CaretLeft, CaretRight, Check, PencilSimple, Plus } from "@phosphor-icons/react";
import type { IntimacyRecord } from "@/lib/intimacyStore";
import { useJourney } from "./JourneyProvider";
import { PARTNERS, openMoment, patchMoment, discardMoment, saveMoment, hasMomentChanges, moveMonth, calendarContents, validMomentDate } from "./togetherSession";
import "./atelier.css";

export const ATELIER_ROOT="/hotter/journey/together/atelier";
const dateFormatter=new Intl.DateTimeFormat("nl-BE",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
const monthFormatter=new Intl.DateTimeFormat("nl-BE",{month:"long",year:"numeric",timeZone:"UTC"});
const dayFormatter=new Intl.DateTimeFormat("nl-BE",{weekday:"short",timeZone:"UTC"});
const displayDate=(date:string)=>{const d=new Date(date+"T12:00:00Z");return Number.isFinite(d.getTime())?dateFormatter.format(d):"Datum kiezen";};
export function AtelierNav(){
  const path=usePathname();
  return <nav className="atelier-nav" aria-label="Samen ervaren">
    {[["","Agenda"],["/agreements","Afspraken"],["/scenes","Scènes"]].map(([suffix,label])=><Link key={suffix} href={ATELIER_ROOT+suffix} aria-current={path===ATELIER_ROOT+suffix?"page":undefined}>{label}</Link>)}
  </nav>;
}

function DateIdentity({ record, heading=false }: { record: Pick<IntimacyRecord,"date"|"time"|"title"|"partnerName">; heading?:boolean }){
  const title=record.title?.trim()||"Privé moment";
  return <div className="atelier-identity">
    <div className="atelier-day" aria-hidden="true"><span>{record.date.slice(8,10)}</span><small>{dayFormatter.format(new Date(record.date+"T12:00:00Z"))}</small></div>
    <div className="atelier-identitycopy">{heading?<h1>{title}</h1>:<h3>{title}</h3>}<p>{displayDate(record.date)}{record.time?" · "+record.time:""}</p><p>{record.partnerName?"Met "+record.partnerName:"Geen partner gekozen"}</p></div>
  </div>;
}

function CalendarExport({record}:{record:IntimacyRecord}){
  const [details,setDetails]=useState(false);
  const [error,setError]=useState("");
  function download(){
    try {
      const file=calendarContents(record,details);
      const url=URL.createObjectURL(new Blob([file],{type:"text/calendar;charset=utf-8"}));
      const link=document.createElement("a");
      link.href=url;link.download="voorbeeldmoment.ics";document.body.append(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      setError("");
    } catch {setError("Kies eerst een geldige datum en tijd.");}
  }
  return <details className="atelier-export"><summary>Agenda-export</summary><p>Een lokaal voorbeeldbestand. Standaard bevat dit alleen een neutrale titel, datum, tijd en eventuele herinnering.</p><label><input type="checkbox" checked={details} onChange={e=>setDetails(e.target.checked)}/> Voeg ook titel, partner en notitie toe</label><button className="journey-textaction" type="button" onClick={download} disabled={!record.time}><CalendarPlus size={18} aria-hidden="true"/> Download agenda-item</button>{error&&<p role="alert">{error}</p>}</details>;
}

export default function TogetherAtelier(){
  const {together,setTogether}=useJourney();
  const draft=together.draft;
  const [confirmDiscard,setConfirmDiscard]=useState(false);
  const [failNext,setFailNext]=useState(false);
  const [dayError,setDayError]=useState("");
  const heading=useRef<HTMLHeadingElement>(null);
  const identity=useRef<HTMLDivElement>(null);
  const origin=useRef<DOMRect|null>(null);
  // On returning from another journey route, the provider still owns the draft.
  const returnId=useRef<string|null>(draft?.id??null);
  const returnAction=useRef<"edit"|"log"|"new">(draft&&!together.moments.some(m=>m.id===draft.id)?"new":"edit");
  const listRoot=useRef<HTMLDivElement>(null);
  const wasWriting=useRef(false);
  const writing=!!draft;

  useLayoutEffect(()=>{
    if(writing){
      heading.current?.focus({preventScroll:true});
      const source=origin.current;origin.current=null;
      const target=identity.current;
      const visible=target?.getBoundingClientRect();
      // A lower list entry can leave the destination above the scroll viewport.
      // Ensure the writer is readable before attempting decorative continuity.
      if(visible && (visible.top<0 || visible.bottom>window.innerHeight)){
        target?.scrollIntoView({block:"start",behavior:"instant"});
        return;
      }
      if(!source||!target||!target.animate||document.hidden||matchMedia("(prefers-reduced-motion: reduce)").matches||!navigator.onLine)return;
      const rect=target.getBoundingClientRect();
      if(source.bottom<0||source.top>innerHeight||rect.bottom<0||rect.top>innerHeight||!rect.height)return;
      const x=source.left-rect.left,y=source.top-rect.top;
      if(Math.abs(x)>innerWidth||Math.abs(y)>innerHeight)return;
      const animation=target.animate([{transform:"translate("+x+"px,"+y+"px) scale("+Math.max(.75,Math.min(1.25,source.height/rect.height))+")",transformOrigin:"top left"},{transform:"none",transformOrigin:"top left"}],{duration:320,easing:"cubic-bezier(.22,.75,.2,1)"});
      const cancel=()=>animation.cancel();
      const mq=matchMedia("(prefers-reduced-motion: reduce)");
      window.addEventListener("resize",cancel);window.addEventListener("pagehide",cancel);window.addEventListener("pointerdown",cancel,true);window.addEventListener("scroll",cancel,true);document.addEventListener("visibilitychange",cancel);mq.addEventListener("change",cancel);
      return ()=>{cancel();window.removeEventListener("resize",cancel);window.removeEventListener("pagehide",cancel);window.removeEventListener("pointerdown",cancel,true);window.removeEventListener("scroll",cancel,true);document.removeEventListener("visibilitychange",cancel);mq.removeEventListener("change",cancel);};
    }
  },[writing]);
  useEffect(()=>{
    if(wasWriting.current&&!writing){
      const id=returnId.current;
      const card=Array.from(listRoot.current?.querySelectorAll<HTMLElement>("[data-moment-id]")??[]).find(el=>el.dataset.momentId===id);
      const target=card?.querySelector<HTMLElement>('[data-moment-action="'+returnAction.current+'"]')??card?.querySelector<HTMLElement>("button")??listRoot.current?.querySelector<HTMLElement>("[data-moment-action=new]");
      target?.focus({preventScroll:true});target?.scrollIntoView({block:"nearest"});
    }
    wasWriting.current=writing;
  },[writing]);
  function begin(id?:string,complete=false,source?:HTMLElement|null){
    origin.current=source?.getBoundingClientRect()??null;returnId.current=id??null;returnAction.current=id?(complete?"log":"edit"):"new";
    setConfirmDiscard(false);setFailNext(false);setTogether(s=>openMoment(s,id,complete));
  }
  function change(patch:Parameters<typeof patchMoment>[1]){setTogether(s=>patchMoment(s,patch));}
  function cancel(){
    if(hasMomentChanges(together)){setConfirmDiscard(true);return;}
    setTogether(discardMoment);
  }
  function save(){
    const fail=failNext;const now=Date.now();setFailNext(false);setConfirmDiscard(false);
    setTogether(s=>saveMoment(s,now,fail));
  }
  const rows=together.moments.filter(m=>m.status===together.tab&&m.date.startsWith(together.month)&&(!together.day||m.date===together.day)).sort((a,b)=>together.tab==="planned"? (a.date+(a.time??"")).localeCompare(b.date+(b.time??"")):(b.date+(b.time??"")).localeCompare(a.date+(a.time??"")));
  const original=draft?together.moments.find(m=>m.id===draft.id):undefined;
  const logging=draft?.status==="completed"&&original?.status==="planned";

  if(draft)return <section className="atelier atelier-writer" onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();if(confirmDiscard)setConfirmDiscard(false);else if(together.details)setTogether(s=>({...s,details:false}));else cancel();}}}>
    <header className="atelier-writerbar"><button type="button" onClick={cancel}><ArrowLeft size={18} aria-hidden="true"/> Agenda</button><button type="button" aria-expanded={together.details} onClick={()=>setTogether(s=>({...s,details:!s.details}))}>{together.details?"Naar notitie":"Details"}</button></header>
    <div className="atelier-writerpage">
      <div ref={identity} className="atelier-writersubject"><p className="atelier-status">{logging?"Naar het logboek":draft.status==="planned"?"Gepland moment":"Logboek"}</p><h1 ref={heading} tabIndex={-1}>{draft.title?.trim()||"Een nieuw moment"}</h1><p>{displayDate(draft.date)}{draft.time?" · "+draft.time:""}{draft.partnerName?" · Met "+draft.partnerName:""}</p></div>
      <form noValidate onSubmit={e=>{e.preventDefault();save();}} className="atelier-writerform">
        {together.details?<div className="atelier-fields">
          <label htmlFor="atelier-title">Titel</label><input id="atelier-title" value={draft.title??""} onChange={e=>change({title:e.target.value})} placeholder="Privé moment"/>
          <div className="atelier-datetime"><div><label htmlFor="atelier-date">Datum</label><input id="atelier-date" type="date" value={draft.date} onChange={e=>change({date:e.target.value})} aria-invalid={together.error?.field==="date"} aria-describedby={together.error?.field==="date"?"atelier-error":undefined}/></div><div><label htmlFor="atelier-time">Tijd{draft.status==="completed"?" (optioneel)":""}</label><input id="atelier-time" type="time" value={draft.time??""} onChange={e=>change({time:e.target.value})} aria-invalid={together.error?.field==="time"} aria-describedby={together.error?.field==="time"?"atelier-error":undefined}/></div></div>
          <label htmlFor="atelier-partner">Met wie</label><select id="atelier-partner" value={draft.partnerProfileId??""} onChange={e=>change({partnerProfileId:e.target.value||undefined})}><option value="">Geen partner gekozen</option>{PARTNERS.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select>
          {draft.status==="planned"&&<><label htmlFor="atelier-reminder">Herinnering</label><select id="atelier-reminder" value={draft.reminderDaysBefore??""} onChange={e=>change({reminderDaysBefore:e.target.value?Number(e.target.value):undefined})}><option value="">Geen herinnering</option>{Array.from({length:14},(_,i)=><option value={i+1} key={i+1}>{i+1} {i===0?"dag":"dagen"} vooraf</option>)}</select><p className="journey-muted atelier-help">Deze proef bewaart alleen de instelling. Er wordt geen melding verstuurd.</p></>}
        </div>:<div className="atelier-writingplane"><label htmlFor="atelier-note">{draft.status==="completed"?"Jouw notitie":"Jouw notitie"}</label><textarea id="atelier-note" value={draft.note??""} onChange={e=>change({note:e.target.value})} placeholder={draft.status==="completed"?"Wat wil je onthouden?":"Een gedachte, een vraag, iets voor later."} rows={7}/></div>}
        {together.error&&<p id="atelier-error" className="atelier-error" role="alert">{together.error.message}</p>}
        {confirmDiscard?<div className="atelier-discard" role="group" aria-label="Wijzigingen bevestigen"><p>Wijzigingen weggooien?</p><button type="button" className="journey-textaction" onClick={()=>setConfirmDiscard(false)}>Verder schrijven</button><button type="button" className="journey-textaction" onClick={()=>{setConfirmDiscard(false);setTogether(discardMoment);}}>Gooi wijzigingen weg</button></div>:<div className="atelier-writeactions"><button type="button" onClick={cancel}>Annuleren</button><button type="submit" className="journey-primary">{draft.status==="completed"?"Bewaar in logboek":"Bewaar moment"}</button></div>}
      </form>
      <details className="atelier-technical"><summary>Technische proef</summary><label><input type="checkbox" checked={failNext} onChange={e=>setFailNext(e.target.checked)}/> Simuleer een bewaarfout</label><p>Dit is een eenmalige fouttest in het fictieve geheugen.</p></details>
    </div>
  </section>;

  return <section className="atelier">
    <AtelierNav/>
    <header className="atelier-intro"><h1>{together.tab==="planned"?"Wat komt":"Logboek"}</h1><p>{together.tab==="planned"?"Ruimte voor wat je zelf wilt plannen.":"Een plek voor wat je wilt bewaren."}</p></header>
    <div className="atelier-reading" ref={listRoot}>
      <div className="atelier-tabs" role="group" aria-label="Momenten bekijken"><button type="button" aria-pressed={together.tab==="planned"} onClick={()=>setTogether(s=>({...s,tab:"planned",day:""}))}>Gepland</button><button type="button" aria-pressed={together.tab==="completed"} onClick={()=>setTogether(s=>({...s,tab:"completed",day:""}))}>Logboek</button><button type="button" className="atelier-new" data-moment-action="new" onClick={()=>begin()} aria-label="Nieuw moment"><Plus size={20} aria-hidden="true"/></button></div>
      <div className="atelier-month"><button type="button" aria-label="Vorige maand" onClick={()=>{setDayError("");setTogether(s=>({...s,month:moveMonth(s.month,-1),day:""}));}}><CaretLeft size={20} aria-hidden="true"/></button><h2>{monthFormatter.format(new Date(together.month+"-01T12:00:00Z"))}</h2><button type="button" aria-label="Volgende maand" onClick={()=>{setDayError("");setTogether(s=>({...s,month:moveMonth(s.month,1),day:""}));}}><CaretRight size={20} aria-hidden="true"/></button></div>
      <div className="atelier-dayfilter"><label htmlFor="atelier-dayfilter">Op datum</label><input id="atelier-dayfilter" type="date" min="1000-01-01" max="9999-12-31" value={together.day} aria-invalid={!!dayError} aria-describedby={dayError?"atelier-dayerror":undefined} onChange={e=>{const day=e.target.value;if(day&&!validMomentDate(day)){setDayError("Kies een geldige datum.");return;}setDayError("");setTogether(s=>({...s,day,month:day?day.slice(0,7):s.month}));}}/><button type="button" disabled={!together.day&&!dayError} onClick={()=>{setDayError("");setTogether(s=>({...s,day:""}));}}>Alle dagen</button></div>
      {dayError&&<p id="atelier-dayerror" className="atelier-error" role="alert">{dayError}</p>}
      {rows.length===0&&<div className="atelier-empty"><h2>Hier is nog ruimte.</h2><p>Geen {together.tab==="planned"?"geplande":"beleefde"} momenten in deze periode.</p><button type="button" className="journey-textaction" onClick={()=>begin()}><Plus size={18} aria-hidden="true"/> Voeg een moment toe</button></div>}
      {rows.map((record,index)=><article key={record.id} className="atelier-moment" data-moment-id={record.id} data-completed={record.status==="completed"} data-featured={index===0&&record.status==="planned"}>
        <div className="atelier-momenthead"><DateIdentity record={record}/><button type="button" data-moment-action="edit" aria-label={"Bewerk "+record.title} onClick={e=>begin(record.id,false,e.currentTarget.parentElement?.querySelector(".atelier-identity"))}><PencilSimple size={19} aria-hidden="true"/></button></div>
        {record.note&&<p className="atelier-momentnote">{record.note}</p>}
        {record.status==="planned"&&<>{record.reminderDaysBefore&&<p className="atelier-reminder"><Bell size={16} aria-hidden="true"/>{record.reminderDaysBefore} {record.reminderDaysBefore===1?"dag":"dagen"} vooraf</p>}<button type="button" data-moment-action="log" className="journey-textaction" aria-label={"Bijhouden "+record.title} onClick={e=>begin(record.id,true,e.currentTarget.closest("article")?.querySelector(".atelier-identity"))}><Check size={18} aria-hidden="true"/> Bijhouden</button><CalendarExport record={record}/></>}
      </article>)}
      <Link href={ATELIER_ROOT+"/agreements"} className="journey-nextlink">Bekijk voorbeeldafspraken <ArrowRight size={18} aria-hidden="true"/></Link>
      <Link href="/hotter/journey/together" className="conversation-reference">Bekijk de eerste momentproef</Link>
    </div>
  </section>;
}
