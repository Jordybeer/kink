"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { CompatibilityTimeline } from "@/components/CompatibilityTimeline";
import { ContractTrendsChart } from "@/components/ContractTrendsChart";
import PageShell from "@/components/PageShell";
import CompareProfileHeader from "@/components/compare/CompareProfileHeader";
import ProfileSelectorSheet from "@/components/compare/ProfileSelectorSheet";

function TimelinePage() {
  const searchParams = useSearchParams();
  const { profiles, contracts, pinnedProfileId } = useStore();
  const _hasHydrated = useHasHydrated();

  const [aId, setAId] = useState(searchParams.get("a") ?? "");
  const [bId, setBId] = useState(searchParams.get("b") ?? "");
  const [selectorOpen, setSelectorOpen] = useState<null | "a" | "b">(null);

  if (!_hasHydrated) return <PageShell loading />;

  const profileA = profiles.find((p) => p.id === aId);
  const profileB = profiles.find((p) => p.id === bId);
  const samePairError = Boolean(aId && bId && aId === bId);

  const filtered = contracts.filter((c) => {
    if (samePairError) return false;
    if (c.profileAId && c.profileBId) {
      return (
        (c.profileAId === aId && c.profileBId === bId) ||
        (c.profileAId === bId && c.profileBId === aId)
      );
    }
    if (!profileA || !profileB) return false;
    const names = new Set([profileA.name.toLowerCase(), profileB.name.toLowerCase()]);
    return names.has(c.profileAName.toLowerCase()) && names.has(c.profileBName.toLowerCase());
  });

  const bothSelected = Boolean(profileA && profileB && !samePairError);

  return (
    <PageShell width="2xl" className="lg:max-w-4xl">
      <h1 className="sr-only">Verloop</h1>

      <CompareProfileHeader
        profileA={profileA}
        profileB={profileB}
        samePairError={samePairError}
        onOpenA={() => setSelectorOpen("a")}
        onOpenB={() => setSelectorOpen("b")}
      />

      {!bothSelected ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            Kies twee profielen om hun verloop te zien.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-medium">Nog geen contracten</p>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            Leg een moment vast met een contract, dan zie je hier hoe jullie afspraken zich ontwikkelen.
          </p>
          <Link
            href={`/contract?a=${aId}&b=${bId}`}
            prefetch={false}
            className="focus-ring mt-1 inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
          >
            Maak contract
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <ContractTrendsChart contracts={filtered} />
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="min-w-0 truncate text-sm" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>
                {profileA.name} &amp; {profileB.name}
              </h2>
              <span className="flex-none text-xs" style={{ color: "var(--text2)" }}>
                {filtered.length} {filtered.length === 1 ? "contract" : "contracten"}
              </span>
            </div>
            <CompatibilityTimeline contracts={filtered} />
          </section>
        </div>
      )}

      <ProfileSelectorSheet
        open={selectorOpen === "a"}
        onClose={() => setSelectorOpen(null)}
        slot="A"
        profiles={profiles}
        selectedId={aId}
        otherSelectedId={bId}
        pinnedProfileId={pinnedProfileId}
        onSelect={setAId}
      />
      <ProfileSelectorSheet
        open={selectorOpen === "b"}
        onClose={() => setSelectorOpen(null)}
        slot="B"
        profiles={profiles}
        selectedId={bId}
        otherSelectedId={aId}
        pinnedProfileId={pinnedProfileId}
        onSelect={setBId}
      />
    </PageShell>
  );
}

export default function TimelineSuspense() {
  return (
    <Suspense
      fallback={(
        <div className="p-10 text-center text-sm" style={{ color: "var(--text2)" }}>
          Laden…
        </div>
      )}
    >
      <TimelinePage />
    </Suspense>
  );
}
