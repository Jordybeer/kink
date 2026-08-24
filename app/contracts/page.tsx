"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  CaretDown,
  CaretRight,
  FileText,
  Pause,
  Plus,
  QrCode,
  X,
} from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import EmptyState from "@/components/EmptyState";
import ContractInboxSheet from "@/components/contract/ContractInboxSheet";
import { useTopNavActions, type TopNavAction } from "@/components/nav/TopNavContext";
import { useStore } from "@/lib/store";
import { useContractStore } from "@/lib/contractStore";
import { useLegacyContractMigration } from "@/hooks/useLegacyContractMigration";
import {
  contractBucket,
  contractStatusLabel,
  currentContractVersion,
  formatContractTimestamp,
  seriesMatchesPerson,
  type ContractDisplayBucket,
  type ContractSeries,
} from "@/lib/contractLifecycle";

const TABS: { id: Exclude<ContractDisplayBucket, "draft">; label: string }[] = [
  { id: "active", label: "Actief" },
  { id: "paused", label: "Gepauzeerd" },
  { id: "archive", label: "Archief" },
];

function statusColour(bucket: ContractDisplayBucket): string {
  if (bucket === "active") return "var(--yes)";
  if (bucket === "paused") return "var(--maybe)";
  if (bucket === "archive") return "var(--text2)";
  return "var(--accent)";
}

function ContractCard({ series, profiles }: { series: ContractSeries; profiles: ReturnType<typeof useStore.getState>["profiles"] }) {
  const version = currentContractVersion(series);
  const bucket = contractBucket(series, profiles);
  const [a, b] = series.participants;
  return (
    <article
      className="overflow-hidden rounded-2xl"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full"
            style={{ background: "var(--surface2)", color: statusColour(bucket) }}
          >
            {bucket === "paused" ? <Pause size={18} aria-hidden="true" />
              : bucket === "archive" ? <Archive size={18} aria-hidden="true" />
                : <FileText size={18} aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2
              className="truncate text-lg italic leading-tight"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
            >
              {a.profileName}
              <span aria-hidden="true" style={{ color: "var(--accent)", fontStyle: "normal" }}> × </span>
              {b.profileName}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
              {a.role} × {b.role}
            </p>
          </div>
          <span
            className="flex-none rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ color: statusColour(bucket), background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            {contractStatusLabel(series, profiles)}
          </span>
        </div>

        {version && (
          <>
            <p className="mt-4 text-xs" style={{ color: "var(--text2)" }}>
              {formatContractTimestamp(version.updatedAt)} · versie {version.number}
            </p>
            <p className="mt-2 text-sm leading-5 sm:hidden" style={{ color: "var(--text2)" }}>
              <span style={{ color: "var(--yes)" }}>{version.summary.matchCount} matches</span>
              <span aria-hidden="true"> · </span>
              <span style={{ color: "var(--maybe)" }}>{version.summary.softLimitCount} zacht</span>
              <span aria-hidden="true"> · </span>
              <span style={{ color: "var(--willing)" }}>{version.summary.discussCount} bespreken</span>
              <span aria-hidden="true"> · </span>
              <span style={{ color: "var(--hard-no)" }}>{version.summary.hardLimitCount} hard</span>
            </p>
            <div className="mt-3 hidden grid-cols-4 gap-2 sm:grid">
              {[
                ["matches", version.summary.matchCount, "var(--yes)"],
                ["zachte grenzen", version.summary.softLimitCount, "var(--maybe)"],
                ["te bespreken", version.summary.discussCount, "var(--willing)"],
                ["harde grenzen", version.summary.hardLimitCount, "var(--hard-no)"],
              ].map(([label, value, colour]) => (
                <div key={String(label)} className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                  <p className="text-lg font-semibold leading-none" style={{ color: String(colour) }}>{Number(value)}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{String(label)}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {series.pendingRequest && (
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
            Bevestiging van de tweede partij staat nog open.
          </p>
        )}
      </div>

      <div className="flex min-h-12 items-center gap-2 px-3" style={{ borderTop: "1px solid var(--border)" }}>
        <Link
          href={`/contracts/${encodeURIComponent(series.id)}`}
          prefetch={false}
          className="focus-ring inline-flex min-h-10 items-center gap-1.5 px-2 text-sm font-semibold"
          style={{ color: "var(--text)" }}
        >
          Open contract
          <CaretRight size={13} aria-hidden="true" />
        </Link>
        <Link
          href={`/contracts/${encodeURIComponent(series.id)}/history`}
          prefetch={false}
          className="focus-ring ml-auto inline-flex min-h-10 items-center px-2 text-sm font-medium"
          style={{ color: "var(--text2)" }}
        >
          Verloop
        </Link>
      </div>
    </article>
  );
}

function ContractsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profiles = useStore((state) => state.profiles);
  const series = useContractStore((state) => state.series);
  const [tab, setTab] = useState<Exclude<ContractDisplayBucket, "draft">>("active");
  const [conceptsOpen, setConceptsOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const contractsReady = useLegacyContractMigration();
  const navActions = useMemo<TopNavAction[]>(() => [
    {
      id: "scan-contract-request",
      label: "Contract van partner scannen",
      shortLabel: "Scan QR",
      icon: <QrCode size={18} aria-hidden="true" />,
      onClick: () => setInboxOpen(true),
      placement: "primary",
    },
    {
      id: "new-contract",
      label: "Nieuw contract",
      icon: <Plus size={18} aria-hidden="true" />,
      onClick: () => router.push("/compare"),
      placement: "secondary",
    },
  ], [router]);
  useTopNavActions(navActions);

  if (!contractsReady) return <PageShell loading width="2xl" />;

  const personId = searchParams.get("person");
  const filteredSeries = series.filter((item) => seriesMatchesPerson(item, personId));
  const concepts = filteredSeries.filter((item) => contractBucket(item, profiles) === "draft" || Boolean(item.draftVersionId));
  const visible = filteredSeries
    .filter((item) => contractBucket(item, profiles) === tab)
    .sort((left, right) => right.updatedAt - left.updatedAt);
  const counts = Object.fromEntries(TABS.map(({ id }) => [id, filteredSeries.filter((item) => contractBucket(item, profiles) === id).length])) as Record<Exclude<ContractDisplayBucket, "draft">, number>;
  const personProfile = personId
    ? profiles.find((profile) => (profile.personGroupId ?? profile.id) === personId)
    : undefined;

  return (
    <PageShell width="2xl" className="lg:max-w-4xl">
      <h1 className="sr-only">
        {personProfile ? `Contracten met ${personProfile.name}` : "Contracten"}
      </h1>

      {personId && (
        <Link
          href="/contracts"
          className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm"
          style={{ color: "var(--text2)", background: "var(--surface2)" }}
        >
          <X size={12} aria-hidden="true" />
          Persoonsfilter wissen
        </Link>
      )}

      {concepts.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <button
            type="button"
            onClick={() => setConceptsOpen((current) => !current)}
            className="focus-ring flex min-h-12 w-full items-center gap-3 px-4 text-left"
          >
            <FileText size={17} aria-hidden="true" style={{ color: "var(--accent)" }} />
            <span className="text-sm font-medium">{concepts.length} {concepts.length === 1 ? "open concept" : "open concepten"}</span>
            <span className="ml-auto hidden text-sm sm:inline" style={{ color: "var(--text2)" }}>Verder bespreken</span>
            <CaretDown size={14} aria-hidden="true" className={conceptsOpen ? "rotate-180" : ""} />
          </button>
          {conceptsOpen && (
            <div style={{ borderTop: "1px solid var(--border)" }}>
              {concepts.map((item) => {
                const [a, b] = item.participants;
                return (
                  <Link
                    key={item.id}
                    href={`/contract?a=${encodeURIComponent(a.profileId)}&b=${encodeURIComponent(b.profileId)}`}
                    prefetch={false}
                    className="focus-ring flex min-h-12 items-center gap-2 px-4 text-sm"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <span className="min-w-0 flex-1 truncate">{a.profileName} × {b.profileName}</span>
                    <span className="text-xs" style={{ color: "var(--text2)" }}>
                      {item.status === "pending_signature" ? "Wacht op bevestiging" : "Concept"}
                    </span>
                    <CaretRight size={13} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 grid grid-cols-3" role="tablist" aria-label="Contractstatus">
        {TABS.map(({ id, label }) => {
          const active = tab === id;
          const colour = id === "active" ? "var(--yes)" : id === "paused" ? "var(--maybe)" : "var(--text2)";
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className="focus-ring relative min-h-11 px-2 text-sm font-medium"
              style={{ color: active ? colour : "var(--text2)" }}
            >
              {label}{counts[id] > 0 ? ` ${counts[id]}` : ""}
              {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full" style={{ background: colour }} />}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {visible.length === 0 ? (
          <EmptyState
            icon={tab === "paused" ? Pause : tab === "archive" ? Archive : FileText}
            title={tab === "active" ? "Geen actieve contracten" : tab === "paused" ? "Geen gepauzeerde contracten" : "Het archief is leeg"}
            message={tab === "active"
              ? "Dubbel bevestigde contracten verschijnen hier zodra beide partijen dezelfde versie op hun eigen toestel ondertekenen."
              : tab === "paused"
                ? "Tijdelijk gepauzeerde contracten blijven hier totdat beide partijen ze hervatten of iemand ze stopzet."
                : "Stopgezette contracten en contracten met verwijderde profielen verschijnen hier."}
            {...(tab === "active" ? { ctaHref: "/compare", ctaLabel: "Nieuw contract" } : {})}
          />
        ) : (
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start">
            {visible.map((item) => <ContractCard key={item.id} series={item} profiles={profiles} />)}
          </div>
        )}
      </div>

      <ContractInboxSheet open={inboxOpen} onClose={() => setInboxOpen(false)} />
    </PageShell>
  );
}

export default function ContractsPage() {
  return (
    <Suspense fallback={<PageShell loading width="2xl" />}>
      <ContractsContent />
    </Suspense>
  );
}
