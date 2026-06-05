"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { CompatibilityTimeline } from "@/components/CompatibilityTimeline";
import PageShell from "@/components/PageShell";

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
    // Legacy: match by name
    if (!profileA || !profileB) return false;
    const names = new Set([profileA.name.toLowerCase(), profileB.name.toLowerCase()]);
    return (
      names.has(c.profileAName.toLowerCase()) && names.has(c.profileBName.toLowerCase())
    );
  });

  const bothSelected = !!profileA && !!profileB;

  return (
    <PageShell width="2xl">
      {/* Profile selectors */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {(
          [
            { id: aId, setId: setAId, label: "Profiel A", colour: COLOUR_A },
            { id: bId, setId: setBId, label: "Profiel B", colour: COLOUR_B },
          ] as const
        ).map(({ id, setId, label, colour }) => (
          <div key={label}>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text2)" }}>
              {label}
            </label>
            <select
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="focus-ring w-full rounded-lg px-2 py-2 text-sm focus:outline-none"
              style={{ background: "var(--surface)", border: `1px solid ${colour}`, color: "var(--text)" }}
            >
              <option value="">— selecteer —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role})
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Content */}
      {!bothSelected ? (
        <div className="rounded-xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            Selecteer twee profielen om hun contractgeschiedenis te bekijken.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-6 text-center flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-medium">Nog geen contracten gevonden</p>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            De geschiedenis wordt gevuld zodra jullie een contract genereren. Maak er één aan en exporteer het als PDF — dat slaat een momentopname op.
          </p>
          <Link
            href={`/contract?a=${aId}&b=${bId}`}
            className="focus-ring mt-1 inline-block rounded-xl px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            ✍ Maak contract
          </Link>
        </div>
      ) : (
        <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
              {profileA.name} &amp; {profileB.name}
            </h2>
            <span className="text-xs" style={{ color: "var(--text2)" }}>
              {filtered.length} {filtered.length === 1 ? "contract" : "contracten"}
            </span>
          </div>
          <CompatibilityTimeline contracts={filtered} />
        </div>
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
