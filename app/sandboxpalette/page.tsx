"use client";

import { useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  Heart,
  Sparkle,
  UserPlus,
} from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import Wordmark from "@/components/Wordmark";

type PaletteMode = "current" | "warm" | "deep";

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

const CURRENT_THEME: ThemeStyle = {
  "--bg": "#09080E",
  "--surface": "#110F19",
  "--surface2": "#16141F",
  "--surface3": "#26222E",
  "--border": "#221F2C",
  "--border-accent": "rgba(217, 70, 175, 0.25)",
  "--text": "#EDE8F5",
  "--text2": "#9D9AB8",
  "--accent": "#D946AF",
  "--accent2": "#D4527C",
  "--accent-fill": "#A93187",
  "--accent-text": "#D946AF",
  "--on-accent": "#1A0714",
  "--on-accent-fill": "#FFFFFF",
};

const WARM_THEME: ThemeStyle = {
  "--bg": "#0D0A11",
  "--surface": "#15111A",
  "--surface2": "#1B1621",
  "--surface3": "#29222F",
  "--border": "#2B2330",
  "--border-accent": "rgba(212, 82, 124, 0.28)",
  "--text": "#F1EAF0",
  "--text2": "#ABA1AD",
  "--accent": "#D4527C",
  "--accent2": "#9D8BC2",
  "--accent-fill": "#BD416B",
  "--accent-text": "#DE6C92",
  "--on-accent": "#181225",
  "--on-accent-fill": "#FFFFFF",
};

const DEEP_THEME: ThemeStyle = {
  "--bg": "#09070D",
  "--surface": "#120E16",
  "--surface2": "#19131E",
  "--surface3": "#241C2A",
  "--border": "#302635",
  "--border-accent": "rgba(212, 82, 124, 0.32)",
  "--text": "#F1EAF0",
  "--text2": "#A198A4",
  "--accent": "#D4527C",
  "--accent2": "#8F7BA8",
  "--accent-fill": "#BD416B",
  "--accent-text": "#DE6C92",
  "--on-accent": "#181225",
  "--on-accent-fill": "#FFFFFF",
};

const statusSamples = [
  ["Heel graag", "#f97316", "Sterke positieve voorkeur"],
  ["Ja", "#10b981", "Positief"],
  ["Misschien", "#38bdf8", "Open gesprek"],
  ["Voor hen", "#818cf8", "Niet voor zichzelf"],
  ["Harde grens", "#ef4444", "Duidelijke limiet"],
] as const;

const warmSwatches = [
  ["Achtergrond", "#0D0A11"],
  ["Surface", "#15111A"],
  ["Surface 2", "#1B1621"],
  ["Surface 3", "#29222F"],
  ["Brand", "#D4527C"],
  ["Brand fill", "#BD416B"],
  ["Lavender", "#9D8BC2"],
  ["Tekst", "#F1EAF0"],
  ["Tekst 2", "#ABA1AD"],
] as const;

const deepSwatches = [
  ["Achtergrond", "#09070D"],
  ["Surface", "#120E16"],
  ["Surface 2", "#19131E"],
  ["Surface 3", "#241C2A"],
  ["Brand", "#D4527C"],
  ["Brand fill", "#BD416B"],
  ["Lavender", "#8F7BA8"],
  ["Tekst", "#F1EAF0"],
  ["Tekst 2", "#A198A4"],
] as const;

const modeLabels: Record<PaletteMode, string> = {
  current: "Huidig",
  warm: "Warm",
  deep: "Warm + deep",
};

export default function PaletteSandboxPage() {
  const [mode, setMode] = useState<PaletteMode>("warm");
  const theme = mode === "current" ? CURRENT_THEME : mode === "warm" ? WARM_THEME : DEEP_THEME;
  const proposalSwatches = mode === "deep" ? deepSwatches : warmSwatches;
  const proposalLabel = mode === "deep" ? "Warm + deep tokens" : "Warm restrained tokens";
  const secondaryContrast = mode === "deep" ? "~7.2:1" : "~7.9:1";

  return (
    <PageShell width="3xl" className="lg:max-w-4xl">
      <section className="pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text2)" }}>
          Visuele proef
        </p>
        <h1
          className="mt-2 text-3xl leading-tight"
          style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600 }}
        >
          Kleur zonder redesign
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: "var(--text2)" }}>
          Vergelijk huidig, warm en een diepere warme variant. De structuur en semantische statuskleuren blijven bewust intact.
        </p>

        <div
          className="mt-5 grid grid-cols-3 rounded-xl p-1"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          role="group"
          aria-label="Palet kiezen"
        >
          {(["current", "warm", "deep"] as const).map((value) => {
            const active = mode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className="focus-ring min-h-11 rounded-lg px-2 text-[11px] font-semibold sm:px-3 sm:text-sm"
                style={{
                  background: active ? "var(--surface)" : "transparent",
                  color: active ? "var(--text)" : "var(--text2)",
                  boxShadow: active ? "0 4px 16px rgba(0,0,0,.18)" : "none",
                }}
                aria-pressed={active}
              >
                {modeLabels[value]}
              </button>
            );
          })}
        </div>
      </section>

      <div
        className="overflow-hidden rounded-[28px] transition-colors duration-200"
        style={{ ...theme, background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        <div className="p-4 sm:p-6">
          <div className="mb-6 text-center">
            <h2 className="text-5xl"><Wordmark /></h2>
            <div
              className="mx-auto my-4 h-px w-24"
              style={{ background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }}
            />
            <p className="text-sm italic tracking-wide" style={{ color: "var(--text2)" }}>
              Verken grenzen. Samen.
            </p>
          </div>

          <section
            className="mx-auto max-w-xl overflow-hidden rounded-[28px] px-4 pb-6 pt-4 sm:px-5 sm:pb-7 sm:pt-5"
            style={{
              background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 7%, var(--surface2)), color-mix(in srgb, var(--accent) 2%, var(--surface)))",
              border: "1px solid color-mix(in srgb, var(--border-accent) 72%, var(--border))",
              boxShadow: "0 18px 44px color-mix(in srgb, var(--accent) 7%, transparent)",
            }}
          >
            <div className="px-2 pb-8 pt-1 text-center">
              <span
                className="mx-auto flex h-9 w-9 items-center justify-center rounded-full"
                style={{
                  background: "color-mix(in srgb, var(--accent) 11%, var(--surface2))",
                  border: "1px solid var(--border-accent)",
                  color: "var(--accent-text)",
                }}
              >
                <Sparkle size={17} weight="duotone" aria-hidden="true" />
              </span>
              <h3
                className="mt-3 text-[1.9rem] leading-[1.08]"
                style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600, color: "var(--text)" }}
              >
                Maak je eerste profiel
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                Begin met wat nieuwsgierig maakt.<br />
                De rest mag later komen.
              </p>
            </div>

            <div className="grid gap-3.5">
              <button
                type="button"
                className="focus-ring flex min-h-[72px] w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left"
                style={{
                  background: "color-mix(in srgb, var(--accent) 13%, var(--surface2))",
                  border: "1px solid color-mix(in srgb, var(--accent) 34%, var(--border))",
                }}
              >
                <span
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-full"
                  style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                >
                  <UserPlus size={20} weight="duotone" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>Maak mijn profiel</span>
                  <span className="mt-0.5 block text-xs leading-5" style={{ color: "var(--text2)" }}>Kies wat bij jou past</span>
                </span>
                <ArrowRight size={17} weight="bold" className="flex-none" style={{ color: "var(--accent-text)" }} aria-hidden="true" />
              </button>

              <button
                type="button"
                className="focus-ring flex min-h-[68px] w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left"
                style={{ background: "color-mix(in srgb, var(--surface2) 82%, transparent)", border: "1px solid var(--border)" }}
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full" style={{ background: "var(--surface3)", color: "var(--text2)" }}>
                  <Camera size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>Scan partnerprofiel</span>
                  <span className="mt-0.5 block text-xs leading-5" style={{ color: "var(--text2)" }}>Bekijk wat je partner heeft gedeeld</span>
                </span>
                <ArrowRight size={16} className="flex-none" style={{ color: "var(--text2)" }} aria-hidden="true" />
              </button>
            </div>
          </section>

          <div className="mt-7 grid gap-3 md:grid-cols-2">
            <section className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text2)" }}>Hiërarchie</p>
              <h3 className="mt-2 text-lg font-semibold" style={{ color: "var(--text)" }}>Rustige surface, duidelijke actie</h3>
              <p className="mt-1.5 text-sm leading-6" style={{ color: "var(--text2)" }}>
                Brandkleur trekt de blik. Ondersteunende informatie blijft leesbaar zonder hetzelfde gewicht te krijgen.
              </p>
              <button
                type="button"
                className="focus-ring mt-4 min-h-11 rounded-xl px-4 text-sm font-bold"
                style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
              >
                Primaire actie
              </button>
            </section>

            <section className="rounded-2xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text2)" }}>Detail</p>
                  <h3 className="mt-2 text-xl font-semibold" style={{ color: "var(--text)" }}>Spanking (geven)</h3>
                </div>
                <Heart size={22} aria-hidden="true" style={{ color: "var(--accent-text)" }} />
              </div>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--text2)" }}>
                Een voorbeeld van editorial content zonder dat brandkleur het hele vlak overneemt.
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}>
                <Check size={17} weight="bold" aria-hidden="true" style={{ color: "var(--accent-text)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Jij: Heel graag</span>
              </div>
            </section>
          </div>

          <section className="mt-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text2)" }}>Semantiek</p>
                <h3 className="mt-2 text-lg font-semibold" style={{ color: "var(--text)" }}>Veel hues, weinig visuele gewichten</h3>
              </div>
              <span className="text-xs" style={{ color: "var(--text2)" }}>Bewust ongewijzigd</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {statusSamples.map(([label, color, description]) => (
                <div key={label} className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <span
                    className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ color, background: `color-mix(in srgb, ${color} 13%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 55%, transparent)` }}
                  >
                    {label}
                  </span>
                  <p className="mt-2 text-[11px] leading-4" style={{ color: "var(--text2)" }}>{description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="mt-7 rounded-2xl p-4 sm:p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text2)" }}>{proposalLabel}</p>
            <h2 className="mt-2 text-lg font-semibold">Voorstel, niet globaal toegepast</h2>
          </div>
          <div className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "color-mix(in srgb, var(--yes) 10%, var(--surface2))", color: "var(--yes)" }}>
            Contrast-first
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {proposalSwatches.map(([label, color]) => (
            <div key={label}>
              <div className="h-12 rounded-xl" style={{ background: color, border: "1px solid var(--border)" }} />
              <p className="mt-1.5 text-[11px] font-medium">{label}</p>
              <p className="text-[10px] tabular-nums" style={{ color: "var(--text2)" }}>{color}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-2 text-xs sm:grid-cols-3">
          <Metric label="Brand op bg" value={mode === "deep" ? "~5.1:1" : "~5.0:1"} note="AA voor gewone tekst" />
          <Metric label="Secondary op bg" value={secondaryContrast} note="Sterk voor lange sessies" />
          <Metric label="Wit op brand fill" value="~5.1:1" note="AA voor CTA-labels" />
        </div>
      </section>

      <p className="mt-5 pb-3 text-xs leading-5" style={{ color: "var(--text2)" }}>
        Sandbox: alleen visueel. Geen globale tokens, opslag, profieldata of productflows worden aangepast.
      </p>
    </PageShell>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums">{value}</p>
      <p className="mt-1 leading-4" style={{ color: "var(--text2)" }}>{note}</p>
    </div>
  );
}
