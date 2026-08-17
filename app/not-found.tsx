import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import PageShell from "@/components/PageShell";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <PageShell width="5xl" flush className={styles.pageShell}>
      <section id="not-found-page" className={styles.content} aria-labelledby="not-found-title">
        <div className={styles.hero} data-testid="not-found-hero" aria-hidden="true">
          <Image
            src="/404-pagina-niet-hier.PNG"
            alt=""
            fill
            priority
            sizes="(max-width: 759px) calc(100vw - 2rem), (orientation: portrait) 31rem, (max-width: 1099px) 52vw, 42rem"
            className={styles.heroImage}
          />
        </div>

        <div className={styles.copy}>
          <p className={styles.eyebrow}>VERKEERDE DEUR</p>
          <h1 id="not-found-title" className={styles.title}>
            Hmm… hier is niets te vinden.
          </h1>
          <p className={styles.description}>
            De link klopt niet meer of de pagina is verhuisd.
          </p>

          <Link href="/" className={`focus-ring ${styles.homeLink}`}>
            Terug naar home
            <ArrowRight size={17} weight="bold" aria-hidden="true" />
          </Link>

          <p className={styles.reassurance} data-testid="not-found-reassurance">
            Je lokale profielen en antwoorden zijn niet weg. Alleen deze pagina ontbreekt.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
