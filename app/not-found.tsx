import Link from "next/link";
import { ArrowRight, HeartStraight, Sparkle } from "@phosphor-icons/react/dist/ssr";
import PageShell from "@/components/PageShell";
import styles from "./not-found.module.css";
import art from "./not-found-art.module.css";

export default function NotFound() {
  return (
    <PageShell width="2xl" flush className={styles.pageShell}>
      <section className={styles.content} aria-labelledby="not-found-title">
        <div className={`${styles.hero} ${art.hero}`} aria-hidden="true" data-testid="not-found-hero">
          <div className={styles.backGlow} />
          <HeartStraight size={28} weight="regular" className={`${styles.heartAccent} ${styles.heartAccentOne}`} />
          <Sparkle size={22} weight="fill" className={styles.sparkle} />
          <HeartStraight size={24} weight="regular" className={`${styles.heartAccent} ${styles.heartAccentTwo}`} />

          <div className={styles.codeWrap}>
            <span className={styles.code}>404</span>
            <span className={`${styles.codeReflection} ${art.codeReflection}`}>404</span>
          </div>

          <div className={styles.floor} />
          <div className={styles.floorGlow} />

          <div className={`${styles.whipScene} ${art.whipScene}`} data-testid="not-found-whip">
            <div className={styles.whipShadow} />
            <div className={`${styles.handle} ${art.handle}`}>
              <span className={styles.handleCap} />
              <span className={styles.handleGrip} />
            </div>
            <div className={`${styles.lashMain} ${art.lashMain}`} />
            <div className={`${styles.lashLoopBack} ${art.loopBack}`} />
            <div className={`${styles.lashLoopFront} ${art.loopFront}`} />
            <div className={`${styles.lashTail} ${art.tail}`} />
            <div className={`${styles.lashTip} ${art.tip}`} />
            <HeartStraight size={58} weight="regular" className={styles.whipHeart} />
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
