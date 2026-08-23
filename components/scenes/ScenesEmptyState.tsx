import Link from "next/link";
import { CaretRight, FilmSlate, Plus } from "@phosphor-icons/react";

export default function ScenesEmptyState() {
  return (
    <section
      aria-labelledby="scenes-empty-title"
      className="mx-auto -mb-12 flex min-h-[55svh] w-full max-w-xl translate-y-12 items-center py-6 sm:-mb-8 sm:translate-y-8 sm:py-10"
    >
      <div
        className="w-full overflow-hidden rounded-3xl p-5 sm:p-7"
        style={{
          background: "linear-gradient(145deg, color-mix(in srgb, var(--surface2) 35%, var(--surface)), var(--surface) 62%)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="inline-flex min-h-9 items-center gap-2 rounded-full px-3"
          style={{ background: "var(--surface2)", color: "var(--text2)" }}
        >
          <FilmSlate size={16} aria-hidden="true" style={{ color: "var(--accent)" }} />
          <span className="text-xs font-medium">Samen voorbereiden</span>
        </div>

        <div className="mt-6 max-w-lg">
          <h2
            id="scenes-empty-title"
            className="text-[2rem] italic leading-[1.05] tracking-[-0.02em] sm:text-4xl"
            style={{
              color: "var(--text)",
              fontFamily: "var(--font-display, Georgia, serif)",
              fontWeight: 500,
            }}
          >
            Nog geen scènes
          </h2>
          <p className="mt-4 text-[15px] leading-6" style={{ color: "var(--text2)" }}>
            Een scène is een afgesproken kinkmoment met een duidelijk begin en einde. Plan samen wat jullie willen doen en welke afspraken gelden.
          </p>
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs font-medium" style={{ color: "var(--text2)" }} aria-label="Van plannen naar aftercare">
          <span style={{ color: "var(--text)" }}>Plan</span>
          <CaretRight size={12} aria-hidden="true" />
          <span>Speel</span>
          <CaretRight size={12} aria-hidden="true" />
          <span>Aftercare</span>
        </div>

        <Link
          href="/scene"
          className="btn-accent focus-ring mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 sm:w-auto sm:min-w-52"
        >
          <Plus size={17} aria-hidden="true" />
          Plan een scène
        </Link>
      </div>
    </section>
  );
}
