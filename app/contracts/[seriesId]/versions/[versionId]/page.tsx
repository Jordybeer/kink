"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle, Info, ShieldCheck } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import ContractPdfViewer from "@/components/contract/ContractPdfViewer";
import { useContractStore } from "@/lib/contractStore";
import { decodeLocalRouteId } from "@/lib/localRoutes";
import { useLegacyContractMigration } from "@/hooks/useLegacyContractMigration";
import { formatContractTimestamp } from "@/lib/contractLifecycle";

export default function ContractVersionPage() {
  const params = useParams<{ seriesId: string; versionId: string }>();
  const seriesId = decodeLocalRouteId(params.seriesId);
  const versionId = decodeLocalRouteId(params.versionId);
  const series = useContractStore((state) => state.series.find((item) => item.id === seriesId));
  const [technicalOpen, setTechnicalOpen] = useState(false);

  const contractsReady = useLegacyContractMigration();
  if (!contractsReady) return <PageShell loading width="2xl" />;
  const version = series?.versions.find((item) => item.id === versionId);
  if (!series || !version) {
    return (
      <PageShell width="2xl">
        <p className="py-16 text-center text-sm" style={{ color: "var(--text2)" }}>Contractversie niet gevonden.</p>
      </PageShell>
    );
  }

  const [a, b] = series.participants;
  const historical = version.id !== series.currentVersionId;

  return (
    <PageShell width="2xl" className="lg:max-w-3xl">
      <Link
        href={`/contracts/${encodeURIComponent(series.id)}/history`}
        prefetch={false}
        className="focus-ring inline-flex min-h-10 items-center gap-1 text-sm"
        style={{ color: "var(--text2)" }}
      >
        <ArrowLeft size={15} aria-hidden="true" /> Contractgeschiedenis
      </Link>

      <header className="mt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>Getekend document</p>
        <h1 className="mt-3 text-2xl italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>
          Contractversie {version.number}
        </h1>
        <p className="mt-1 text-sm">{a.profileName} × {b.profileName}</p>
        <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{a.role} × {b.role}</p>
        <p className="mt-2 text-xs" style={{ color: "var(--text2)" }}>{formatContractTimestamp(version.updatedAt)}</p>
      </header>

      {historical && (
        <div className="mt-5 flex gap-3 rounded-xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <Info size={18} aria-hidden="true" className="mt-0.5 flex-none" style={{ color: "var(--maybe)" }} />
          <p className="text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
            Dit is de toenmalige contractversie. Latere afspraken of statuswijzigingen veranderen dit document niet.
          </p>
        </div>
      )}

      <ContractPdfViewer series={series} version={version} />

      <section className="mt-5 rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} aria-hidden="true" style={{ color: version.signatures.length >= 2 ? "var(--yes)" : "var(--text2)" }} />
          <h2 className="text-sm font-semibold">Digitale bevestiging</h2>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {[a, b].map((participant) => {
            const proof = version.signatures.find((item) => item.profileId === participant.profileId);
            return (
              <div key={participant.profileId} className="flex items-start gap-2">
                <CheckCircle size={16} weight={proof ? "fill" : "regular"} aria-hidden="true" className="mt-0.5" style={{ color: proof ? "var(--yes)" : "var(--text2)" }} />
                <div>
                  <p className="text-sm font-medium">{participant.profileName} · {participant.role}</p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text2)" }}>
                    {proof ? `Cryptografisch bevestigd op ${formatContractTimestamp(proof.signedAt)}` : "Geen digitale bevestiging in deze historische opslag"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setTechnicalOpen((current) => !current)}
          className="focus-ring mt-4 min-h-10 text-xs font-medium"
          style={{ color: "var(--text2)" }}
        >
          {technicalOpen ? "Technische verificatie verbergen" : "Technische verificatie bekijken"}
        </button>
        {technicalOpen && (
          <div className="mt-2 space-y-2 break-all rounded-xl p-3 font-mono text-[11px]" style={{ background: "var(--surface2)", color: "var(--text2)" }}>
            <p>Contracthash: {version.contentHash}</p>
            {version.signatures.map((proof) => <p key={proof.profileId}>{proof.profileId}: {proof.keyId}</p>)}
          </div>
        )}
      </section>
    </PageShell>
  );
}
