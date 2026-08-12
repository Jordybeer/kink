"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { CompatibilityTimeline } from "@/components/CompatibilityTimeline";
import { ContractTrendsChart } from "@/components/ContractTrendsChart";
import PageShell from "@/components/PageShell";
import ProfileSelect from "@/components/ProfileSelect";

const COLOUR_A = "var(--accent)";
const COLOUR_B = "var(--accent2)";

function TimelinePage() {
  const searchParams = useSearchParams();
  const { profiles, contracts } = useStore();
  const _hasHydrated = useHasHydrated();

  const [aId, setAId] = useState(searchParams.get("a") ?? "");
  const [bId, setBId] = useState(searchParams.get("b") ?? "");

  if (!_hasHydrated) return <PageShell loading />;

  const profileA = profiles.find((p) => p.id === aId);
  const profileB = profiles.find((p) => p.id === bId);

  const filtered = contracts.filter((c) => {
    if (c.profileAId && c.profileBId) {
      return (
        (c.profileAId === aId && c.profileBId === bId) ||
        (c.profileAId === bId && c.profileBId === aId)
      );
    }
    if (!profileA || !profileB) return false;
    const names = new Set([profileA.name.toLowerCase(), profileB.name.toLowerCase()]);
    return (
      names.has(c.profileAName.toLowerCase()) && names.has(c.profileBName.toLowerCase())
    );
  });

  const bothSelected = !!profileA && !!profileB;

  return (
    <PageShell width="2xl" className="lg:max-w-4xl">
      <h1 className="sr-only">Verloop</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {(
          [
            { id: aId, setId: setAId, label: "Profiel A", colour: COLOUR_A },
            { id: bId, setId: setBId, label: "Profiel B", colour: COLOUR_B },
          ] as const
        ).map(({ id, setId, label, colour }) => (
          <div key={label}>
            <label className="block text-xs mb-1" style={{ color: colour }}>
              {label}
            </label>
            <ProfileSelect
              profiles={profiles}
              value={id}
              onChange={setId}
              placeholder="— selecteer —"
            />
          </div>
        ))}
      </div>

      {!bothSelected ? (
        <div className="rounded-xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            Kies twee profielen om hun verloop te zien.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-6 text-center flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-medium">Nog geen contracten</p>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            Leg een moment vast met een contract — dan zie je hier hoe jullie afspraken zich ontwikkelen.
          </p>
          <Link
            href={`/contract?a=${aId}&b=${bId}`}
            prefetch={false}
            className="focus-ring mt-1 inline-block rounded-xl px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Maak contract
          </Link>
        </div>
      ) : (
        <>
          <ContractTrendsChart contracts={filtered} />
          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>
                {profileA.name} &amp; {profileB.name}
              </h2>
              <span className="text-xs" style={{ color: "var(--text2)" }}>
                {filtered.length} {filtered.length === 1 ? "contract" : "contracten"}
              </span>
            </div>
            <CompatibilityTimeline contracts={filtered} />
          </div>
        </>
      )}
    </PageShell>
  );
}

export default function TimelineSuspense() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-sm" style={{ color: "var(--text2)" }}>
          Laden…
        </div>
      }
    >
      <TimelinePage />
    </Suspense>
  );
}
