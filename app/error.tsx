"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowClockwise } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import styles from "./error.module.css";

/**
 * De kamer waar het misging.
 *
 * Serious ≠ scary (UI-principles #10): geen alarmrood, geen stacktrace, geen
 * dramatiek. En het eerste wat iemand bij een crash wil weten in een app die
 * belooft dat alles lokaal blijft: staat mijn spul er nog? Dat antwoord staat er
 * daarom letterlijk, net als op de 404.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Geen monitoring in de app, dus dit is voorlopig het enige spoor dat een
    // ontwikkelaar of een gebruiker met een open console kan vinden.
    console.error("KinkSync liep vast:", error);
  }, [error]);

  return (
    <PageShell width="5xl" flush className={styles.pageShell}>
      <section id="error-page" className={styles.content} aria-labelledby="error-title">
        <div className={styles.copy}>
          <p className={styles.eyebrow}>ER GING IETS MIS</p>
          <h1 id="error-title" className={styles.title}>
            Deze pagina liep vast.
          </h1>
          <p className={styles.description}>
            Niet jouw schuld. Er ging hier iets onverwachts mis. Opnieuw proberen helpt meestal.
          </p>

          <div className={styles.actions}>
            <button type="button" onClick={reset} className={`focus-ring ${styles.retry}`}>
              <ArrowClockwise size={17} weight="bold" aria-hidden="true" />
              Probeer opnieuw
            </button>
            <Link href="/" className={`focus-ring ${styles.homeLink}`}>
              Terug naar home
            </Link>
          </div>

          <p className={styles.reassurance} data-testid="error-reassurance">
            Je profielen, antwoorden en contracten staan nog op dit toestel. Er is niets verloren gegaan.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
