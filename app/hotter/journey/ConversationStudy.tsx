"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, EyeSlash, Star, ShieldCheck, Info, PencilSimple, Clock, ListBullets } from "@phosphor-icons/react";
import { STATUS_HINT, STATUS_LABEL, STATUS_ORDER } from "@/lib/statusLabels";
import { kinkCategoryLabel } from "@/lib/kinks";
import { getQuestionnairePresentation } from "@/lib/questionnairePresentation";
import { useJourney } from "./JourneyProvider";
import { getConversationRound, getConversationTopic, startConversation, transitionConversation, type ConversationAction } from "./conversationSession";
import "./conversation.css";

const HOLD_MS = 200;

export default function ConversationStudy() {
  const { conversation, setConversation } = useJourney();
  const initial = useMemo(startConversation, []);
  const state = conversation ?? initial;
  const heading = useRef<HTMLHeadingElement>(null);
  const round = useMemo(() => getConversationRound(state.entries), [state.entries]);
  const activeId = state.mode === "edit" ? state.editId : state.current?.id;
  const topic = activeId ? getConversationTopic(activeId) : undefined;
  const presentation = topic ? getQuestionnairePresentation(topic) : null;
  const entry = activeId ? state.entries[activeId] : undefined;
  const followup = state.mode === "deck" && state.current?.relation === "followup";
  const complement = state.mode === "deck" && state.current?.relation === "complement";
  const phrase = topic?.id === "titels_aanspreekvormen" && presentation
    ? ["afgesproken titels", "Vaste titels"].find(text => presentation.essence.includes(text))
    : undefined;
  const answered = Object.entries(state.entries).filter(([, value]) => value.status != null);
  const eligibleDeferred = state.deferred.filter(id => round.queue.some(item => item.kink.id === id));
  const isOverview = state.mode === "overview" || !topic || !presentation;

  function dispatch(action: ConversationAction) {
    setConversation(previous => transitionConversation(previous ?? initial, action));
  }

  useEffect(() => {
    if (!state.pending || state.mode !== "deck") return;
    const revision = state.revision;
    const timer = window.setTimeout(() => setConversation(previous => transitionConversation(previous ?? initial, { type: "advance", revision })), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [state.pending, state.revision, state.mode, initial, setConversation]);

  useEffect(() => {
    // Preserve the thumb/keyboard target during automatic progression. Only move focus
    // when the user explicitly changes reading mode or reaches the end.
    heading.current?.focus({ preventScroll: true });
  }, [state.mode, isOverview]);

  if (isOverview) return <section className="journey-selfoverview">
    <div className="journey-questionhead">
      <div className="conversation-personline"><span className="conversation-avatar" aria-hidden="true">N</span><span>Noor · Voorbeeldprofiel</span></div>
      <h1 ref={heading} tabIndex={-1}>{state.mode === "overview" ? "Mijn perspectief" : eligibleDeferred.length ? "Voor nu klaar" : "Je ronde is afgerond"}</h1>
      <p>{answered.length ? "Dit heb je zelf aangegeven. Je kunt je antwoorden altijd opnieuw bekijken." : "Neem de tijd. Je hoeft geen antwoord te geven om verder te mogen."}</p>
    </div>
    <div className="journey-response">
      {state.current && <button className="journey-primary conversation-resume" type="button" onClick={() => dispatch({ type: "resume" })}>Verder ontdekken <ArrowRight size={18} aria-hidden="true"/></button>}
      {eligibleDeferred.length > 0 && <button className="journey-textaction conversation-revisit" type="button" onClick={() => dispatch({ type: "revisit" })}><Clock size={18} aria-hidden="true"/> Toon uitgestelde vragen</button>}
      <section className="conversation-ledger">
        <h2>Mijn antwoorden</h2>
        {answered.length === 0 && <p className="journey-muted">Nog geen antwoorden gegeven.</p>}
        {answered.map(([id, value]) => {
          const kink = getConversationTopic(id);
          if (!kink || !value.status) return null;
          return <div key={id} className="conversation-ledgerrow">
            <div><h3>{getQuestionnairePresentation(kink).title}</h3>
              <p>{value.privateResponse ? "Privéantwoord" : STATUS_LABEL[value.status]}</p>
              {value.curious && <small>Nieuwsgierig</small>}
            </div>
            <button type="button" aria-label={"Bewerk " + getQuestionnairePresentation(kink).title} onClick={() => dispatch({ type: "edit", id })}><PencilSimple size={19} aria-hidden="true"/></button>
          </div>;
        })}
      </section>
      {eligibleDeferred.length > 0 && <section className="conversation-ledger">
        <h2>Voor later</h2>
        <p className="journey-muted">Deze onderwerpen zijn nog niet beantwoord.</p>
        {eligibleDeferred.map(id => {
          const kink = getConversationTopic(id);
          return kink ? <div key={id} className="conversation-deferred">{getQuestionnairePresentation(kink).title}</div> : null;
        })}
      </section>}
      <Link href="/hotter/journey/connection" className="journey-nextlink">Bekijk voorbeeldperspectieven <ArrowRight size={17} aria-hidden="true"/></Link>
      <Link href="/hotter/journey/self" className="conversation-reference">Terug naar de materiaalproef</Link>
    </div>
  </section>;

  const id = topic.id;
  const selected = entry?.status ?? null;
  const offset = phrase ? presentation.essence.indexOf(phrase) : -1;
  return <section className="journey-conversation" data-topic={id} data-relation={state.mode === "edit" ? "edit" : state.current?.relation} data-pending={state.pending}>
    <div className="journey-questionhead">
      <div className="journey-questionmeta">
        <span className="conversation-personline"><span className="conversation-avatar" aria-hidden="true">N</span> Noor</span>
        <span>{round.coverage.answered} / {round.coverage.total} onderwerpen</span>
      </div>
      <div className="conversation-cue"><span>{kinkCategoryLabel(topic.category)}</span><span>{state.mode === "edit" ? "Antwoord bewerken" : followup ? "Vervolgvraag" : complement ? "Ander perspectief" : ""}</span></div>
      <div className="journey-questioncopy conversation-copy" key={id}>
        <h1 ref={heading} tabIndex={-1}>{followup && !phrase ? <span className="conversation-emphasis">{presentation.title}</span> : presentation.title}</h1>
        <p>{followup && phrase && offset >= 0 ? <>{presentation.essence.slice(0, offset)}<span className="conversation-emphasis">{phrase}</span>{presentation.essence.slice(offset + phrase.length)}</> : presentation.essence}</p>
      </div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">{(followup ? "Vervolgvraag: " : "") + presentation.title}</span>
    </div>
    <div className="journey-response">
      <div className="journey-answers" role="group" aria-label="Jouw antwoord">
        {STATUS_ORDER.map(status => <button key={status} type="button" className="journey-answer" data-status={status} aria-pressed={selected === status} onClick={() => dispatch({ type: "choose", id, status })}>
          <span className="journey-mark" aria-hidden="true"><span/><Check size={16} weight="bold" aria-hidden="true"/></span>
          <span className="journey-answertext"><strong>{STATUS_LABEL[status]}</strong><small>{STATUS_HINT[status]}</small></span>
        </button>)}
      </div>
      <div className="conversation-contextcontrols">
        <div className="journey-flags" role="group" aria-label="Context bij je antwoord">
          <button type="button" aria-pressed={!!entry?.privateResponse} onClick={() => dispatch({ type: "flag", id, flag: "privateResponse" })}><EyeSlash size={18} aria-hidden="true"/> Privé</button>
          <button type="button" aria-pressed={!!entry?.curious} onClick={() => dispatch({ type: "flag", id, flag: "curious" })}><Star size={18} aria-hidden="true"/> Nieuwsgierig</button>
        </div>
        <div className="journey-flags conversation-agreements" role="group" aria-label="Aandachtspunten bij je antwoord">
          <button type="button" aria-pressed={!!entry?.tags?.includes("vraag eerst")} onClick={() => dispatch({ type: "tag", id, tag: "vraag eerst" })}><ShieldCheck size={18} aria-hidden="true"/> Eerst vragen</button>
          <button type="button" aria-pressed={!!entry?.tags?.includes("eerste keer")} onClick={() => dispatch({ type: "tag", id, tag: "eerste keer" })}><span className="conversation-firstmark" aria-hidden="true">1</span> Eerste keer</button>
        </div>
      </div>
      <div className="conversation-actions">
        {state.mode === "edit" ? <button className="journey-textaction" type="button" onClick={() => dispatch({ type: "overview" })}><ArrowLeft size={17} aria-hidden="true"/> Terug naar mijn perspectief</button> : <>
          <button className="journey-textaction" type="button" disabled={state.pending} onClick={() => dispatch({ type: "skip", id })}><Clock size={17} aria-hidden="true"/> Later</button>
          <button className="journey-textaction" type="button" onClick={() => dispatch({ type: "overview" })}><ListBullets size={17} aria-hidden="true"/> Voor nu klaar</button>
        </>}
      </div>
      <div key={id} className="conversation-reading">
        {presentation.details && <details className="journey-context"><summary><Info size={17} aria-hidden="true"/> Meer over {presentation.title}</summary><p>{presentation.details}</p></details>}
        {topic.safetyNote && <details className="journey-context"><summary><ShieldCheck size={17} aria-hidden="true"/> Veiligheid</summary><p>{topic.safetyNote}</p></details>}
        <details className="journey-context"><summary>Wat betekenen mijn keuzes?</summary><p>Een antwoord beschrijft jouw voorkeur, niet je toestemming voor een moment. Privé houdt een antwoord verborgen in het overzicht. Nieuwsgierig en aandachtspunten zijn afzonderlijke markeringen.</p></details>
      </div>
      <Link href="/hotter/journey/self" className="conversation-reference">Vergelijk met de materiaalproef</Link>
    </div>
  </section>;
}
