"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, PencilSimple, Plus } from "@phosphor-icons/react";
import { AGREEMENT, MOMENT, OTHER_MOMENTS, SCENE } from "./fixtures";
import { useJourney } from "./JourneyProvider";

export default function TogetherStudy() {
  const { note, setNote, remembered, setRemembered } = useJourney();
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");
  const editor = useRef<HTMLTextAreaElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (writing) editor.current?.focus(); }, [writing]);
  function openWriter() { setDraft(note); setWriting(true); }
  function closeWriter() { setWriting(false); requestAnimationFrame(() => trigger.current?.focus()); }
  function save() { setNote(draft.trim()); closeWriter(); }

  return <section className="journey-together">
    <div className="journey-moment" data-remembered={remembered ? "true" : "false"}>
      <div className="journey-date" aria-label={MOMENT.weekday + " " + MOMENT.day + " " + MOMENT.month + " om " + MOMENT.time}>
        <span className="journey-date-number">{MOMENT.day}</span>
        <span className="journey-date-detail">{MOMENT.month}<br/>{MOMENT.weekday} · {MOMENT.time}</span>
      </div>
      <div className="journey-momentcopy">
        <span className="journey-momentstatus">{remembered ? "Beleefd" : "Gepland"}</span>
        <h1>{MOMENT.title}</h1>
        <p>{MOMENT.partner}</p>
      </div>
    </div>
    <div className="journey-momentbody">
      <section className="journey-writing" aria-labelledby="journey-writing-title">
        <h2 id="journey-writing-title">{remembered ? "Wat wil je bewaren?" : "Een gedachte voor later"}</h2>
        {writing ? <form onSubmit={event => { event.preventDefault(); save(); }} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); closeWriter(); } }}>
          <label htmlFor="journey-note">Jouw gedachte</label>
          <textarea id="journey-note" ref={editor} value={draft} onChange={event => setDraft(event.target.value)} rows={5} placeholder="Schrijf wat je wilt onthouden."/>
          <div className="journey-writeractions"><button type="button" onClick={closeWriter}>Annuleren</button><button type="submit" className="journey-primary">Bewaar gedachte</button></div>
        </form> : <>
          {note ? <p className="journey-note">{note}</p> : <p className="journey-muted">Een wens, een vraag of iets om samen te bespreken.</p>}
          <button ref={trigger} type="button" className="journey-textaction" onClick={openWriter}>{note ? <PencilSimple size={18} aria-hidden="true"/> : <Plus size={18} aria-hidden="true"/>}{note ? "Gedachte bewerken" : "Gedachte toevoegen"}</button>
        </>}
      </section>
      <details className="journey-context journey-agreement">
        <summary><span>{AGREEMENT.title}</span><small>{AGREEMENT.status}</small></summary>
        <p>Voorbeeld van een concept, geen bevestigde overeenkomst.</p>
        <ul>{AGREEMENT.terms.map(term => <li key={term}>{term}</li>)}</ul>
      </details>
      {!writing && <button type="button" className="journey-primary journey-complete" onClick={() => setRemembered(!remembered)}><Check size={18} aria-hidden="true"/>{remembered ? "Terug naar gepland" : "Markeer als beleefd"}</button>}
      <section className="journey-othermoments">
        <h2>Andere momenten</h2>
        {OTHER_MOMENTS.map(moment => <details key={moment.id} className="journey-context"><summary><span>{moment.title}</span><small>{moment.detail}</small></summary><p>{moment.note}</p></details>)}
        <details className="journey-context"><summary><span>{SCENE.title}</span><small>Scene · {SCENE.status}</small></summary><p>Nazorg: {SCENE.aftercare}</p></details>
      </section>
      <Link className="journey-nextlink" href="/hotter/journey/self">Verder met jezelf <ArrowRight size={17} aria-hidden="true"/></Link>
    </div>
  </section>;
}
