"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowSquareOut,
  Check,
  Database,
  DeviceMobile,
  MapPin,
  QrCode,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import EditorialHeading from "@/components/ui/EditorialHeading";

const rules = [
  {
    number: "01",
    title: "Jij vult in, KinkSync ordent",
    text: "Een voorkeur bestaat pas wanneer jij ze zelf invult. Rol, eerdere antwoorden of een match vullen niets stil voor je in.",
  },
  {
    number: "02",
    title: "Lokaal is het uitgangspunt",
    text: "Je profielen en afspraken leven standaard op dit toestel. Er is geen KinkSync-account dat je voorkeuren ergens centraal bewaart.",
  },
  {
    number: "03",
    title: "Delen blijft een bewuste stap",
    text: "Een QR-code, link, export of back-up ontstaat pas na jouw actie. Afgeschermde antwoorden reizen niet zomaar mee.",
  },
] as const;

const journey = [
  {
    icon: DeviceMobile,
    eyebrow: "Verken",
    title: "Bouw je profiel op",
    text: "Leg voorkeuren, grenzen en context vast op je eigen tempo. Geven en ontvangen blijven waar nodig aparte keuzes.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Vergelijk",
    title: "Zie waar het klikt en schuurt",
    text: "Leg twee gekozen profielen lokaal naast elkaar en krijg overeenkomsten, bespreekpunten en grenzen overzichtelijk bij elkaar.",
  },
  {
    icon: QrCode,
    eyebrow: "Deel",
    title: "Neem alleen mee wat bedoeld is",
    text: "Deel een profiel, scène of afspraak pas wanneer dat nuttig is. Privé blijft privé tenzij jij expliciet anders kiest.",
  },
] as const;

const localData = [
  "Profielen en antwoorden",
  "Privénotities en afgeschermde keuzes",
  "Vergelijkingen, scènes en contracthistoriek",
] as const;

const absentData = [
  "Geen KinkSync-account",
  "Geen centrale profielendatabank",
  "Geen automatische cloudsync tussen toestellen",
] as const;

const communityPlaces = [
  {
    name: "Place de Nous",
    city: "Diest",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Place%20de%20Nous%20Diest%20Belgium",
  },
  {
    name: "Fetish Café",
    city: "Antwerpen",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Fetish%20Caf%C3%A9%20Kleine%20Pieter%20Potstraat%208%20Antwerpen%20Belgium",
  },
] as const;

export default function AboutPage() {
  return (
    <PageShell width="3xl" className="lg:max-w-4xl">
      <header
        className="relative isolate overflow-hidden rounded-[28px] px-5 py-6 sm:px-8 sm:py-9"
        style={{
          background:
            "linear-gradient(145deg, color-mix(in srgb, var(--accent) 14%, var(--surface)) 0%, var(--surface) 52%, color-mix(in srgb, var(--maybe) 7%, var(--surface)) 100%)",
          border: "1px solid color-mix(in srgb, var(--accent) 22%, var(--border))",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl"
          style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)" }}
        />
        <div className="relative z-10 max-w-3xl">
          <EditorialHeading
            level={1}
            size="hero"
            eyebrow="Privacy door ontwerp"
            icon={<ShieldCheck size={16} weight="fill" aria-hidden="true" />}
            title={<><span>Jouw voorkeuren.</span><br />Jouw toestel. Jouw woorden.</>}
            titleAriaLabel="Jouw voorkeuren. Jouw toestel. Jouw woorden."
            description="KinkSync helpt mensen praten over voorkeuren, grenzen en afspraken. Je krijgt structuur voor het gesprek zonder dat de app voor jou beslist."
            testId="about-eyebrow"
          />

          <div
            data-testid="about-promises"
            className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-2xl"
            style={{ background: "var(--border)", border: "1px solid var(--border)" }}
            aria-label="Kernbeloftes"
          >
            {[
              ["Lokaal", "Op jouw toestel"],
              ["Bewust delen", "Alleen na jouw actie"],
              ["Jouw woorden", "Geen stille invulling"],
            ].map(([title, text]) => (
              <div
                key={title}
                className="min-w-0 px-2.5 py-3 sm:px-4 sm:py-3.5"
                style={{ background: "color-mix(in srgb, var(--surface) 92%, transparent)" }}
              >
                <p className="text-xs font-semibold leading-4 sm:text-sm">{title}</p>
                <p className="mt-1 text-[11px] leading-4 sm:text-xs sm:leading-5" style={{ color: "var(--text2)" }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="mt-10" aria-labelledby="rules-title">
        <SectionHeading eyebrow="De basis" title="Drie regels sturen het hele product" id="rules-title" />
        <div className="mt-5 grid md:grid-cols-3">
          {rules.map((rule) => (
            <article
              key={rule.number}
              className="border-t py-5 md:min-h-52 md:px-5 md:first:pl-0 md:last:pr-0"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="text-xs font-semibold tabular-nums" style={{ color: "var(--accent)" }}>{rule.number}</p>
              <h3 className="mt-3 text-base font-semibold">{rule.title}</h3>
              <p className="mt-2 text-[15px] leading-6" style={{ color: "var(--text2)" }}>{rule.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="journey-title">
        <SectionHeading
          eyebrow="Van profiel tot afspraak"
          title="Verkennen, vergelijken en delen zonder het gesprek kwijt te raken"
          id="journey-title"
        />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {journey.map(({ icon: Icon, eyebrow, title, text }, index) => (
            <article
              key={title}
              className="relative rounded-2xl p-5"
              style={{
                background: index === 1
                  ? "color-mix(in srgb, var(--accent) 8%, var(--surface))"
                  : "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--surface2)", color: "var(--accent)" }}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--text2)" }}>0{index + 1}</span>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>{eyebrow}</p>
              <h3 className="mt-1.5 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-[15px] leading-6" style={{ color: "var(--text2)" }}>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="mt-10 overflow-hidden rounded-[28px]"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        aria-labelledby="privacy-title"
      >
        <div className="grid md:grid-cols-2">
          <div className="p-5 sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--surface2)", color: "var(--accent)" }}>
              <Database size={22} aria-hidden="true" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>Bij jou</p>
            <h2 id="privacy-title" className="mt-2 text-xl font-semibold">Privacy begint lokaal</h2>
            <ul className="mt-4 space-y-2.5">
              {localData.map((item) => <CheckRow key={item}>{item}</CheckRow>)}
            </ul>
          </div>

          <div className="p-5 sm:p-6" style={{ background: "color-mix(in srgb, var(--surface2) 72%, var(--surface))" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--text2)" }}>Niet bij KinkSync</p>
            <h2 className="mt-2 text-xl font-semibold">Geen verborgen cloudlaag</h2>
            <ul className="mt-4 space-y-2.5">
              {absentData.map((item) => <CheckRow key={item} muted>{item}</CheckRow>)}
            </ul>
          </div>
        </div>
        <div
          className="border-t px-5 py-4 text-[15px] leading-6 sm:px-6"
          style={{ borderColor: "var(--border)", color: "var(--text2)" }}
        >
          Local-first betekent niet onverliesbaar. Maak een versleutelde back-up voordat je van browser, opslagcontext of toestel wisselt.
        </div>
      </section>

      <section className="mt-10" aria-labelledby="limits-title">
        <SectionHeading eyebrow="Menselijke grens" title="Eerlijk over wat de app niet kan beslissen" id="limits-title" />
        <div className="mt-5 divide-y" style={{ borderColor: "var(--border)" }}>
          <Limit title="Een match is een gesprekstarter">
            Een overeenkomst zegt dat twee ingevulde voorkeuren bij elkaar passen. Ze zegt niets over timing, context, stemming of toestemming op dit moment.
          </Limit>
          <Limit title="Een digitale bevestiging is geen identiteitsbewijs">
            Technische controles kunnen exacte inhoud en sleutelcontrole helpen verifiëren. Ze bewijzen geen wettelijke identiteit, begrip of afwezigheid van druk.
          </Limit>
          <Limit title="Historiek is geen blijvende toestemming">
            Een oude afspraak blijft geschiedenis. Consent kan altijd veranderen, verminderen of stoppen, ook buiten KinkSync.
          </Limit>
        </div>
      </section>

      <section
        className="relative mt-10 overflow-hidden rounded-[28px] p-5 sm:p-6"
        style={{
          background:
            "linear-gradient(145deg, color-mix(in srgb, var(--accent) 12%, var(--surface)) 0%, var(--surface) 68%, color-mix(in srgb, var(--maybe) 7%, var(--surface)) 100%)",
          border: "1px solid color-mix(in srgb, var(--accent) 24%, var(--border))",
        }}
        aria-labelledby="community-title"
      >
        <div className="relative z-10">
          <EditorialHeading
            level={2}
            size="section"
            eyebrow="Community in België"
            icon={<MapPin size={16} weight="fill" aria-hidden="true" />}
            title="Kink gebeurt ook buiten je scherm"
            id="community-title"
            description="KinkSync kan het gesprek openen. Wil je daarna tussen echte mensen staan, dan zijn dit twee Belgische plekken om zelf verder te ontdekken."
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {communityPlaces.map((place) => (
              <a
                key={place.name}
                href={place.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring group flex items-center gap-3 rounded-2xl p-4 transition-transform active:scale-[0.99]"
                style={{
                  background: "color-mix(in srgb, var(--surface) 94%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent) 18%, var(--border))",
                }}
                aria-label={`${place.name} in ${place.city} openen in Google Maps`}
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl" style={{ background: "var(--surface2)", color: "var(--accent)" }}>
                  <MapPin size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold leading-6">{place.name}</h3>
                  <p className="text-sm" style={{ color: "var(--text2)" }}>{place.city}</p>
                </div>
                <ArrowSquareOut size={17} className="flex-none" weight="bold" aria-hidden="true" style={{ color: "var(--accent)" }} />
              </a>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5" style={{ color: "var(--text2)" }}>
            Geen betaalde plaatsingen of officiële partners. Google Maps opent pas wanneer jij zelf op een locatie tikt; KinkSync stuurt geen profieldata mee.
          </p>
        </div>
      </section>

      <section
        className="mt-4 rounded-2xl p-5 sm:p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        aria-labelledby="technical-title"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>Technische verdieping</p>
        <h2 id="technical-title" className="mt-2 text-lg font-semibold">Wil je onder de motorkap kijken?</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-6" style={{ color: "var(--text2)" }}>
          De technische pagina beschrijft opslaggrenzen, cryptografische primitives, sleutelbeheer, back-ups, importvalidatie en responsible disclosure.
        </p>
        <Link
          href="/security"
          className="focus-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold"
          style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
        >
          Security &amp; privacy
          <ArrowRight size={16} weight="bold" aria-hidden="true" />
        </Link>
      </section>

      <section
        className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-4 py-3 text-sm"
        style={{ background: "color-mix(in srgb, var(--surface2) 64%, transparent)", color: "var(--text2)" }}
        aria-label="Contact"
      >
        <span className="font-medium">Vragen of suggesties?</span>
        <a
          href="https://fetlife.com/zwoelebeer"
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex min-h-11 items-center rounded-md px-1.5 font-semibold"
          style={{ color: "var(--accent-text)" }}
        >
          FetLife
        </a>
        <span aria-hidden="true">·</span>
        <a
          href="mailto:info@jordy.beer"
          className="focus-ring inline-flex min-h-11 items-center rounded-md px-1.5 font-semibold"
          style={{ color: "var(--accent-text)" }}
        >
          E-mail
        </a>
      </section>
    </PageShell>
  );
}

function SectionHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return <EditorialHeading level={2} size="section" eyebrow={eyebrow} title={title} id={id} />;
}

function CheckRow({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-[15px] leading-6" style={{ color: muted ? "var(--text2)" : "var(--text)" }}>
      <Check size={17} weight="bold" className="mt-1 flex-none" aria-hidden="true" style={{ color: muted ? "var(--text2)" : "var(--yes)" }} />
      <span>{children}</span>
    </li>
  );
}

function Limit({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <WarningCircle size={20} className="mt-0.5 flex-none" aria-hidden="true" style={{ color: "var(--maybe)" }} />
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-1.5 text-[15px] leading-6" style={{ color: "var(--text2)" }}>{children}</p>
        </div>
      </div>
    </article>
  );
}
