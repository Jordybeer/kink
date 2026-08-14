import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import PageShell from "@/components/PageShell";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <PageShell width="2xl" flush className={styles.pageShell}>
      <section className={styles.content} aria-labelledby="not-found-title">
        <div className={styles.hero} data-testid="not-found-hero">
          <Image
            src="/404-pagina-niet-hier.PNG"
            alt=""
            fill
            priority
            sizes="(max-width: 759px) calc(100vw - 2rem), (max-width: 1099px) 38rem, 42rem"
            className={styles.heroImage}
          />
        </div>

        <p className={styles.eyebrow}>VERKEERDE DEUR</p>
        <h1 id="not-found-title" className={styles.title}>
          Hmm… deze pagina heeft zich laten meeslepen.
        </h1>
        <p className={styles.description}>
          De link klopt niet meer, de pagina is verhuisd — of je bent gewoon iets te enthousiast door het konijnenhol gekropen.
        </p>

        <Link href="/" className={`focus-ring ${styles.homeLink}`}>
          Terug naar home
          <ArrowRight size={17} weight="bold" aria-hidden="true" />
        </Link>

        <p className={styles.reassurance}>
          Je lokale profielen en antwoorden zijn niet weg. Alleen deze route mist z’n bestemming.
        </p>
      </section>
    </PageShell>
  );
}
