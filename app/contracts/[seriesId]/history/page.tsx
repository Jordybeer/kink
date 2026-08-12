"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CaretRight, CheckCircle, FileText } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import { useStore } from "@/lib/store";
import { useContractStore } from "@/lib/contractStore";
import { decodeLocalRouteId } from "@/lib/localRoutes";
import { useLegacyContractMigration } from "@/hooks/useLegacyContractMigration";
import {
  contractBucket,
  contractStatusLabel,
  formatContractTimestamp,
  type ContractLifecycleEvent,
} from "@/lib/contractLifecycle";

function eventTitle(event: ContractLifecycleEvent): string {
  if (event.type === "draft_created") return `Concept aangemaakt door ${event.actorName}`;
  if (event.type === "signature_added") return `Contract ondertekend door ${event.actorName}`;
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
  if (event.eventHash.startsWith("legacy:")) return "Bestaand contract zonder dubbele digitale bevestiging";
  return null;
}

export default function ContractHistoryPage() {
  const params = useParams<{ seriesId: string }>();
  const seriesId = decodeLocalRouteId(params.seriesId);
  const profiles = useStore((state) => state.profiles);
  const series = useContractStore((state) => state.series.find((item) => item.id === seriesId));
  const [tab, setTab] = useState<"events" | "versions">("events");

  const contractsReady = useLegacyContractMigration();
  if (!contractsReady) return <PageShell loading width="2xl" />;
  if (!series) {
    return <PageShell width="2xl"><p className="py-16 text-center text-sm" style={{ color: "var(--text2)" }}>Contract niet gevonden.</p></PageShell>;
  }

  const [a, b] = series.participants;
  const bucket = contractBucket(series, profiles);
  const statusColour = bucket === "active" ? "var(--yes)" : bucket === "paused" ? "var(--maybe)" : "var(--text2)";
  const events = [...series.events].sort((left, right) => right.createdAt - left.createdAt);
  const signedVersions = [...series.versions]
    .filter((version) => version.state === "signed" || Boolean(version.legacySnapshotId))
    .sort((left, right) => right.number - left.number);

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
            <h1 className="truncate text-2xl italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>
              {a.profileName} × {b.profileName}
            </h1>
            <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{a.role} × {b.role}</p>
          </div>
          <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ color: statusColour, background: "var(--surface2)", border: "1px solid var(--border)" }}>
            {contractStatusLabel(series, profiles)}
          </span>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2" role="tablist" aria-label="Contractverloop">
        {[
          ["events", "Gebeurtenissen"],
          ["versions", "Getekende versies"],
        ].map(([id, label]) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id as typeof tab)}
              className="focus-ring relative min-h-11 px-2 text-sm font-medium"
              style={{ color: active ? "var(--accent)" : "var(--text2)" }}
            >
              {label}
              {active && <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full" style={{ background: "var(--accent)" }} />}
            </button>
          );
        })}
      </div>

      {tab === "events" ? (
        <section className="mt-5" aria-label="Contractgebeurtenissen">
          {events.length === 0 ? (
            <p className="py-12 text-center text-sm" style={{ color: "var(--text2)" }}>Nog geen gebeurtenissen.</p>
          ) : (
            <div className="relative pl-6">
              <div className="absolute bottom-2 left-[7px] top-2 w-px" style={{ background: "var(--border)" }} />
              {events.map((event) => {
                const status = eventStatus(event, events);
                return (
                  <article key={event.id} className="relative pb-7">
                    <span className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full" style={{ background: "var(--surface)", border: "2px solid var(--accent)" }} />
                    <time className="text-xs" style={{ color: "var(--text2)" }}>
                      {formatContractTimestamp(event.createdAt)}
                    </time>
                    <p className="mt-2 text-sm font-medium leading-relaxed">{eventTitle(event)}</p>
                    {status && <p className="text-sm leading-relaxed" style={{ color: "var(--text2)" }}>{status}</p>}
                    {event.note && (
                      <p className="mt-4 text-sm italic leading-relaxed">“{event.note}”</p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="mt-5 flex flex-col gap-3" aria-label="Getekende contractversies">
          {signedVersions.length === 0 ? (
            <p className="py-12 text-center text-sm" style={{ color: "var(--text2)" }}>Nog geen dubbel getekende versies.</p>
          ) : signedVersions.map((version) => (
            <article key={version.id} className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full" style={{ background: "var(--surface2)", color: version.id === series.currentVersionId ? "var(--yes)" : "var(--text2)" }}>
                  {version.id === series.currentVersionId ? <CheckCircle size={17} weight="fill" aria-hidden="true" /> : <FileText size={17} aria-hidden="true" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold">Versie {version.number}</h2>
                  {version.id === series.currentVersionId && <p className="mt-0.5 text-xs" style={{ color: "var(--yes)" }}>Huidige versie</p>}
                  <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{formatContractTimestamp(version.updatedAt)}</p>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                    {version.signatures.length >= 2
                      ? `Door ${a.profileName} en ${b.profileName} ondertekend`
                      : "Bestaande contractversie zonder dubbele digitale bevestiging"}
                  </p>
                  {version.note && <p className="mt-3 text-sm italic">“{version.note}”</p>}
                </div>
              </div>
              <Link
                href={`/contracts/${encodeURIComponent(series.id)}/versions/${encodeURIComponent(version.id)}`}
                prefetch={false}
                className="focus-ring mt-3 flex min-h-10 items-center text-xs font-semibold"
                style={{ color: "var(--text)" }}
              >
                Versie bekijken
                <CaretRight size={13} aria-hidden="true" className="ml-auto" />
              </Link>
            </article>
          ))}
        </section>
      )}
    </PageShell>
  );
}
