"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Database,
  EnvelopeSimple,
  LockKey,
  ShieldCheck,
  ShareNetwork,
  WarningCircle,
} from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";

const backupSteps = [
  "Maak een back-up nadat je betekenisvolle gegevens hebt toegevoegd of aangepast.",
  "Bewaar die op een plaats die je zelf vertrouwt.",
  "Bewaar het wachtwoord of de herstelgegevens apart van de back-up.",
  "Test herstel pas wanneer je begrijpt welke lokale gegevens hierdoor worden vervangen of teruggezet.",
] as const;

const reportDetails = [
  "welke pagina, flow of functie betrokken is;",
  "wat je verwachtte en wat er gebeurde;",
  "duidelijke, veilige reproductiestappen;",
  "de mogelijke impact;",
  "screenshots of logs, zolang die geen gevoelige gegevens van anderen bevatten.",
] as const;

export default function SecurityPage() {
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
            Vertrouwen zonder schijnzekerheid
          </p>
          <h1
            className="serif-safe mt-4 max-w-2xl text-4xl leading-[1.02] sm:text-5xl"
            style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
          >
            Security &amp; privacy
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "var(--text2)" }}>
            KinkSync is ontworpen als een private, local-first tool. Persoonlijke voorkeuren, grenzen, afspraken en private notities horen op je eigen toestel te blijven, tenzij je zelf bewust kiest om iets te delen.
          </p>
          <p className="mt-3 max-w-2xl text-base leading-7" style={{ color: "var(--text2)" }}>
            Deze pagina legt in gewone taal uit hoe die keuze technisch wordt ondersteund, wat je zelf kunt doen om je gegevens te beschermen en waar de grenzen van browseropslag liggen.
          </p>
        </div>
      </header>

      <section className="mt-12" aria-labelledby="local-first-title">
        <SectionHeading eyebrow="Opslag" title="Local-first by design" id="local-first-title" />
        <InfoCard icon={Database}>
          <p>
            KinkSync gebruikt geen profielaccount of cloudsync voor de kern van de app. De hosting serveert de appcode en updates, maar bewaart geen KinkSync-profielaccount.
          </p>
          <p className="mt-3">
            Dat betekent niet dat een browser onbeperkt en permanent opslag garandeert. Browserdata kan verloren gaan door bijvoorbeeld een reset, toestelwissel, opslagdruk, een verwijderd browserprofiel of een andere opslagcontext. Bewaar daarom een versleutelde back-up van gegevens die je niet wilt verliezen.
          </p>
        </InfoCard>
      </section>

      <section className="mt-12" aria-labelledby="sharing-title">
        <SectionHeading eyebrow="Delen" title="Bewust delen" id="sharing-title" />
        <InfoCard icon={ShareNetwork}>
          <p>Delen gebeurt alleen wanneer je daar zelf expliciet voor kiest.</p>
          <p className="mt-3">
            Gedeelde profielen en consent-gerelateerde gegevens worden vóór import gevalideerd. Private gegevens blijven buiten gedeelde payloads wanneer zij niet voor de gekozen deelactie bedoeld zijn.
          </p>
          <p className="mt-3">
            Private eigendomssleutels reizen niet mee in profiel-QR-codes of gedeelde links. Ze horen alleen in je versleutelde back-up.
          </p>
        </InfoCard>
      </section>

      <section className="mt-12" aria-labelledby="crypto-title">
        <SectionHeading eyebrow="Techniek" title="Cryptografie en back-ups" id="crypto-title" />
        <InfoCard icon={LockKey} accent>
          <p>
            KinkSync gebruikt Web Crypto met ECDSA P-256 en SHA-256 voor ondertekende, canonieke inhoud. De versleutelde back-up gebruikt AES-GCM-256 met een sleutel die via PBKDF2-SHA-256 wordt afgeleid.
          </p>
          <p className="mt-3">
            Cryptografie helpt de integriteit en vertrouwelijkheid van ondersteunde gegevensstromen beschermen. Ze vervangt geen zorgvuldige keuze over wat je deelt, met wie je deelt of waar je je back-up bewaart.
          </p>
        </InfoCard>
      </section>

      <section className="mt-12" aria-labelledby="backup-title">
        <SectionHeading eyebrow="Herstel" title="Jouw back-up is belangrijk" id="backup-title" />
        <div
          className="rounded-[28px] p-5 sm:p-7"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm leading-6" style={{ color: "var(--text2)" }}>
            Een versleutelde back-up is de praktische herstelroute wanneer browseropslag verloren gaat of je naar een ander toestel verhuist.
          </p>
          <ul className="mt-5 space-y-3">
            {backupSteps.map((step) => (
              <li key={step} className="flex items-start gap-2.5 text-sm leading-6">
                <Check size={17} weight="bold" className="mt-1 flex-none" aria-hidden="true" style={{ color: "var(--yes)" }} />
                <span>{step}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-6" style={{ color: "var(--text2)" }}>
            KinkSync zal nooit eerlijk kunnen beloven dat browseropslag onbegrensd of permanent blijft bestaan. Een back-up is daarom geen technische formaliteit, maar onderdeel van zorgvuldig omgaan met je eigen gegevens.
          </p>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="ongoing-title">
        <SectionHeading eyebrow="Onderhoud" title="Security is ongoing work" id="ongoing-title" />
        <InfoCard icon={ShieldCheck}>
          <p>
            Voor publieke releases worden relevante privacy-, security-, offline/PWA-, consent- en toegankelijkheidsrisico&apos;s getest en opnieuw beoordeeld.
          </p>
          <p className="mt-3">
            Geen software kan absolute veiligheid garanderen. KinkSync blijft daarom verbeteren op basis van tests, onafhankelijke review en verantwoord gemelde problemen.
          </p>
        </InfoCard>
      </section>

      <section className="mt-12" aria-labelledby="report-title">
        <SectionHeading eyebrow="Responsible disclosure" title="Een probleem melden" id="report-title" />
        <div
          className="overflow-hidden rounded-[28px]"
          style={{
            background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 10%, var(--surface)), var(--surface))",
            border: "1px solid color-mix(in srgb, var(--accent) 26%, var(--border))",
          }}
        >
          <div className="p-5 sm:p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--surface2)", color: "var(--accent)" }}>
              <EnvelopeSimple size={22} aria-hidden="true" />
            </div>
            <p className="mt-5 text-sm leading-6" style={{ color: "var(--text2)" }}>
              Denk je dat je een security- of privacyprobleem hebt gevonden? Meld het privé via:
            </p>
            <a
              href="mailto:security@jordy.dev"
              className="focus-ring mt-3 inline-flex min-h-11 items-center rounded-xl px-3 text-base font-semibold"
              style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
            >
              security@jordy.dev
            </a>

            <p className="mt-6 text-sm font-semibold">Vermeld bij voorkeur:</p>
            <ul className="mt-3 space-y-2.5">
              {reportDetails.map((detail) => (
                <li key={detail} className="flex items-start gap-2.5 text-sm leading-6" style={{ color: "var(--text2)" }}>
                  <Check size={17} weight="bold" className="mt-1 flex-none" aria-hidden="true" style={{ color: "var(--yes)" }} />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t px-5 py-4 sm:px-7" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
            <p className="text-sm leading-6" style={{ color: "var(--text2)" }}>
              Probeer geen gegevens van andere mensen te bekijken, veranderen of exporteren. Publiceer gevoelige technische details niet voordat er een redelijke kans is geweest om het probleem te onderzoeken.
            </p>
          </div>
        </div>
      </section>

      <section
        className="mt-12 rounded-[28px] p-5 sm:p-7"
        style={{
          background: "color-mix(in srgb, var(--maybe) 8%, var(--surface))",
          border: "1px solid color-mix(in srgb, var(--maybe) 30%, var(--border))",
        }}
        aria-labelledby="guarantee-title"
      >
        <WarningCircle size={28} aria-hidden="true" style={{ color: "var(--maybe)" }} />
        <h2
          id="guarantee-title"
          className="serif-safe mt-4 text-3xl leading-tight"
          style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
        >
          Geen garantiepagina
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: "var(--text2)" }}>
          Deze pagina beschrijft ontwerpkeuzes en verwachtingen. Zij is geen belofte van absolute veiligheid, geen certificering en geen vervanging voor zorgvuldig gebruik van je toestel, browser, back-ups en deelkeuzes.
        </p>
      </section>

      <Link
        href="/about"
        className="focus-ring mt-8 flex min-h-14 items-center rounded-2xl px-5 text-sm font-semibold"
        style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
      >
        <ArrowLeft size={17} weight="bold" aria-hidden="true" className="mr-2" />
        Terug naar over KinkSync
      </Link>
    </PageShell>
  );
}

function SectionHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>{eyebrow}</p>
      <h2
        id={id}
        className="serif-safe mt-2 text-3xl leading-tight"
        style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
      >
        {title}
      </h2>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  children,
  accent = false,
}: {
  icon: typeof ShieldCheck;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className="mt-6 rounded-[28px] p-5 sm:p-7"
      style={{
        background: accent
          ? "linear-gradient(135deg, color-mix(in srgb, var(--accent) 11%, var(--surface)), var(--surface))"
          : "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--surface2)", color: "var(--accent)" }}>
        <Icon size={22} aria-hidden="true" />
      </div>
      <div className="mt-5 max-w-3xl text-sm leading-6" style={{ color: "var(--text2)" }}>
        {children}
      </div>
    </div>
  );
}
