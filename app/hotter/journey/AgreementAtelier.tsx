"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import type { ContractSeriesStatus } from "@/lib/contractLifecycle";
import { AGREEMENT } from "./fixtures";
import { AtelierNav, ATELIER_ROOT } from "./TogetherAtelier";

type SampleStatus=ContractSeriesStatus|"quarantine";
const samples:Record<SampleStatus,{label:string;description:string}>={
  draft:{label:"Concept",description:"Een tekst om samen te lezen. Nog niet bevestigd."},
  pending_signature:{label:"Wacht op handtekening",description:"Voorbeeld van een versie die nog op bevestiging wacht. Niet actief."},
  active:{label:"Actief",description:"Voorbeeld van de weergave van een bevestigde versie. Ook dan blijft toestemming per moment nodig."},
  paused:{label:"Gepauzeerd",description:"Voorbeeld van een gepauzeerde afspraak. Niet actief."},
  resume_pending:{label:"Hervatting in afwachting",description:"Voorbeeld van een hervattingsverzoek. De afspraak is nog niet hervat."},
  stopped:{label:"Beëindigd",description:"Voorbeeld van een beëindigde versie in het archief. Niet actief."},
  quarantine:{label:"Niet geverifieerd",description:"Niet bruikbaar als overeenkomst. De integriteit is niet vastgesteld."},
};
export default function AgreementAtelier(){
  const [status,setStatus]=useState<SampleStatus>("draft");
  const [version,setVersion]=useState("2");
  const sample=samples[status];
  return <section className="atelier">
    <AtelierNav/>
    <header className="atelier-intro"><h1>Afspraken voor samen</h1><p>Een eigen leesruimte voor woorden die ertoe doen.</p></header>
    <div className="atelier-reading">
      <div className="atelier-example"><label htmlFor="agreement-example">Voorbeeldstatus</label><select id="agreement-example" value={status} onChange={e=>setStatus(e.target.value as SampleStatus)}>{Object.entries(samples).map(([id,s])=><option key={id} value={id}>{s.label}</option>)}</select><p>Dit wisselt uitsluitend tussen fictieve weergaven. Geen ondertekening, QR-uitwisseling of wijziging van echte afspraken.</p></div>
      <article className="atelier-document">
        <p className="atelier-documentpeople">Noor &amp; Jules</p><h2>{AGREEMENT.title}</h2>
        <p className="atelier-documentstatus" data-agreement-status={status}>{sample.label}</p>
        <p role="status">{sample.description}</p>
        {status!=="quarantine"&&<>
          <div className="atelier-documentbody"><h3>Wat we bespreken</h3><ol>{AGREEMENT.terms.map(term=><li key={term}>{term}</li>)}{version==="2"&&<li>We nemen tijd om te bespreken hoe het voor ieder was.</li>}</ol></div>
          <p>Voorbeeldtekst, geen geverifieerd document en geen bewijs van toestemming.</p>
        </>}
      </article>
      <section className="atelier-version"><h2>Versies lezen</h2><div className="atelier-tabs" role="group" aria-label="Voorbeeldversie">{["1","2"].map(n=><button type="button" key={n} aria-pressed={version===n} onClick={()=>setVersion(n)}>Versie {n}</button>)}</div><p className="journey-muted">De voorbeeldtekst is alleen-lezen. In het echte product zijn beide handgeschreven handtekeningen en digitale verificatie onderdeel van de bevestiging.</p></section>
      <Link href={ATELIER_ROOT+"/scenes"} className="journey-nextlink">Bekijk de scèneproef <ArrowRight size={18} aria-hidden="true"/></Link>
    </div>
  </section>;
}
