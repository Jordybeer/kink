"use client";

import { ShieldCheck, ShieldWarning } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import EmptyState from "@/components/EmptyState";
import QuarantinedProfileCard from "@/components/QuarantinedProfileCard";
import { useHasHydrated, useStore } from "@/lib/store";

export default function QuarantinePage() {
  const hydrated = useHasHydrated();
  const records = useStore((state) => state.quarantinedProfiles ?? []);

  if (!hydrated) return <PageShell loading width="2xl" />;

  return (
    <PageShell width="2xl">
      <div className="pt-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldWarning size={22} weight="duotone" style={{ color: "var(--hard-no)" }} aria-hidden="true" />
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Profielen opnieuw bevestigen</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text2)", lineHeight: 1.65 }}>
          KinkSync heeft deze opgeslagen profielkopieën apart gezet omdat hun inhoud niet meer overeenkomt met de eerder bevestigde versie. Ze worden nergens actief gebruikt. Dit zegt niets over de persoon achter het profiel. Laat de eigenaar het profiel opnieuw delen om de kopie veilig te vervangen.
        </p>
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Geen profielen om opnieuw te bevestigen"
          message="Alle gecontroleerde gedeelde profielkopieën komen nog overeen met hun bevestigde bron."
          ctaHref="/"
          ctaLabel="Terug naar start"
        />
      ) : (
        <div className="flex flex-col gap-4 pb-8">
          {records.map((record) => (
            <QuarantinedProfileCard
              key={`${record.profile.id}:${record.profile.consentProof?.proofHash ?? record.quarantinedAt}`}
              record={record}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
