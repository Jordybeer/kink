"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeSlash } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import StatusGlyph from "@/components/StatusGlyph";
import StatusOptionRows from "@/components/StatusOptionRows";
import { useTopNavActions, type TopNavAction } from "@/components/nav/TopNavContext";
import { STATUS_LABEL, STATUS_VAR } from "@/lib/statusLabels";
import type { KinkStatus } from "@/types";
import styles from "./onboarding.module.css";

const navActions: TopNavAction[] = [];
const spreads = {
  welcome: { number: 1, label: "Kennismaken", title: <>Wat past <em>bij jou?</em></> },
  practice: { number: 2, label: "Een vraag proberen", title: <>Samen blijven <em>liggen?</em></> },
  example: { number: 3, label: "Jouw voorbeeld", title: <>Jij kiest wat je <em>deelt.</em></> },
} as const;

type Spread = keyof typeof spreads;
type View = Spread | "declined";

export default function OnboardingStudy() {
  const [view, setView] = useState<View>("welcome");
  const [answer, setAnswer] = useState<KinkStatus>(null);
  const [revealed, setRevealed] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const previousView = useRef(view);
  const spread = view === "declined" ? null : spreads[view];
  useTopNavActions(navActions, "Kennismaking", view === "declined" ? "about:blank" : "/hot");

  useLayoutEffect(() => {
    if (previousView.current === view) return;
    previousView.current = view;
    title.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);

  useEffect(() => {
    if (!revealed) return;
    function conceal() { setRevealed(false); }
    function onVisibilityChange() { if (document.hidden) conceal(); }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", conceal);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", conceal);
    };
  }, [revealed]);

  function navigate(next: View) {
    setRevealed(false);
    if (next === "declined") setAnswer(null);
    setView(next);
  }

  return (
    <PageShell width="2xl" flush className={styles.shell}>
      <article className={styles.spread} data-stage={view}>
        <header className={styles.header}>
          <div className={styles.field} aria-hidden="true" />
          {spread && (
            <div className={styles.runningHead}>
              <span>{spread.label}</span>
              <span>Stap {spread.number} van 3</span>
            </div>
          )}
          <h1 ref={title} tabIndex={-1} className={styles.title}>
            {spread ? spread.title : "Deze kennismaking stopt hier."}
          </h1>
          {spread && <div aria-hidden="true" className={styles.track}><span /></div>}
        </header>

        <div className={styles.body}>
          {view === "welcome" && (
            <>
              <p className={styles.lead}>
                Probeer één vraag. Je ziet hoe je een wens of grens onder woorden kunt brengen.
                Jij kiest wat je later met iemand deelt.
              </p>
              <p className={styles.note}>Je oefenantwoord wordt niet opgeslagen.</p>
              <h2 className={styles.question}>Ben je 18 jaar of ouder?</h2>
              <p className={styles.note}>KinkSync is alleen voor volwassenen.</p>
            </>
          )}
          {view === "practice" && (
            <>
              <p className={styles.lead}>
                Stel, na een intiem moment wil je partner nog even tegen je aan liggen.
                Wat zou jij willen?
              </p>
              <p className={styles.consent}>
                Ook als je allebei ja invult, vraag je elkaar op het moment zelf om toestemming.
                Je mag altijd van gedachten veranderen.
              </p>
              <StatusOptionRows current={answer} onSelect={setAnswer} presentation="list" />
            </>
          )}
          {view === "example" && (
            <>
              <p className={styles.lead}>
                KinkSync bewaart je profiel in de browser op je toestel. Als je het deelt,
                blijven privéantwoorden standaard buiten de gedeelde versie.
              </p>
              <div className={styles.sample}>
                <div className={styles.sampleHead}>
                  <h2>Jouw oefenantwoord</h2>
                  {answer && (
                    <button type="button" className={`focus-ring ${styles.reveal}`}
                      aria-controls="practice-result" aria-expanded={revealed}
                      onClick={() => setRevealed(open => !open)}>
                      {revealed ? <EyeSlash size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                      {revealed ? "Verberg oefenantwoord" : "Toon oefenantwoord"}
                    </button>
                  )}
                </div>
                <div id="practice-result" className={styles.sampleBody}>
                  {answer && revealed ? (
                    <>
                      <span>Samen blijven liggen</span>
                      <strong>
                        <span style={{ color: STATUS_VAR[answer] }}><StatusGlyph status={answer} size={18} /></span>
                        {STATUS_LABEL[answer]}
                      </strong>
                    </>
                  ) : <span>{answer ? "Verborgen" : "Je hebt de vraag overgeslagen."}</span>}
                </div>
              </div>
              <p className={styles.note}>Deze oefening schrijft niets in je profiel.</p>
            </>
          )}
          {view === "declined" && <p className={styles.lead}>KinkSync is alleen voor mensen van 18 jaar en ouder.</p>}
        </div>

        <footer className={styles.footer}>
          {view === "welcome" && (
            <>
              <button type="button" className={`focus-ring ${styles.primary}`}
                onClick={() => navigate("practice")}>Ik ben 18 of ouder <ArrowRight aria-hidden="true" /></button>
              <button type="button" className={`focus-ring ${styles.secondary}`}
                onClick={() => navigate("declined")}>Ik ben jonger dan 18</button>
            </>
          )}
          {(view === "practice" || view === "example") && (
            <button type="button" className={`focus-ring ${styles.secondary}`}
              onClick={() => navigate(view === "practice" ? "welcome" : "practice")}>
              <ArrowLeft aria-hidden="true" />Vorige stap
            </button>
          )}
          {view === "practice" && (
            <button type="button" className={`focus-ring ${styles.primary}`}
              onClick={() => navigate("example")}>
              {answer ? "Bekijk mijn voorbeeld" : "Sla de vraag over"} <ArrowRight aria-hidden="true" />
            </button>
          )}
          {view === "example" && (
            <>
              <Link href="/hot/questions" className={`focus-ring ${styles.primary}`}>
                Naar de vragenlijst <ArrowRight aria-hidden="true" />
              </Link>
              <Link href="/hot" className={`focus-ring ${styles.studio}`}>Terug naar de studio</Link>
            </>
          )}
          {view === "declined" && <a href="about:blank" className={`focus-ring ${styles.primary}`}>Pagina verlaten</a>}
        </footer>
      </article>
    </PageShell>
  );
}
