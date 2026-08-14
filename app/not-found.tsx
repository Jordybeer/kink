import Link from "next/link";
import { ArrowRight, HeartStraight } from "@phosphor-icons/react/dist/ssr";
import PageShell from "@/components/PageShell";

export default function NotFound() {
  return (
    <PageShell width="2xl" className="flex min-h-[calc(100dvh-var(--bottom-nav-h)-7rem)] items-center py-8">
      <section className="w-full text-center" aria-labelledby="not-found-title">
        <div className="relative mx-auto mb-7 flex min-h-52 max-w-md items-center justify-center overflow-hidden rounded-[32px] border px-6 py-8"
          style={{
            background: "radial-gradient(circle at 50% 46%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 44%), var(--surface2)",
            borderColor: "var(--border-accent)",
            boxShadow: "0 24px 80px color-mix(in srgb, var(--accent) 10%, transparent)",
          }}
        >
          <div className="pointer-events-none absolute inset-x-[-8%] bottom-9 h-6 rotate-[-2deg] rounded-full border-[5px] border-black/70 shadow-[0_2px_0_rgba(255,255,255,0.06)_inset,0_8px_30px_rgba(0,0,0,0.35)]" aria-hidden="true" />
          <div className="relative">
            <p className="select-none text-[7.5rem] font-black leading-none tracking-[-0.08em] sm:text-[9rem]"
              style={{
                color: "var(--accent)",
                textShadow: "0 0 30px color-mix(in srgb, var(--accent) 28%, transparent)",
              }}
              aria-hidden="true"
            >
              404
            </p>
            <HeartStraight
              size={52}
              weight="duotone"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[18%]"
              style={{ color: "var(--text)" }}
              aria-hidden="true"
            />
          </div>
        </div>

        <p className="mb-2 text-xs font-semibold tracking-[0.18em]" style={{ color: "var(--accent)" }}>
          VERKEERDE DEUR
        </p>
        <h1
          id="not-found-title"
          className="mx-auto max-w-xl text-3xl leading-tight sm:text-4xl"
          style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600 }}
        >
          Hmm… deze pagina heeft zich laten meeslepen.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
          De link klopt niet meer, de pagina is verhuisd — of je bent gewoon iets te enthousiast door het konijnenhol gekropen.
        </p>

        <Link
          href="/"
          className="focus-ring mx-auto mt-7 inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          Terug naar home
          <ArrowRight size={17} weight="bold" aria-hidden="true" />
        </Link>

        <p className="mx-auto mt-6 max-w-sm text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
          Je lokale profielen en antwoorden zijn niet weg. Alleen deze route mist z’n bestemming. 😏
        </p>
      </section>
    </PageShell>
  );
}
