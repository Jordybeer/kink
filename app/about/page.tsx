"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowSquareOut,
  CaretRight,
  Check,
  Database,
  DeviceMobile,
  Fingerprint,
  LockKey,
  MapPin,
  QrCode,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";

const rules = [
  {
    number: "01",
    title: "Antwoorden blijven van jou",
    text: "KinkSync kan bepalen welke vraag nuttig volgt, maar een voorkeur bestaat pas wanneer jij ze invult. Rol en eerdere antwoorden vullen niets voor je in.",
  },
  {
    number: "02",
    title: "Lokaal als uitgangspunt",
    text: "Profielen, antwoorden, vergelijkingen, scènes en contracten leven in de browseropslag van dit toestel — niet in een KinkSync-account.",
  },
  {
    number: "03",
    title: "Delen vraagt een handeling",
    text: "Profielgegevens worden pas gedeeld of geëxporteerd wanneer jij daar zelf voor kiest, bijvoorbeeld via QR, link, tekst, pdf of back-up. Geen stille synchronisatie op de achtergrond.",
  },
] as const;

const localData = [
  "Profielen en expliciete antwoorden",
  "Privénotities en afgeschermde antwoorden",
  "Vergelijkingen, scènes en contracthistoriek",
  "Lokale eigendomssleutels",
] as const;

const absentData = [
  "Geen KinkSync-account",
  "Geen centrale profielendatabank",
  "Geen server-side voorkeurenprofiel",
  "Geen automatische synchronisatie tussen toestellen",
] as const;

const journey = [
  {
    icon: DeviceMobile,
    eyebrow: "Verken",
    title: "Bouw je profiel op",
    text: "Leg voorkeuren, grenzen, context en privénotities vast op je eigen tempo. Geven en ontvangen blijven waar nodig aparte keuzes.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Vergelijk",
    title: "Zie waar het klikt en schuurt",
    text: "KinkSync legt twee gekozen profielen lokaal naast elkaar en ordent overeenkomsten, bespreekpunten en grenzen zodat je weet waarover je moet praten.",
  },
  {
    icon: QrCode,
    eyebrow: "Deel",
    title: "Neem alleen mee wat bedoeld is",
    text: "Bij profieloverdracht reizen alleen publieke antwoorden mee. Afgeschermde antwoorden blijven buiten QR-codes en gedeelde links.",
  },
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
        className="relative isolate overflow-hidden rounded-[28px] px-5 py-7 sm:px-8 sm:py-10"
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
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
            <ShieldCheck size={16} weight="fill" aria-hidden="true" />
            Privacy door ontwerp
          </p>
          <h1
            aria-label="Jouw voorkeuren. Jouw toestel. Jouw woorden."
            className="serif-safe mt-4 max-w-2xl text-4xl leading-[1.02] sm:text-5xl"
            style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
          >
            Jouw voorkeuren.<br />
            Jouw toestel. Jouw woorden.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "var(--text2)" }}>
            KinkSync helpt mensen praten over voorkeuren, grenzen en afspraken, van eerste verkenning tot vergelijking en contract.
            Gevoelige data blijft daarbij standaard op je eigen toestel.
          </p>

          <div
            className="mt-7 grid gap-px overflow-hidden rounded-2xl sm:grid-cols-3"
            style={{ background: "var(--border)", border: "1px solid var(--border)" }}
            aria-label="Kernbeloftes"
          >
            {[
              ["Lokaal", "Standaard op dit toestel"],
              ["Bewust delen", "Jij kiest wat vertrekt"],
              ["Controleerbaar", "Ondertekende versies"],
            ].map(([title, text]) => (
              <div key={title} className="px-4 py-3.5" style={{ background: "color-mix(in srgb, var(--surface) 92%, transparent)" }}>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs leading-5" style={{ color: "var(--text2)" }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section
        className="relative mt-6 overflow-hidden rounded-[28px] p-5 sm:mt-8 sm:p-7"
        style={{
          background:
            "linear-gradient(145deg, color-mix(in srgb, var(--accent) 14%, var(--surface)) 0%, var(--surface) 62%, color-mix(in srgb, var(--maybe) 8%, var(--surface)) 100%)",
          border: "1px solid color-mix(in srgb, var(--accent) 28%, var(--border))",
        }}
        aria-labelledby="community-title"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full blur-3xl"
          style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}
        />
        <div className="relative z-10">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
            <MapPin size={16} weight="fill" aria-hidden="true" />
            Community in België
          </p>
          <h2 id="community-title" className="serif-safe mt-3 max-w-xl text-3xl leading-tight" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>
            Kink gebeurt ook buiten je scherm.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7" style={{ color: "var(--text2)" }}>
            KinkSync kan het gesprek openen. Wil je daarna eens tussen echte mensen staan? Dit zijn twee Belgische plekken om zelf verder te ontdekken.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {communityPlaces.map((place) => (
              <a
                key={place.name}
                href={place.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring group flex min-h-32 flex-col justify-between rounded-2xl p-5 transition-transform active:scale-[0.99]"
                style={{
                  background: "color-mix(in srgb, var(--surface) 94%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent) 18%, var(--border))",
                }}
                aria-label={`${place.name} in ${place.city} openen in Google Maps`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl" style={{ background: "var(--surface2)", color: "var(--accent)" }}>
                    <MapPin size={20} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold leading-6">{place.name}</h3>
                    <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>{place.city}</p>
                  </div>
                </div>
                <span className="mt-5 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--accent)" }}>
                  Open in Google Maps
                  <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>

          <p className="mt-5 text-xs leading-5" style={{ color: "var(--text2)" }}>
            Geen betaalde plaatsingen of officiële partners. Google Maps opent pas wanneer jij zelf op een locatie tikt; KinkSync stuurt geen profieldata mee.
          </p>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="rules-title">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>De basis</p>
          <h2 id="rules-title" className="serif-safe mt-2 text-3xl leading-tight" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>
            Drie regels sturen het hele product
          </h2>
        </div>
        <div className="mt-6 grid md:grid-cols-3">
          {rules.map((rule) => (
            <article
              key={rule.number}
              className="border-t py-5 md:min-h-56 md:px-5 md:first:pl-0 md:last:pr-0"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="text-xs font-semibold tabular-nums" style={{ color: "var(--accent)" }}>{rule.number}</p>
              <h3 className="mt-3 text-base font-semibold">{rule.title}</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--text2)" }}>{rule.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="mt-10 overflow-hidden rounded-[28px]"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        aria-labelledby="storage-title"
      >
        <div className="grid md:grid-cols-2">
          <div className="p-5 sm:p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--surface2)", color: "var(--accent)" }}>
              <Database size={22} aria-hidden="true" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>Op dit toestel</p>
            <h2 id="storage-title" className="mt-2 text-xl font-semibold">Hier leeft je gevoelige data</h2>
            <ul className="mt-5 space-y-3">
              {localData.map((item) => <CheckRow key={item}>{item}</CheckRow>)}
            </ul>
          </div>

          <div className="p-5 sm:p-7" style={{ background: "color-mix(in srgb, var(--surface2) 72%, var(--surface))" }}>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--surface)", color: "var(--text2)" }}>
              <Fingerprint size={22} aria-hidden="true" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--text2)" }}>Niet bij KinkSync</p>
            <h2 className="mt-2 text-xl font-semibold">Wat er bewust niet bestaat</h2>
            <ul className="mt-5 space-y-3">
              {absentData.map((item) => <CheckRow key={item} muted>{item}</CheckRow>)}
            </ul>
          </div>
        </div>

        <div
          className="flex items-start gap-3 border-t px-5 py-4 sm:px-7"
          style={{
            borderColor: "var(--border)",
            background: "color-mix(in srgb, var(--maybe) 7%, var(--surface))",
          }}
        >
          <WarningCircle size={20} className="mt-0.5 flex-none" aria-hidden="true" style={{ color: "var(--maybe)" }} />
          <p className="text-sm leading-6" style={{ color: "var(--text2)" }}>
            <strong style={{ color: "var(--text)" }}>Belangrijk bij installeren:</strong>{" "}
            op iOS kunnen Safari en de geïnstalleerde Home Screen-app aparte opslagcontexten zijn.
            Reken niet op automatische synchronisatie en maak vóór een wissel een versleutelde back-up.
          </p>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="journey-title">
        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>Van profiel tot afspraak</p>
        <h2 id="journey-title" className="serif-safe mt-2 max-w-xl text-3xl leading-tight" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>
          Verkennen, vergelijken en delen.<br />Zonder de menselijke context kwijt te raken.
        </h2>
        <div className="mt-7 grid gap-3 md:grid-cols-3">
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
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>{eyebrow}</p>
              <h3 className="mt-1.5 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--text2)" }}>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="trust-title">
        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>Vertrouwensgrenzen</p>
        <h2 id="trust-title" className="serif-safe mt-2 text-3xl leading-tight" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>
          Controle zonder schijnzekerheid
        </h2>

        <div className="mt-7 grid gap-3 md:grid-cols-2">
          <TrustCard icon={ShieldCheck} title="Privé blijft afgeschermd" className="md:col-span-2">
            Een afgeschermd antwoord telt niet mee in vergelijkingen en blijft uit profieloverdracht. Tekst- en pdf-export nemen het alleen mee nadat jij daar expliciet voor kiest.
          </TrustCard>
          <TrustCard icon={Fingerprint} title="Een herkenbare bron">
            Eigen profielen kunnen versies lokaal ondertekenen. Een geïmporteerd profiel blijft vergrendeld; een ontvanger krijgt niet stilletjes eigendom of bewerkrechten.
          </TrustCard>
          <TrustCard icon={LockKey} title="Exacte getekende versies">
            Een ondertekening hoort bij de exacte contractinhoud en betrokken profielen. Een oude versie blijft leesbaar, maar stelt nooit automatisch de huidige consent voor.
          </TrustCard>
          <TrustCard icon={Database} title="Eén versleutelde herstelroute" className="md:col-span-2" accent>
            De bestaande back-up bundelt profielen, contractreeksen, historiek en lokale eigendomssleutels.
            Ze wordt met je wachtwoord versleuteld; KinkSync bewaart dat wachtwoord niet en kan het niet herstellen.
          </TrustCard>
        </div>
      </section>

      <section
        className="mt-12 rounded-[28px] p-5 sm:p-7"
        style={{
          background: "color-mix(in srgb, var(--maybe) 8%, var(--surface))",
          border: "1px solid color-mix(in srgb, var(--maybe) 30%, var(--border))",
        }}
        aria-labelledby="limits-title"
      >
        <div className="grid gap-7 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <WarningCircle size={28} aria-hidden="true" style={{ color: "var(--maybe)" }} />
            <h2 id="limits-title" className="serif-safe mt-4 text-3xl leading-tight" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>
              Eerlijk over de grenzen
            </h2>
            <p className="mt-3 text-sm leading-6" style={{ color: "var(--text2)" }}>
              Cryptografie kan manipulatie zichtbaar maken. Ze kan menselijke consent niet vervangen.
            </p>
          </div>
          <div>
            <Limit title="Een handtekening is geen identiteitsbewijs">
              Ze bewijst controle over een lokale sleutel en een exacte inhoud — niet iemands wettelijke identiteit, begrip of afwezigheid van druk.
            </Limit>
            <Limit title="De appvergrendeling is geen encryptie van browseropslag">
              De pincode helpt tegen meekijken in de app. Ze beschermt niet tegen iemand die het ontgrendelde toestel, de browseropslag of het besturingssysteem controleert.
            </Limit>
            <Limit title="Historiek is geen blijvende toestemming">
              Consent kan altijd worden verminderd of ingetrokken, ook buiten KinkSync. Praat opnieuw wanneer context, lichaam of gevoel verandert.
            </Limit>
          </div>
        </div>
      </section>

      <details
        className="mt-4 overflow-hidden rounded-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <summary className="focus-ring flex min-h-14 cursor-pointer items-center px-4 text-sm font-semibold sm:px-5">
          Technische verdieping
          <CaretRight size={16} aria-hidden="true" className="ml-auto" />
        </summary>
        <div className="border-t px-4 py-5 text-sm leading-6 sm:px-5" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
          <p>
            KinkSync gebruikt Web Crypto met ECDSA P-256 en SHA-256 voor ondertekende, canonieke inhoud.
            De versleutelde back-up gebruikt AES-GCM-256 met een via PBKDF2-SHA-256 afgeleide sleutel.
          </p>
          <p className="mt-3">
            Gedeelde payloads worden vóór import gevalideerd. Private eigendomssleutels reizen niet mee in profiel-QR-codes of gedeelde links;
            ze horen alleen in de versleutelde back-up. De hosting serveert wel de appcode en updates, maar bewaart geen KinkSync-profielaccount.
          </p>
        </div>
      </details>

      <Link
        href="/"
        className="focus-ring mt-8 flex min-h-14 items-center rounded-2xl px-5 text-sm font-semibold"
        style={{ background: "var(--accent)", color: "var(--on-accent)" }}
      >
        Terug naar KinkSync
        <ArrowRight size={17} weight="bold" aria-hidden="true" className="ml-auto" />
      </Link>
    </PageShell>
  );
}

function CheckRow({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-6" style={{ color: muted ? "var(--text2)" : "var(--text)" }}>
      <Check size={17} weight="bold" className="mt-1 flex-none" aria-hidden="true" style={{ color: muted ? "var(--text2)" : "var(--yes)" }} />
      <span>{children}</span>
    </li>
  );
}

function TrustCard({
  icon: Icon,
  title,
  children,
  className = "",
  accent = false,
}: {
  icon: typeof ShieldCheck;
  title: string;
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl p-5 sm:p-6 ${className}`}
      style={{
        background: accent
          ? "linear-gradient(135deg, color-mix(in srgb, var(--accent) 11%, var(--surface)), var(--surface))"
          : "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl" style={{ background: "var(--surface2)", color: "var(--accent)" }}>
          <Icon size={21} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: "var(--text2)" }}>{children}</p>
        </div>
      </div>
    </article>
  );
}

function Limit({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="border-t py-4 first:border-t-0 first:pt-0 last:pb-0" style={{ borderColor: "var(--border)" }}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-6" style={{ color: "var(--text2)" }}>{children}</p>
    </article>
  );
}
