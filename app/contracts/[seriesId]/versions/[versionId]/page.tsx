"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle, Info, ShieldCheck } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import { useContractStore } from "@/lib/contractStore";
import { formatContractTimestamp } from "@/lib/contractLifecycle";

function DetailSection({ title, items }: { title: string; items: { name: string; commentA?: string; commentB?: string }[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-5">
      <h2 className="text-sm italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--accent)" }}>{title}</h2>
      <div className="mt-2 flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={`${item.name}:${index}`} className="rounded-xl px-3 py-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <p className="text-sm font-medium">{item.name}</p>
            {(item.commentA || item.commentB) && (
              <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                {item.commentA && <p>{item.commentA}</p>}
                {item.commentB && <p>{item.commentB}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ContractVersionPage() {
  const params = useParams<{ seriesId: string; versionId: string }>();
  const series = useContractStore((state) => state.series.find((item) => item.id === params.seriesId));
  const [hydrated, setHydrated] = useState(false);
  const [technicalOpen, setTechnicalOpen] = useState(false);

  useEffect(() => setHydrated(true), []);
  if (!hydrated) return <PageShell loading width="2xl" />;
  const version = series?.versions.find((item) => item.id === params.versionId);
  if (!series || !version) {
    return <PageShell width="2xl"><p className="py-16 text-center text-sm" style={{ color: "var(--text2)" }}>Contractversie niet gevonden.</p></PageShell>;
  }

  const [a, b] = series.participants;
  const historical = version.id !== series.currentVersionId;
  const content = version.content;

  return (
    <PageShell width="2xl" className="lg:max-w-3xl">
      <Link
        href={`/contracts/${encodeURIComponent(series.id)}/history`}
        className="focus-ring inline-flex min-h-10 items-center gap-1 text-sm"
        style={{ color: "var(--text2)" }}
      >
        <ArrowLeft size={15} aria-hidden="true" /> Getekende versies
      </Link>

      <header className="mt-2">
        <h1 className="text-2xl italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>
          Contractversie {version.number}
        </h1>
        <p className="mt-1 text-sm">{a.profileName} × {b.profileName}</p>
        <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{a.role} × {b.role}</p>
        <p className="mt-2 text-xs" style={{ color: "var(--text2)" }}>
          {formatContractTimestamp(version.updatedAt)}
        </p>
      </header>

      {historical && (
        <div className="mt-5 flex gap-3 rounded-xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <Info size={18} aria-hidden="true" className="mt-0.5 flex-none" style={{ color: "var(--maybe)" }} />
          <p className="text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
            Dit is een historische contractversie. Afspraken kunnen later gewijzigd, gepauzeerd, hervat of stopgezet zijn.
          </p>
        </div>
      )}

      {!content ? (
        <section className="mt-5 rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold">Bestaand contract</h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
            Deze oudere opslag bevat alleen de samenvatting. De volledige toenmalige contracttekst werd in de oude versie van KinkSync niet bewaard.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ["matches", version.summary.matchCount],
              ["zachte grenzen", version.summary.softLimitCount],
              ["te bespreken", version.summary.discussCount],
              ["harde grenzen", version.summary.hardLimitCount],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl px-3 py-3" style={{ background: "var(--surface2)" }}>
                <p className="text-lg font-semibold">{Number(value)}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{String(label)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="mt-5 rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--accent)" }}>Overeenkomst</h2>
            <p className="mt-3 text-sm italic leading-relaxed" style={{ color: "var(--text2)" }}>{content.preamble}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl p-3" style={{ background: "var(--surface2)" }}>
                <p className="text-xs" style={{ color: "var(--text2)" }}>{content.profileA.profileName}</p>
                <p className="mt-1 text-sm font-medium">{content.profileA.role}</p>
                {content.realNameA && <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{content.realNameA}</p>}
              </div>
              <div className="rounded-xl p-3" style={{ background: "var(--surface2)" }}>
                <p className="text-xs" style={{ color: "var(--text2)" }}>{content.profileB.profileName}</p>
                <p className="mt-1 text-sm font-medium">{content.profileB.role}</p>
                {content.realNameB && <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{content.realNameB}</p>}
              </div>
            </div>
          </section>

          <DetailSection title="Gedeelde verlangens" items={content.shared} />
          <DetailSection title="Zachte grenzen" items={content.softLimits} />
          <DetailSection title="Bespreking nodig" items={content.discuss} />
          <section className="mt-5">
            <h2 className="text-sm italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--hard-no)" }}>Harde grenzen</h2>
            <div className="mt-2 flex flex-col gap-2">
              {content.hardLimits.map((item) => (
                <div key={`${item.name}:${item.who}`} className="rounded-xl px-3 py-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>Harde grens van {item.who}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5 rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--accent)" }}>Safewords en aftercare</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[content.profileA.profileName, content.profileB.profileName].map((name, index) => {
                const signals = index === 0 ? content.signalsA : content.signalsB;
                const aftercare = index === 0 ? content.aftercareA : content.aftercareB;
                return (
                  <div key={name} className="rounded-xl p-3" style={{ background: "var(--surface2)" }}>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="mt-2 text-xs" style={{ color: "var(--text2)" }}>Stopwoord: {signals.black || "Niet ingevuld"}</p>
                    {aftercare.length > 0 && <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>{aftercare.join(" · ")}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <section className="mt-5 rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} aria-hidden="true" style={{ color: version.signatures.length >= 2 ? "var(--yes)" : "var(--text2)" }} />
          <h2 className="text-sm font-semibold">Ondertekening</h2>
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
                    {proof ? `Ondertekend op ${formatContractTimestamp(proof.signedAt)}` : "Geen digitale handtekening in deze historische opslag"}
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
          <div className="mt-2 space-y-2 rounded-xl p-3 font-mono text-[11px] break-all" style={{ background: "var(--surface2)", color: "var(--text2)" }}>
            <p>Contracthash: {version.contentHash}</p>
            {version.signatures.map((proof) => <p key={proof.profileId}>{proof.profileId}: {proof.keyId}</p>)}
          </div>
        )}
      </section>
    </PageShell>
  );
}
