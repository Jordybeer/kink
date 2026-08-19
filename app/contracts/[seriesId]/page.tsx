"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CaretRight, FileText, GearSix, TrendUp } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import ContractManageSheet from "@/components/contract/ContractManageSheet";
import { useStore } from "@/lib/store";
import { useContractStore } from "@/lib/contractStore";
import { decodeLocalRouteId } from "@/lib/localRoutes";
import { useLegacyContractMigration } from "@/hooks/useLegacyContractMigration";
import {
  contractBucket,
  contractStatusLabel,
  currentContractVersion,
  formatContractTimestamp,
} from "@/lib/contractLifecycle";

export default function ContractDetailPage() {
  const params = useParams<{ seriesId: string }>();
  const seriesId = decodeLocalRouteId(params.seriesId);
  const profiles = useStore((state) => state.profiles);
  const series = useContractStore((state) => state.series.find((item) => item.id === seriesId));
  const [manageOpen, setManageOpen] = useState(false);

  const contractsReady = useLegacyContractMigration();

  if (!contractsReady) return <PageShell loading width="2xl" />;
  if (!series) {
    return (
      <PageShell width="2xl">
        <p className="py-16 text-center text-sm" style={{ color: "var(--text2)" }}>Contract niet gevonden.</p>
      </PageShell>
    );
  }

  const version = currentContractVersion(series);
  const [a, b] = series.participants;
  const bucket = contractBucket(series, profiles);
  const statusColour = bucket === "active" ? "var(--yes)" : bucket === "paused" ? "var(--maybe)" : "var(--text2)";
  const profilesAvailable = series.participants.every((participant) => profiles.some((profile) => profile.id === participant.profileId));

  return (
    <PageShell width="2xl" className="lg:max-w-3xl">
      <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full" style={{ background: "var(--surface2)", color: statusColour }}>
            <FileText size={20} aria-hidden="true" />
          </div>
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

        {version && (
          <>
            <p className="mt-5 text-xs" style={{ color: "var(--text2)" }}>
              Versie {version.number} · {formatContractTimestamp(version.updatedAt)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["matches", version.summary.matchCount, "var(--yes)"],
                ["zachte grenzen", version.summary.softLimitCount, "var(--maybe)"],
                ["te bespreken", version.summary.discussCount, "var(--willing)"],
                ["harde grenzen", version.summary.hardLimitCount, "var(--hard-no)"],
              ].map(([label, value, colour]) => (
                <div key={String(label)} className="rounded-xl px-3 py-3" style={{ background: "var(--surface2)" }}>
                  <p className="text-xl font-semibold leading-none" style={{ color: String(colour) }}>{Number(value)}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{String(label)}</p>
                </div>
              ))}
            </div>
            {version.summary.safeword && (
              <div className="mt-3 flex min-h-11 items-center rounded-xl px-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <span className="text-xs" style={{ color: "var(--text2)" }}>Safeword</span>
                <span className="ml-auto text-sm font-semibold">{version.summary.safeword}</span>
              </div>
            )}
          </>
        )}

        {series.pendingRequest && (
          <div className="mt-4 rounded-xl px-3 py-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <p className="text-sm font-medium">Bevestiging staat nog open</p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
              Open Beheren om de QR opnieuw te tonen of het antwoord van de tweede partij te scannen.
            </p>
          </div>
        )}

        {!profilesAvailable && (
          <div className="mt-4 rounded-xl px-3 py-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <p className="text-sm font-medium">Profiel niet meer beschikbaar</p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
              De historiek blijft leesbaar, maar dit contract kan niet worden heractiveerd.
            </p>
          </div>
        )}
      </section>

      <div
        className={`mt-4 overflow-hidden rounded-2xl sm:grid ${version ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {version && (
          <Link
            href={`/contracts/${encodeURIComponent(series.id)}/versions/${encodeURIComponent(version.id)}`}
            prefetch={false}
            className="focus-ring flex min-h-14 items-center gap-3 px-4 text-sm font-semibold"
            style={{ color: "var(--text)" }}
          >
            <FileText size={18} aria-hidden="true" style={{ color: "var(--accent)" }} />
            Huidig contract
            <CaretRight size={14} aria-hidden="true" className="ml-auto" style={{ color: "var(--text2)" }} />
          </Link>
        )}
        <Link
          href={`/contracts/${encodeURIComponent(series.id)}/history`}
          prefetch={false}
          className={`focus-ring flex min-h-14 items-center gap-3 px-4 text-sm font-semibold ${version ? "border-t sm:border-l sm:border-t-0" : ""}`}
          style={{ color: "var(--text)", borderColor: "var(--border)" }}
        >
          <TrendUp size={18} aria-hidden="true" style={{ color: "var(--accent)" }} />
          Verloop
          <CaretRight size={14} aria-hidden="true" className="ml-auto" style={{ color: "var(--text2)" }} />
        </Link>
        <button
          type="button"
          onClick={() => setManageOpen(true)}
          className="focus-ring flex min-h-14 w-full items-center gap-3 border-t px-4 text-left text-sm font-semibold sm:border-l sm:border-t-0"
          style={{ color: "var(--text)", borderColor: "var(--border)" }}
        >
          <GearSix size={18} aria-hidden="true" style={{ color: "var(--accent)" }} />
          Beheren
          <CaretRight size={14} aria-hidden="true" className="ml-auto" style={{ color: "var(--text2)" }} />
        </button>
      </div>

      <ContractManageSheet open={manageOpen} series={series} onClose={() => setManageOpen(false)} />
    </PageShell>
  );
}
