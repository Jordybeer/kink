"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Check } from "@phosphor-icons/react";
import type { AftercareEntry } from "@/types";
import { useJourney } from "./JourneyProvider";
import { completeScene, reorderScene, saveAftercare, updateScene } from "./togetherSession";
import { AtelierNav, ATELIER_ROOT } from "./TogetherAtelier";

const FEELINGS:{value:AftercareEntry["trafficLight"];label:string}[]=[{value:"green",label:"Geweldig"},{value:"amber",label:"Goed, maar…"},{value:"red",label:"Zwaar"}];
export default function SceneAtelier(){
  const {together,setTogether}=useJourney();
  const {scene,care}=together;
  const completed=scene.status==="completed";
  return <section className="atelier">
    <AtelierNav/>
    <header className="atelier-intro"><h1>Een rustig moment</h1><p>{completed?"Beleefde voorbeeldscène":"Een volgorde die jullie zelf kunnen bepalen."}</p></header>
    <div className="atelier-reading">
      <h2>De scène</h2><p className="journey-muted atelier-help">Intensiteit beschrijft de bedoeling van een onderdeel. Het is geen voorkeur, grens of toestemming.</p>
      {scene.items.length===0&&<p>Deze scène bevat nog geen onderdelen.</p>}
      <ol className="atelier-sceneitems">{scene.items.map((item,index)=><li key={item.id}><div className="atelier-sceneline"><h3>{item.name}</h3>{!completed&&<div><button type="button" aria-label={item.name+" omhoog"} disabled={index===0} onClick={()=>setTogether(s=>reorderScene(s,item.id,-1))}><ArrowUp size={18} aria-hidden="true"/></button><button type="button" aria-label={item.name+" omlaag"} disabled={index===scene.items.length-1} onClick={()=>setTogether(s=>reorderScene(s,item.id,1))}><ArrowDown size={18} aria-hidden="true"/></button></div>}</div><div className="atelier-intensity" role="group" aria-label={"Intensiteit "+item.name}>{(["zacht","midden","intens"] as const).map(v=><button type="button" key={v} disabled={completed} aria-pressed={item.intensity===v} onClick={()=>setTogether(s=>updateScene(s,item.id,v))}>{v==="zacht"?"Zacht":v==="midden"?"Midden":"Intens"}</button>)}</div></li>)}</ol>
      {!completed?<button type="button" className="journey-primary atelier-wide" disabled={!scene.items.length} onClick={()=>setTogether(completeScene)}><Check size={18} aria-hidden="true"/> Markeer scène als beleefd</button>:<section className="atelier-care">
        <h2>Hoe voelde het?</h2><p>Je kunt nazorg apart vastleggen. Een beleefde scène maakt geen agenda-item of afspraak aan.</p>
        <div className="atelier-feelings" role="group" aria-label="Hoe voelde het">{FEELINGS.map(feeling=><button type="button" data-feeling={feeling.value} key={feeling.value} aria-pressed={care.trafficLight===feeling.value} onClick={()=>setTogether(s=>({...s,care:{...s.care,trafficLight:feeling.value}}))}><span aria-hidden="true"/>{feeling.label}</button>)}</div>
        <label htmlFor="atelier-well">Wat werkte goed?</label><textarea id="atelier-well" rows={3} value={care.wentWell} onChange={e=>setTogether(s=>({...s,care:{...s.care,wentWell:e.target.value}}))}/>
        <label htmlFor="atelier-remember">Onthouden voor volgende keer</label><textarea id="atelier-remember" rows={3} value={care.remember} onChange={e=>setTogether(s=>({...s,care:{...s.care,remember:e.target.value}}))}/>
        <button type="button" className="journey-primary atelier-wide" disabled={!care.trafficLight} onClick={()=>setTogether(s=>saveAftercare(s,Date.now()))}>Bewaar nazorg</button>
        {scene.aftercare&&<div className="atelier-care-readback" aria-live="polite"><h3>Bewaarde nazorg</h3><p>{FEELINGS.find(f=>f.value===scene.aftercare?.trafficLight)?.label}</p>{scene.aftercare.wentWell&&<p>{scene.aftercare.wentWell}</p>}{scene.aftercare.remember&&<p>{scene.aftercare.remember}</p>}</div>}
      </section>}
      <Link href={ATELIER_ROOT} className="journey-nextlink">Terug naar agenda <ArrowRight size={18} aria-hidden="true"/></Link>
    </div>
  </section>;
}
