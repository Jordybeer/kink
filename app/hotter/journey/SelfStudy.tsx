"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, EyeSlash, Star } from "@phosphor-icons/react";
import { STATUS_HINT, STATUS_LABEL, STATUS_ORDER } from "@/lib/statusLabels";
import { QUESTIONS } from "./fixtures";
import { useJourney } from "./JourneyProvider";

export default function SelfStudy() {
  const { index, setIndex, answers, updateAnswer } = useJourney();
  const question = QUESTIONS[index];
  const answer = answers[question.id];
  const selected = answer?.status ?? null;
  const offset = question.meaning.indexOf(question.emphasis);

  return <section className="journey-self">
    <div className="journey-questionhead">
      <div className="journey-questionmeta"><span>{question.category}</span><span>{index + 1} / {QUESTIONS.length}</span></div>
      <div className="journey-questioncopy" key={question.id} aria-live="polite">
        <h1>{question.title}</h1>
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
      <details className="journey-context" key={"detail-" + question.id}><summary>Meer over deze vraag</summary><p>{question.detail}</p></details>
      <Link className="journey-nextlink" href="/hotter/journey/connection">Bekijk twee voorbeeldperspectieven <ArrowRight size={17} aria-hidden="true"/></Link>
    </div>
  </section>;
}
