import Link from "next/link";
import { ArrowRight, HeartStraight, Sparkle } from "@phosphor-icons/react/dist/ssr";
import PageShell from "@/components/PageShell";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <PageShell width="2xl" flush className={styles.pageShell}>
      <section className={styles.content} aria-labelledby="not-found-title">
        <div className={styles.hero} aria-hidden="true" data-testid="not-found-hero">
          <HeartStraight size={28} weight="regular" className={`${styles.heartAccent} ${styles.heartAccentOne}`} />
          <Sparkle size={22} weight="fill" className={styles.sparkle} />
          <HeartStraight size={24} weight="regular" className={`${styles.heartAccent} ${styles.heartAccentTwo}`} />

          <div className={styles.codeWrap}>
            <span className={styles.code} data-reflection="404">
              404
            </span>
          </div>

          <div className={styles.floorGlow} />
          <div className={styles.ropeScene}>
            <div className={styles.rope} />
            <div className={`${styles.ropeLoop} ${styles.ropeLoopLeft}`} />
            <div className={`${styles.ropeLoop} ${styles.ropeLoopRight}`} />
            <HeartStraight size={56} weight="regular" className={styles.ropeHeart} />
          </div>
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
