"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Database,
  EnvelopeSimple,
  Fingerprint,
  Key,
  LockKey,
  QrCode,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import EditorialHeading from "@/components/ui/EditorialHeading";

const reportDetails = [
  "welke pagina, flow of functie betrokken is;",
  "wat je verwachtte en wat er gebeurde;",
  "duidelijke, veilige reproductiestappen;",
  "de mogelijke impact;",
  "screenshots of logs, zolang die geen gevoelige gegevens van anderen bevatten.",
] as const;

const corePersistedData = [
  "profielen en lokale profielmomenten",
  "legacy contract-snapshots",
  "scènes en consenthistoriek",
  "lokale profiel-eigendomssleutels",
  "appinstellingen die lokaal moeten overleven",
] as const;

const contractPersistedData = [
  "contractreeksen, versies en lifecycle-events",
  "migratiemarkers voor legacy contract-snapshots",
] as const;

const shareBoundaries = [
  "Afgeschermde profielantwoorden worden uit gedeelde profielpayloads gefilterd.",
  "Private eigendomssleutels reizen niet mee in profiel-QR-codes of gedeelde links.",
  "Binnenkomende profieldata wordt gesaneerd en begrensd voordat ze als profiel wordt gebruikt.",
] as const;

export default function SecurityPage() {
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
            eyebrow="Technische referentie"
            icon={<ShieldCheck size={16} weight="fill" aria-hidden="true" />}
            title="Security & privacy"
            description="Deze pagina beschrijft de technische trust boundaries van KinkSync: wat lokaal wordt opgeslagen, welke cryptografie wordt gebruikt, wat gedeelde payloads bevatten en welke garanties de app bewust niet claimt."
            testId="security-eyebrow"
          />
        </div>
      </header>

      <section className="mt-10" aria-labelledby="storage-title">
        <SectionHeading eyebrow="01 · Opslagmodel" title="Local-first betekent browseropslag, geen beveiligde enclave" id="storage-title" />
        <TechnicalCard icon={Database}>
          <p>
            KinkSync gebruikt twee afzonderlijk gepersisteerde lokale Zustand-stores. Beide leven in browseropslag, maar hebben elk hun eigen storage key:
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Spec label="Kernstore" value="kink-profiles" />
            <Spec label="Contractstore" value="kink-contract-series" />
          </div>
          <p className="mt-5 font-semibold" style={{ color: "var(--text)" }}>De kernstore bevat onder meer:</p>
          <ul className="mt-3 space-y-2.5">
            {corePersistedData.map((item) => <CheckRow key={item}>{item}</CheckRow>)}
          </ul>
          <p className="mt-5 font-semibold" style={{ color: "var(--text)" }}>De aparte contractstore bevat:</p>
          <ul className="mt-3 space-y-2.5">
            {contractPersistedData.map((item) => <CheckRow key={item}>{item}</CheckRow>)}
          </ul>
          <Callout className="mt-5">
            De gewone browseropslag is niet als geheel versleuteld. Local-first vermindert de centrale serverdata die KinkSync bewaart, maar maakt localStorage niet onleesbaar voor code die binnen dezelfde origin draait of voor iemand die het toestel, de browser of het besturingssysteem controleert.
          </Callout>
        </TechnicalCard>
      </section>

      <section className="mt-10" aria-labelledby="backup-title">
        <SectionHeading eyebrow="02 · Back-up" title="AES-GCM met een wachtwoord-afgeleide sleutel" id="backup-title" />
        <TechnicalCard icon={LockKey} accent>
          <div className="grid gap-2 sm:grid-cols-2">
            <Spec label="Encryptie" value="AES-GCM 256-bit" />
            <Spec label="KDF" value="PBKDF2 + SHA-256" />
            <Spec label="Iteraties" value="310.000" />
            <Spec label="Salt" value="16 random bytes" />
            <Spec label="IV" value="12 random bytes" />
            <Spec label="Implementatie" value="Web Crypto API" />
          </div>
          <p className="mt-5">
            Het back-upwachtwoord wordt gebruikt om lokaal een AES-sleutel af te leiden. Het wachtwoord zelf wordt niet in het back-upbestand opgenomen en KinkSync heeft geen server-side herstelmechanisme voor dat wachtwoord.
          </p>
          <p className="mt-3">
            De versleutelde herstelroute kan profiel-eigendomssleutels meenemen. Dat is bewust anders dan een profielshare: een back-up is bedoeld om jouw lokale eigendom te herstellen, niet om die eigendom aan een andere persoon over te dragen.
          </p>
        </TechnicalCard>
      </section>

      <section className="mt-10" aria-labelledby="signing-title">
        <SectionHeading eyebrow="03 · Ondertekening" title="ECDSA P-256 over canonieke payloads" id="signing-title" />
        <TechnicalCard icon={Fingerprint}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Spec label="Algoritme" value="ECDSA" />
            <Spec label="Curve" value="P-256" />
            <Spec label="Hash" value="SHA-256" />
            <Spec label="Sleutelformaat" value="JWK" />
          </div>
          <p className="mt-5">
            Objecten die ondertekend worden, gaan eerst door een canonieke JSON-projectie waarbij objectsleutels deterministisch worden gesorteerd. De payload krijgt een SHA-256-hash en de ECDSA-handtekening bindt zich aan de exacte proofvelden.
          </p>
          <p className="mt-3">
            De lokale key ID is afgeleid van de canonieke publieke JWK. Profielproofs kunnen via <Code>previousProofHash</Code> naar een eerdere proof verwijzen, zodat opeenvolgende bevestigingen aan dezelfde lokale sleutelgeschiedenis gekoppeld kunnen blijven.
          </p>
          <Callout className="mt-5">
            Een geldige handtekening bewijst controle over een cryptografische sleutel en de integriteit van de exacte payload. Ze bewijst geen wettelijke identiteit, vrijwilligheid, begrip of actuele toestemming.
          </Callout>
        </TechnicalCard>
      </section>

      <section className="mt-10" aria-labelledby="sharing-title">
        <SectionHeading eyebrow="04 · Delen en import" title="Private data wordt vóór profieltransport afgesneden" id="sharing-title" />
        <TechnicalCard icon={QrCode}>
          <ul className="space-y-2.5">
            {shareBoundaries.map((item) => <CheckRow key={item}>{item}</CheckRow>)}
          </ul>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Spec label="Max. encoded profiel" value="6.000.000 tekens" />
            <Spec label="Max. inflated profiel" value="4.000.000 bytes" />
          </div>
          <p className="mt-5">
            Profieltransport kan deflate-compressie gebruiken wanneer de browser <Code>CompressionStream</Code> ondersteunt. Decoderen gebeurt begrensd zodat een gecomprimeerde payload niet onbeperkt mag uitzetten.
          </p>
        </TechnicalCard>
      </section>

      <section className="mt-10" aria-labelledby="contracts-title">
        <SectionHeading eyebrow="05 · Contractdata" title="Versies, signatures en hash-gekoppelde historiek zijn verschillende lagen" id="contracts-title" />
        <TechnicalCard icon={Key}>
          <p>
            Contractreeksen bevatten deelnemers, versies, inhoudshashes, signatures en lifecycle-events. Bij back-upimport worden beschikbare contractstructuren gecontroleerd op interne referenties, content hashes, participant-key koppelingen, signatures en eventhash-ketens voordat ze als geldige reeks worden meegenomen.
          </p>
          <p className="mt-3">
            Dat maakt cryptografisch controleerbare historiek mogelijk, maar een geldige oude versie is niet hetzelfde als actuele consent authority. Productlogica voor huidige state, lifecycle-transities en wederzijdse bevestiging blijft een aparte beveiligingslaag boven op de cryptografie.
          </p>
        </TechnicalCard>
      </section>

      <section className="mt-10" aria-labelledby="restore-title">
        <SectionHeading eyebrow="06 · Restore boundary" title="Herstel valideert data, maar tijd en context blijven betekenis houden" id="restore-title" />
        <TechnicalCard icon={ShieldCheck}>
          <p>
            Een herstelbestand wordt niet blind teruggeschreven. Profielen worden gesaneerd, eigendomssleutels worden cryptografisch gecontroleerd en contractreeksen moeten hun structurele en cryptografische integriteitschecks doorstaan.
          </p>
          <p className="mt-3">
            Toch mag een restore niet worden gelezen als bewijs dat een oude afspraak vandaag opnieuw actief of gewenst is. Back-upintegriteit en actuele toestemming zijn verschillende vragen.
          </p>
        </TechnicalCard>
      </section>

      <section className="mt-10" aria-labelledby="browser-title">
        <SectionHeading eyebrow="07 · Browser en PWA" title="De storage boundary volgt de browsercontext" id="browser-title" />
        <TechnicalCard icon={Database}>
          <p>
            Safari en een geïnstalleerde Home Screen-app kunnen op iOS in verschillende opslagcontexten terechtkomen. Een installatie of toestelwissel is daarom geen synchronisatiehandeling. Maak vóór zo&apos;n wissel een versleutelde back-up wanneer je lokale data wilt behouden.
          </p>
          <p className="mt-3">
            Browseropslag kan ook verdwijnen door een reset, verwijderd browserprofiel, opslagdruk of andere platformacties. KinkSync probeert schrijffouten zichtbaar te maken, maar kan de duurzaamheid van browseropslag niet absoluut garanderen.
          </p>
        </TechnicalCard>
      </section>

      <section className="mt-10" aria-labelledby="app-lock-title">
        <SectionHeading eyebrow="08 · App lock" title="Een lokale toegangspoort, geen encryptie-at-rest" id="app-lock-title" />
        <TechnicalCard icon={LockKey}>
          <p>
            Een ingestelde PIN wordt niet als platte tekst bewaard. Nieuwe PINs worden met PBKDF2 en SHA-256 over 310.000 iteraties gehasht met een random salt. Verificatie vergelijkt het afgeleide resultaat zonder de PIN terug te halen.
          </p>
          <p className="mt-3">
            De app lock beschermt vooral tegen casual toegang via de KinkSync-interface. Hij versleutelt niet automatisch de volledige browseropslag en is geen verdediging tegen een gecompromitteerde origin, browser of toestel.
          </p>
        </TechnicalCard>
      </section>

      <section className="mt-10" aria-labelledby="report-title">
        <SectionHeading eyebrow="09 · Responsible disclosure" title="Een security- of privacyprobleem melden" id="report-title" />
        <div
          className="overflow-hidden rounded-[28px]"
          style={{
            background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 10%, var(--surface)), var(--surface))",
            border: "1px solid color-mix(in srgb, var(--accent) 26%, var(--border))",
          }}
        >
          <div className="p-5 sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--surface2)", color: "var(--accent)" }}>
              <EnvelopeSimple size={22} aria-hidden="true" />
            </div>
            <p className="mt-4 text-[15px] leading-6" style={{ color: "var(--text2)" }}>
              Meld vermoedelijke kwetsbaarheden privé via:
            </p>
            <a
              href="mailto:security@jordy.dev"
              className="focus-ring mt-3 inline-flex min-h-11 items-center rounded-xl px-3 text-base font-semibold"
              style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
            >
              security@jordy.dev
            </a>

            <p className="mt-5 text-sm font-semibold">Vermeld bij voorkeur:</p>
            <ul className="mt-3 space-y-2.5">
              {reportDetails.map((detail) => <CheckRow key={detail}>{detail}</CheckRow>)}
            </ul>
          </div>
          <div className="border-t px-5 py-4 sm:px-6" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
            <p className="text-[15px] leading-6" style={{ color: "var(--text2)" }}>
              Probeer geen gegevens van andere mensen te bekijken, veranderen of exporteren. Publiceer gevoelige technische details niet voordat er een redelijke kans is geweest om het probleem te onderzoeken.
            </p>
          </div>
        </div>
      </section>

      <section
        className="mt-4 rounded-2xl p-5 sm:p-6"
        style={{
          background: "color-mix(in srgb, var(--maybe) 7%, var(--surface))",
          border: "1px solid color-mix(in srgb, var(--maybe) 26%, var(--border))",
        }}
        aria-labelledby="guarantee-title"
      >
        <div className="flex items-start gap-3">
          <WarningCircle size={20} className="mt-0.5 flex-none" aria-hidden="true" style={{ color: "var(--maybe)" }} />
          <div>
            <h2 id="guarantee-title" className="text-base font-semibold">Securitymodel, geen certificaat</h2>
            <p className="mt-1.5 text-[15px] leading-6" style={{ color: "var(--text2)" }}>
              Deze pagina beschrijft de huidige ontwerp- en implementatiegrenzen. Ze is geen belofte van absolute veiligheid en geen vervanging voor zorgvuldig toestel-, browser-, back-up- en deelbeheer.
            </p>
          </div>
        </div>
      </section>

      <Link
        href="/about"
        className="focus-ring mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold"
        style={{ color: "var(--accent)" }}
      >
        <ArrowLeft size={16} weight="bold" aria-hidden="true" />
        Terug naar hoe KinkSync werkt
      </Link>
    </PageShell>
  );
}

function SectionHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return <EditorialHeading level={2} size="section" eyebrow={eyebrow} title={title} id={id} />;
}

function TechnicalCard({
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
      className="mt-4 rounded-[28px] p-5 sm:p-6"
      style={{
        background: accent
          ? "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, var(--surface)), var(--surface))"
          : "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--surface2)", color: "var(--accent)" }}>
        <Icon size={22} aria-hidden="true" />
      </div>
      <div className="mt-4 max-w-3xl text-[15px] leading-6" style={{ color: "var(--text2)" }}>
        {children}
      </div>
    </div>
  );
}

function CheckRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[15px] leading-6" style={{ color: "var(--text2)" }}>
      <Check size={17} weight="bold" className="mt-1 flex-none" aria-hidden="true" style={{ color: "var(--yes)" }} />
      <span>{children}</span>
    </li>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text2)" }}>{label}</p>
      <p className="mt-1 font-mono text-sm" style={{ color: "var(--text)" }}>{value}</p>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded px-1.5 py-0.5 font-mono text-[0.92em]" style={{ background: "var(--surface2)", color: "var(--text)" }}>
      {children}
    </code>
  );
}

function Callout({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl px-4 py-3 text-[15px] leading-6 ${className}`}
      style={{
        background: "color-mix(in srgb, var(--maybe) 7%, var(--surface2))",
        border: "1px solid color-mix(in srgb, var(--maybe) 20%, var(--border))",
        color: "var(--text2)",
      }}
    >
      {children}
    </div>
  );
}
