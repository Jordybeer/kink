"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Eye, EyeSlash } from "@phosphor-icons/react";
import { STATUS_LABEL } from "@/lib/statusLabels";
import { PEOPLE, PRIVATE_NOTE, TOPICS, type PersonId, type Status } from "./fixtures";
import { useJourney } from "./JourneyProvider";

function Verdict({ status }: { status: Status | null }) {
  return <span className="journey-verdict" data-status={status ?? "unknown"}><span aria-hidden="true"/>{status ? STATUS_LABEL[status] : "Onbeantwoord"}</span>;
}

export default function ConnectionStudy() {
  const { discussed, setDiscussed } = useJourney();
  const [person, setPerson] = useState<PersonId | null>(null);
  const [revealed, setRevealed] = useState(false);
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const launcher = useRef<HTMLButtonElement | null>(null);
  const current = PEOPLE.find(p => p.id === person);
  useEffect(() => {
    const conceal = () => setRevealed(false);
    const visibility = () => { if (document.visibilityState !== "visible") conceal(); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", conceal);
    return () => { document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", conceal); };
  }, []);
  useEffect(() => { if (person) detailTitle.current?.focus(); }, [person]);
  function closePerson() {
    setPerson(null); setRevealed(false);
    // The launcher remains mounted in comparison; restore after React commit.
    requestAnimationFrame(() => launcher.current?.focus());
  }
  return <section className="journey-connection">
    <header className="journey-pairhero">
      <div className="journey-pair">
        {PEOPLE.map(p => <button key={p.id} type="button" data-person={p.id} aria-label={"Bekijk " + p.name} aria-pressed={person === p.id} onClick={event => { launcher.current = event.currentTarget; setRevealed(false); setPerson(p.id); }}>
          <span className="journey-portrait" aria-hidden="true">{p.initial}</span>
          <span>{p.name}</span>
        </button>)}
      </div>
      <h1>Noor &amp; Jules</h1>
      <p>Twee perspectieven. Ieder antwoord heeft zijn eigen betekenis.</p>
    </header>
    {current ? <div className="journey-persondetail" key={current.id}>
      <button type="button" className="journey-textaction" onClick={closePerson}><ArrowLeft size={17} aria-hidden="true"/> Terug naar vergelijking</button>
      <h2 tabIndex={-1} ref={detailTitle}>{current.name}</h2>
      <p className="journey-muted">{current.perspective}</p>
      <p>{current.description}</p>
      {current.linked && <details className="journey-context"><summary>Ander perspectief</summary><p>{current.linked}</p></details>}
      <div className="journey-personanswers">
        {TOPICS.map(topic => <div key={topic.id}><span>{topic.title}</span><Verdict status={topic[current.id]}/></div>)}
      </div>
      {current.id === "noor" && <div className="journey-private">
        <button type="button" aria-expanded={revealed} onClick={() => setRevealed(v => !v)}>{revealed ? <EyeSlash size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}{revealed ? "Verberg privénotitie" : "Toon privénotitie"}</button>
        {revealed && <p className="journey-revealed">{PRIVATE_NOTE}</p>}
      </div>}
    </div> : <div className="journey-comparison">
      {([
        { key: "boundary", title: "Duidelijke grenzen" },
        { key: "shared", title: "Waar jullie elkaar vinden" },
        { key: "difference", title: "Ruimte voor een gesprek" },
        { key: "unknown", title: "Nog open" },
      ] as const).map(group => <section key={group.key} className="journey-resultgroup" data-group={group.key}>
        <h2>{group.title}</h2>
        {TOPICS.filter(topic => topic.group === group.key).map(topic => <article key={topic.id} className="journey-topic">
          <h3>{topic.title}</h3>
          <p>{topic.context}</p>
          <div className="journey-verdicts">
            <div><span className="journey-personname" data-person="noor">Noor</span><Verdict status={topic.noor}/></div>
            <div><span className="journey-personname" data-person="jules">Jules</span><Verdict status={topic.jules}/></div>
          </div>
          {topic.id === "titles" && <button className="journey-discussed" type="button" aria-pressed={discussed} onClick={() => setDiscussed(!discussed)}>{discussed && <Check size={17} aria-hidden="true"/>}{discussed ? "Besproken" : "Markeer als besproken"}</button>}
        </article>)}
      </section>)}
      <p className="journey-muted journey-consent">Een overeenkomst in antwoorden is geen toestemming. Een grens blijft een grens.</p>
      <Link className="journey-nextlink" href="/hotter/journey/connection/people">Bekijk de uitgebreide perspectieven <ArrowRight size={17} aria-hidden="true"/></Link>
      <Link className="journey-nextlink" href="/hotter/journey/together/atelier">Maak ruimte voor een moment <ArrowRight size={17} aria-hidden="true"/></Link>
    </div>}
  </section>;
}
