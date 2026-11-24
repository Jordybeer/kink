"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import StatusOptionRows from "@/components/StatusOptionRows";
import { useTopNavActions, type TopNavAction } from "@/components/nav/TopNavContext";
import type { KinkStatus } from "@/types";
import styles from "./onboarding.module.css";

const navActions: TopNavAction[] = [];
const spreads = {
  welcome: { number: 1, label: "Kennismaken", title: <>Ben je <em>18 of ouder?</em></> },
  practice: { number: 2, label: "Een vraag proberen", title: <>Samen blijven <em>liggen?</em></> },
  example: { number: 3, label: "Je profiel en privacy", title: <>Jouw profiel, <em>jouw keuze.</em></> },
} as const;

type Spread = keyof typeof spreads;
type View = Spread | "declined";

export default function OnboardingStudy() {
  const [view, setView] = useState<View>("welcome");
  const [answer, setAnswer] = useState<KinkStatus>(null);
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

  function navigate(next: View) {
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

        <div key={view} className={styles.body}>
          {view === "welcome" && (
            <p className={styles.lead}>Probeer één vraag over wat je fijn vindt. Je oefenantwoord wordt niet opgeslagen.</p>
          )}
          {view === "practice" && (
            <>
              <p className={styles.lead}>
                Je partner wil na een intiem moment nog even tegen je aan liggen. Hoe voelt dat voor jou?
              </p>
              <p className={styles.consent}>
                Een antwoord is geen toestemming. Ook bij twee keer ja stem je op het moment zelf af.
              </p>
              <StatusOptionRows current={answer} onSelect={setAnswer} />
            </>
          )}
          {view === "example" && (
            <>
              <p className={styles.lead}>In je profiel verzamel je wat je aanspreekt, waarover je twijfelt en waar je grenzen liggen. Je kunt je antwoorden altijd aanpassen.</p>
              <dl className={styles.profileFacts}>
                <div><dt>Op dit toestel</dt><dd>Je profiel blijft in de browser op je toestel.</dd></div>
                <div><dt>Delen is jouw keuze</dt><dd>Als je een profiel deelt, blijven antwoorden die je als Privé markeert buiten de gedeelde versie.</dd></div>
              </dl>
              <p className={styles.note}>{answer ? "Je oefenantwoord komt niet in je profiel terecht." : "Je mag ook in de vragenlijst vragen overslaan."}</p>
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
              {answer ? "Verder" : "Sla de vraag over"} <ArrowRight aria-hidden="true" />
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
