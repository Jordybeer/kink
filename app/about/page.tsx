"use client";

import Link from "next/link";
import {
  CaretRight,
  Database,
  DeviceMobile,
  Fingerprint,
  LockKey,
  QrCode,
  ShieldCheck,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";

const principles = [
  {
    icon: DeviceMobile,
    title: "Lokaal als uitgangspunt",
    text: "Profielen, antwoorden, notities, scènes, contracten en historiek worden op dit toestel bewaard. Er is geen centraal KinkSync-account of profielendatabank.",
  },
  {
    icon: QrCode,
    title: "Delen is een bewuste handeling",
    text: "Een ander toestel ontvangt pas gegevens wanneer iemand doelbewust een QR-code scant of een bestand importeert. Niets wordt stil op de achtergrond gesynchroniseerd.",
  },
  {
    icon: ShieldCheck,
    title: "Controleren voor vertrouwen",
    text: "Waar identiteit en consentgeschiedenis ertoe doen, controleert KinkSync ondertekeningen, sleutel-ID’s en de exacte inhoud waarop een bevestiging betrekking heeft.",
  },
] as const;

const matrix = [
  ["Profiel invullen en bewerken", "Ja", "Nee"],
  ["Profielen vergelijken", "Ja", "Nee"],
  ["Scènes en contracten beheren", "Ja", "Nee"],
  ["Profiel of contract via QR overdragen", "Ja", "Nee"],
  ["Versleutelde back-up maken of herstellen", "Ja", "Nee"],
] as const;

export default function AboutPage() {
  return (
    <PageShell width="2xl" className="lg:max-w-3xl">
      <header className="pt-2">
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>
          Privacy door ontwerp
        </p>
        <h1
          className="mt-2 text-4xl italic leading-tight"
          style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
        >
          Hoe KinkSync werkt
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7" style={{ color: "var(--text2)" }}>
          Gevoelige informatie verdient meer dan een losse privacybelofte. Daarom is KinkSync gebouwd rond lokale opslag, doelbewuste overdracht en controleerbare bevestigingen.
        </p>
      </header>

      <section className="mt-7 grid gap-3 lg:grid-cols-3" aria-label="Kernprincipes">
        {principles.map(({ icon: Icon, title, text }) => (
          <article
            key={title}
            className="rounded-2xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "var(--surface2)", color: "var(--accent)" }}
            >
              <Icon size={20} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-sm font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--text2)" }}>{text}</p>
          </article>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Wat blijft op jouw toestel?</h2>
        <div className="mt-3 overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)" }}>
          <div
            className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide"
            style={{ background: "var(--surface2)", color: "var(--text2)" }}
          >
            <span>Functie</span><span>Lokaal</span><span>Internet nodig</span>
          </div>
          {matrix.map(([feature, local, internet], index) => (
            <div
              key={feature}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 text-xs"
              style={{
                background: "var(--surface)",
                borderTop: index === 0 ? undefined : "1px solid var(--border)",
              }}
            >
              <span className="pr-2 leading-5">{feature}</span>
              <span style={{ color: "var(--yes)" }}>{local}</span>
              <span style={{ color: "var(--text2)" }}>{internet}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5" style={{ color: "var(--text2)" }}>
          De webapp moet wel eerst worden geladen en updates komen via de hosting van KinkSync. Na installatie en cachevoorbereiding kan de kern zonder netwerkverbinding worden gebruikt.
        </p>
      </section>

      <section className="mt-8 grid gap-3">
        <InfoBlock icon={QrCode} title="Profielen delen">
          Je kiest zelf wat wordt gedeeld. Een profieloverdracht kan uit meerdere opeenvolgende QR-codes bestaan. Het ontvangende toestel controleert de structuur, de ondertekening en eventuele profielfoto voordat het profiel lokaal wordt opgeslagen.
        </InfoBlock>
        <InfoBlock icon={Fingerprint} title="Profieleigendom">
          Een eigen profiel kan een lokale private sleutel krijgen. Gedeelde profielen bevatten alleen publieke verificatiegegevens en blijven vergrendeld, zodat het ontvangende toestel zich niet stil als eigenaar kan voordoen.
        </InfoBlock>
        <InfoBlock icon={LockKey} title="Contracten en getekende versies">
          Iedere getekende versie bewaart de exacte contractinhoud, de betrokken rolprofielen, tijdstippen en ondertekeningsbewijzen. Oudere getekende versies blijven leesbaar zonder dat zij de huidige afspraken voorstellen.
        </InfoBlock>
        <InfoBlock icon={ShieldCheck} title="Consent kan altijd verminderen">
          Eén partij kan een contract onmiddellijk pauzeren of stopzetten. Hervatten, heractiveren en inhoudelijke wijzigingen vereisen bevestiging van beide profielhouders. Een digitaal contract vervangt nooit voortdurende communicatie.
        </InfoBlock>
        <InfoBlock icon={Database} title="Back-up en herstel">
          De versleutelde back-up bevat profielen, contractreeksen, historiek en private eigendomssleutels. Het wachtwoord wordt niet door KinkSync bewaard en kan niet worden hersteld.
        </InfoBlock>
        <InfoBlock icon={Trash} title="Verwijderen">
          Je kunt lokale gegevens verwijderen. Stopzetten bewaart een contract in het archief; permanent verwijderen wist de lokale reeks en haar historiek. Een verwijderd bestand of toestel kan KinkSync niet op afstand herstellen.
        </InfoBlock>
      </section>

      <section
        className="mt-8 rounded-2xl p-4"
        style={{
          background: "color-mix(in srgb, var(--maybe) 8%, var(--surface))",
          border: "1px solid color-mix(in srgb, var(--maybe) 35%, var(--border))",
        }}
      >
        <div className="flex items-start gap-3">
          <WarningCircle
            size={21}
            className="mt-0.5 flex-none"
            aria-hidden="true"
            style={{ color: "var(--maybe)" }}
          />
          <div>
            <h2 className="text-sm font-semibold">Wat cryptografie niet kan bewijzen</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--text2)" }}>
              Een geldige handtekening toont dat de houder van een bepaalde privésleutel een exacte inhoud bevestigde. Ze bewijst geen wettelijke identiteit, begrip, wilsbekwaamheid, afwezigheid van druk of blijvende toestemming. Consent kan op ieder moment worden ingetrokken, ook buiten de app.
            </p>
          </div>
        </div>
      </section>

      <details
        className="mt-4 rounded-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <summary className="focus-ring flex min-h-12 cursor-pointer items-center px-4 text-sm font-semibold">
          Technische verdieping
        </summary>
        <div className="px-4 pb-4 text-sm leading-6" style={{ color: "var(--text2)" }}>
          <p>
            KinkSync gebruikt profielgebonden ECDSA P-256-handtekeningen, SHA-256-hashes en canonieke payloads. QR-uitwisselingen binden de actie aan het contract, de exacte versie, beide profiel-ID’s, sleutel-ID’s, een tijdstip en een eenmalige request-ID. Private sleutels worden niet in een gedeelde QR-code opgenomen.
          </p>
          <p className="mt-3">
            De beveiliging blijft afhankelijk van het toestel, de browseropslag, een sterk back-upwachtwoord en zorgvuldig fysiek gebruik van QR-codes. Geen enkele software maakt een onveilig toestel of een gedwongen handeling automatisch veilig.
          </p>
        </div>
      </details>

      <Link
        href="/"
        className="focus-ring mt-7 flex min-h-12 items-center rounded-xl px-4 text-sm font-semibold"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        Terug naar KinkSync
        <CaretRight size={15} aria-hidden="true" className="ml-auto" />
      </Link>
    </PageShell>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article
      className="rounded-2xl p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl"
          style={{ background: "var(--surface2)", color: "var(--accent)" }}
        >
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1.5 text-sm leading-6" style={{ color: "var(--text2)" }}>
            {children}
          </p>
        </div>
      </div>
    </article>
  );
}
