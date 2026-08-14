import Link from "next/link";
import { ArrowRight, HeartStraight } from "@phosphor-icons/react/dist/ssr";
import PageShell from "@/components/PageShell";

export default function NotFound() {
  return (
    <PageShell width="2xl" className="flex min-h-[calc(100dvh-var(--bottom-nav-h)-7rem)] items-center py-8">
      <section className="w-full text-center" aria-labelledby="not-found-title">
        <div
          className="relative mx-auto mb-7 min-h-64 max-w-md overflow-hidden rounded-[32px] border px-4 pt-7"
          style={{
            background: "radial-gradient(ellipse at 50% 48%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 48%), linear-gradient(180deg, color-mix(in srgb, var(--surface2) 94%, black), var(--surface))",
            borderColor: "var(--border-accent)",
            boxShadow: "0 24px 80px color-mix(in srgb, var(--accent) 12%, transparent)",
          }}
        >
          <span className="absolute left-[14%] top-[29%] text-2xl opacity-70" style={{ color: "var(--accent)" }} aria-hidden="true">♡</span>
          <span className="absolute right-[12%] top-[20%] text-xl opacity-75" style={{ color: "var(--accent)" }} aria-hidden="true">✦</span>
          <span className="absolute right-[9%] top-[48%] text-2xl opacity-65" style={{ color: "var(--accent)" }} aria-hidden="true">♡</span>

          <div className="relative z-10 flex justify-center" aria-hidden="true">
            <span
              className="select-none text-[7.5rem] font-black leading-none tracking-[-0.08em] sm:text-[9rem]"
              style={{
                color: "transparent",
                WebkitTextStroke: "3px var(--accent)",
                textShadow: "0 0 7px var(--accent), 0 0 22px color-mix(in srgb, var(--accent) 72%, transparent), 0 0 48px color-mix(in srgb, var(--accent) 38%, transparent)",
              }}
            >
              404
            </span>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24" aria-hidden="true">
            <div
              className="absolute inset-x-[4%] bottom-3 h-[46px] rounded-[50%]"
              style={{
                background: "radial-gradient(ellipse, color-mix(in srgb, var(--accent) 16%, transparent), transparent 66%)",
                filter: "blur(8px)",
              }}
            />
            <div
              className="absolute inset-x-[-9%] bottom-8 h-[18px] -rotate-2 rounded-full border-[6px] border-[#09090b]"
              style={{ boxShadow: "inset 0 2px 2px rgba(255,255,255,.12), 0 7px 15px rgba(0,0,0,.7)" }}
            />
            <div
              className="absolute left-1/2 bottom-4 h-[86px] w-[104px] -translate-x-1/2 rotate-[-8deg] rounded-[50%] border-[9px] border-[#09090b]"
              style={{ boxShadow: "inset 2px 2px 2px rgba(255,255,255,.10), 0 8px 18px rgba(0,0,0,.65)" }}
            />
            <div
              className="absolute left-1/2 bottom-[5px] h-[76px] w-[96px] -translate-x-[12%] rotate-[25deg] rounded-[50%] border-[9px] border-[#09090b]"
              style={{ boxShadow: "inset 2px 2px 2px rgba(255,255,255,.10), 0 8px 18px rgba(0,0,0,.65)" }}
            />
            <HeartStraight
              size={57}
              weight="regular"
              className="absolute bottom-[24px] left-1/2 -translate-x-1/2"
              style={{ color: "var(--accent)", filter: "drop-shadow(0 0 8px color-mix(in srgb, var(--accent) 55%, transparent))" }}
            />
          </div>

          <div
            className="pointer-events-none absolute inset-x-[8%] bottom-0 h-px"
            style={{ boxShadow: "0 -10px 30px 9px color-mix(in srgb, var(--accent) 14%, transparent)" }}
            aria-hidden="true"
          />
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
