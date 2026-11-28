"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, EyeSlash, Star } from "@phosphor-icons/react";
import { STATUS_HINT, STATUS_LABEL, STATUS_ORDER } from "@/lib/statusLabels";
import { QUESTIONS, type QuestionId } from "./fixtures";
import { useJourney } from "./JourneyProvider";

const prompts: Record<QuestionId, { opening: string; reflection: string }> = {
  lead: { opening: "Wie neemt het voortouw?", reflection: "Wat zou jij vooraf willen afspreken over wie de leiding neemt?" },
  titles: { opening: "Hoe wil je aangesproken worden?", reflection: "Welke woorden passen bij jou, en wanneer gebruik je liever je naam?" },
  rest: { opening: "En als het weer stil wordt?", reflection: "Waar heb jij na een intens moment behoefte aan?" },
};

function OwnWords({ prompt, words, onSave }: { prompt: string; words: string; onSave: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    function conceal() { if (document.hidden) { setEditing(false); setDraft(""); } }
    document.addEventListener("visibilitychange", conceal);
    return () => document.removeEventListener("visibilitychange", conceal);
  }, []);
  useEffect(() => { if (editing) input.current?.focus(); }, [editing]);
  function close() {
    setEditing(false);
    setDraft("");
    requestAnimationFrame(() => trigger.current?.focus());
  }
  return <section className="self-words">
    <button type="button" ref={trigger} aria-expanded={editing} onClick={() => {
      if (editing) close();
      else { setDraft(words); setEditing(true); }
    }}>{words ? "Mijn woorden bekijken" : "In mijn woorden"}</button>
    {editing && <form onSubmit={event => { event.preventDefault(); onSave(draft.trim()); close(); }}>
      <label htmlFor="self-words">{prompt}</label>
      <textarea ref={input} id="self-words" aria-label="Mijn woorden" rows={3} value={draft} onChange={event => setDraft(event.target.value)} />
      <div><button type="button" onClick={close}>Annuleren</button><button type="submit">Bewaar en sluit</button></div>
    </form>}
  </section>;
}

export default function SelfStudy() {
  const { world, index, setIndex, answers, updateAnswer } = useJourney();
  const question = QUESTIONS[index];
  const answer = answers[question.id];
  const selected = answer?.status ?? null;
  const offset = question.meaning.indexOf(question.emphasis);

  return <section className="journey-self">
    <div className="journey-questionhead">
      <div className="journey-questionmeta"><span>{question.category}</span><span>{index + 1} / {QUESTIONS.length}</span></div>
      <div className="journey-questioncopy" key={question.id} aria-live="polite">
        {world === "control" ? <h1>{question.title}</h1> : <>
          <h1>{prompts[question.id].opening}</h1>
          <h2 className="self-subject">{question.title}</h2>
        </>}
        <p>{question.meaning.slice(0, offset)}<em>{question.emphasis}</em>{question.meaning.slice(offset + question.emphasis.length)}</p>
      </div>
    </div>
    <div className="journey-response">
      <div className="journey-answers" role="group" aria-label="Jouw antwoord">
        {STATUS_ORDER.map(status => <button key={status} type="button" className="journey-answer" data-status={status} aria-pressed={selected === status} onClick={() => updateAnswer(question.id, { status: selected === status ? null : status })}>
          <span className="journey-mark" aria-hidden="true"><span/><Check size={16} weight="bold" aria-hidden="true" /></span>
          <span className="journey-answertext"><strong>{STATUS_LABEL[status]}</strong><small>{STATUS_HINT[status]}</small></span>
        </button>)}
      </div>
      <div className="journey-flags" role="group" aria-label="Context bij je antwoord">
        <button type="button" aria-pressed={!!answer?.private} onClick={() => updateAnswer(question.id, { private: !answer?.private })}><EyeSlash size={19} aria-hidden="true" /> Privé</button>
        <button type="button" aria-pressed={!!answer?.curious} onClick={() => updateAnswer(question.id, { curious: !answer?.curious })}><Star size={19} aria-hidden="true" /> Nieuwsgierig</button>
      </div>
      <div className="journey-step">
        <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft size={17} aria-hidden="true"/> Vorige</button>
        <button type="button" disabled={index === QUESTIONS.length - 1} onClick={() => setIndex(index + 1)}>Volgende <ArrowRight size={17} aria-hidden="true"/></button>
      </div>
      <OwnWords key={question.id} prompt={prompts[question.id].reflection} words={answer?.words ?? ""} onSave={words => updateAnswer(question.id, { words })} />
      <details className="journey-context" key={"detail-" + question.id}><summary>Meer over deze vraag</summary><p>{question.detail}</p></details>
      <Link className="journey-nextlink" href="/hotter/journey/self/conversation">Volledige vragenlijst <ArrowRight size={17} aria-hidden="true"/></Link>
      <Link className="journey-nextlink" href="/hotter/journey/connection/people">Bekijk twee voorbeeldperspectieven <ArrowRight size={17} aria-hidden="true"/></Link>
    </div>
  </section>;
}
