"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CaretRight, CheckCircle, FileText } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import { useStore } from "@/lib/store";
import { useContractStore } from "@/lib/contractStore";
import { decodeLocalRouteId } from "@/lib/localRoutes";
import { useLegacyContractMigration } from "@/hooks/useLegacyContractMigration";
import { hasRequiredHandwrittenSignatures } from "@/lib/contractHandwriting";
import {
  contractBucket,
  contractStatusLabel,
  formatContractTimestamp,
  type ContractLifecycleEvent,
  type ContractVersion,
} from "@/lib/contractLifecycle";

function eventTitle(event: ContractLifecycleEvent): string {
  if (event.type === "draft_created") return `Concept aangemaakt door ${event.actorName}`;
  if (event.type === "signature_added") return `Digitale handtekening toegevoegd door ${event.actorName}`;
  if (event.type === "activated") return "Contract door beide partijen geactiveerd";
  if (event.type === "paused") return `Contract tijdelijk gepauzeerd door ${event.actorName}`;
  if (event.type === "pause_acknowledged") return `Ontvangst van de pauze bevestigd door ${event.actorName}`;
  if (event.type === "resume_requested") return `Hervatting aangevraagd door ${event.actorName}`;
  if (event.type === "resumed") return "Contract door beide partijen hervat";
  if (event.type === "stopped") return `Contract stopgezet door ${event.actorName}`;
  if (event.type === "stop_acknowledged") return `Ontvangst van de stopzetting bevestigd door ${event.actorName}`;
  if (event.type === "reactivation_requested") return `Heractivering aangevraagd door ${event.actorName}`;
  if (event.type === "reactivated") return "Contract door beide partijen geheractiveerd";
  return `Uitwisseling afgerond door ${event.actorName}`;
}

function eventStatus(event: ContractLifecycleEvent, events: ContractLifecycleEvent[]): string | null {
  if (event.type === "receipt_confirmed") return "Beide toestellen hebben de bevestiging opgeslagen";
  if (event.type === "paused") {
    const acknowledgement = events.find((candidate) => candidate.type === "pause_acknowledged" && candidate.requestId === event.requestId);
    return acknowledgement
      ? `Ontvangst bevestigd op ${formatContractTimestamp(acknowledgement.createdAt)}`
      : "Ontvangst door de tweede partij nog niet bevestigd";
  }
  if (event.type === "stopped") {
    const acknowledgement = events.find((candidate) => candidate.type === "stop_acknowledged" && candidate.requestId === event.requestId);
    return acknowledgement
      ? `Ontvangst bevestigd op ${formatContractTimestamp(acknowledgement.createdAt)}`
      : "Ontvangst door de tweede partij nog niet bevestigd";
  }
  if (event.proof) return "Identiteit cryptografisch gecontroleerd";
  if (event.eventHash.startsWith("legacy:")) return "Bestaand contract uit oudere KinkSync-opslag";
  return null;
}

type HistoryItem =
  | { kind: "event"; timestamp: number; event: ContractLifecycleEvent }
  | { kind: "version"; timestamp: number; version: ContractVersion };

export default function ContractHistoryPage() {
  const params = useParams<{ seriesId: string }>();
  const seriesId = decodeLocalRouteId(params.seriesId);
  const profiles = useStore((state) => state.profiles);
  const series = useContractStore((state) => state.series.find((item) => item.id === seriesId));

  const contractsReady = useLegacyContractMigration();
  if (!contractsReady) return <PageShell loading width="2xl" />;
  if (!series) {
    return (
      <PageShell width="2xl">
        <p className="py-16 text-center text-sm" style={{ color: "var(--text2)" }}>Contract niet gevonden.</p>
      </PageShell>
    );
  }

  const [a, b] = series.participants;
  const bucket = contractBucket(series, profiles);
  const statusColour = bucket === "active" ? "var(--yes)" : bucket === "paused" ? "var(--maybe)" : "var(--text2)";
  const events = [...series.events];
  const signedVersions = series.versions.filter((version) => version.state === "signed" || Boolean(version.legacySnapshotId));
  const history: HistoryItem[] = [
    ...events.map((event) => ({ kind: "event" as const, timestamp: event.createdAt, event })),
    ...signedVersions.map((version) => ({ kind: "version" as const, timestamp: version.updatedAt, version })),
  ].sort((left, right) => right.timestamp - left.timestamp || (left.kind === "version" ? -1 : 1));

  return (
    <PageShell width="2xl" className="lg:max-w-3xl">
      <Link
        href={`/contracts/${encodeURIComponent(series.id)}`}
        prefetch={false}
        className="focus-ring inline-flex min-h-10 items-center gap-1 text-sm"
        style={{ color: "var(--text2)" }}
      >
        <ArrowLeft size={15} aria-hidden="true" /> Contract
      </Link>

      <header className="mt-2">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>Contractgeschiedenis</p>
            <h1 className="mt-3 truncate text-2xl italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>
              {a.profileName} × {b.profileName}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>{a.role} × {b.role}</p>
          </div>
          <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ color: statusColour, background: "var(--surface2)", border: "1px solid var(--border)" }}>
            {contractStatusLabel(series, profiles)}
          </span>
        </div>
        <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--text2)" }}>
          Getekende documenten en latere contractacties staan hier in één chronologische geschiedenis. Een oude getekende versie verandert nooit mee met een nieuwer profiel of contract.
        </p>
      </header>

      <section className="mt-6" aria-label="Contractgeschiedenis">
        {history.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: "var(--text2)" }}>Nog geen contractgeschiedenis.</p>
        ) : (
          <div className="relative pl-6">
            <div className="absolute bottom-2 left-[7px] top-2 w-px" style={{ background: "var(--border)" }} />
            {history.map((item) => {
              if (item.kind === "event") {
                const status = eventStatus(item.event, events);
                return (
                  <article key={`event:${item.event.id}`} className="relative pb-7">
                    <span className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full" style={{ background: "var(--surface)", border: "2px solid var(--border-accent)" }} />
                    <time className="text-xs" style={{ color: "var(--text2)" }}>{formatContractTimestamp(item.event.createdAt)}</time>
                    <p className="mt-2 text-sm font-medium leading-relaxed">{eventTitle(item.event)}</p>
                    {status && <p className="mt-0.5 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>{status}</p>}
                    {item.event.note && <p className="mt-3 text-base italic leading-relaxed">“{item.event.note}”</p>}
                  </article>
                );
              }

              const version = item.version;
              const current = version.id === series.currentVersionId;
              const completeModernDocument = version.signatures.length === 2 && hasRequiredHandwrittenSignatures(version.content);
              return (
                <article key={`version:${version.id}`} className="relative pb-7">
                  <span
                    className="absolute -left-6 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full"
                    style={{ background: current ? "var(--yes)" : "var(--surface)", border: `2px solid ${current ? "var(--yes)" : "var(--accent)"}` }}
                  />
                  <time className="text-xs" style={{ color: "var(--text2)" }}>{formatContractTimestamp(version.updatedAt)}</time>
                  <div className="mt-2 rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full" style={{ background: "var(--surface2)", color: current ? "var(--yes)" : "var(--accent)" }}>
                        {current ? <CheckCircle size={17} weight="fill" aria-hidden="true" /> : <FileText size={17} aria-hidden="true" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-semibold">Getekende overeenkomst · versie {version.number}</h2>
                        {current && <p className="mt-0.5 text-sm" style={{ color: "var(--yes)" }}>Huidige contractversie</p>}
                        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                          {completeModernDocument
                            ? `Handgeschreven én cryptografisch bevestigd door ${a.profileName} en ${b.profileName}.`
                            : version.legacySnapshotId
                              ? "Historische contractopslag; de oorspronkelijke volledige PDF en handgeschreven signatures zijn niet beschikbaar."
                              : "Oudere getekende versie zonder de huidige documentartifact-semantiek."}
                        </p>
                        {version.note && <p className="mt-3 text-base italic">“{version.note}”</p>}
                      </div>
                    </div>
                    <Link
                      href={`/contracts/${encodeURIComponent(series.id)}/versions/${encodeURIComponent(version.id)}`}
                      prefetch={false}
                      className="focus-ring mt-3 flex min-h-10 items-center text-sm font-semibold"
                      style={{ color: "var(--text)" }}
                    >
                      {completeModernDocument ? "Getekende PDF bekijken" : "Historische versie bekijken"}
                      <CaretRight size={13} aria-hidden="true" className="ml-auto" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
