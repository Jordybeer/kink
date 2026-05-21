"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { KINKS, CATEGORIES, getKinksByCategory } from "@/lib/kinks";
import type { KinkStatus, KinkEntry } from "@/types";

const STATUS_LABEL: Record<NonNullable<KinkStatus>, string> = {
  yes: "✓ Yes",
  willing: "↗ Willing",
  maybe: "~ Maybe",
  no: "✗ No",
  hard_no: "⛔ Hard no",
};

function StatusBadge({ status }: { status: KinkStatus }) {
  if (!status) return <span className="text-xs" style={{ color: "var(--muted)" }}>—</span>;
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border status-${status} whitespace-nowrap`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function matchClass(a: KinkStatus, b: KinkStatus): string {
  if (!a && !b) return "";
  if (a === "hard_no" || b === "hard_no") return "bg-red-950/30";
  if (a === b) return "bg-green-950/30";
  if ((a === "yes" || a === "willing") && (b === "yes" || b === "willing")) return "bg-green-950/20";
  if (a === "no" || b === "no") return "bg-orange-950/20";
  return "";
}

function ComparePage() {
  const searchParams = useSearchParams();
  const { profiles, _hasHydrated } = useStore();

  const [aId, setAId] = useState(searchParams.get("a") ?? "");
  const [bId, setBId] = useState(searchParams.get("b") ?? "");
  const [filterMode, setFilterMode] = useState<"all" | "match" | "conflict" | "hardno">("all");
  const [showEmpty, setShowEmpty] = useState(false);

  if (!_hasHydrated) return null;

  const profileA = profiles.find((p) => p.id === aId);
  const profileB = profiles.find((p) => p.id === bId);

  function getEntry(profile: typeof profileA, kinkId: string): KinkEntry {
    return profile?.entries[kinkId] ?? { status: null, score: null, comment: "" };
  }

  function passesFilter(a: KinkStatus, b: KinkStatus): boolean {
    if (!showEmpty && !a && !b) return false;
    if (filterMode === "all") return true;
    if (filterMode === "hardno") return a === "hard_no" || b === "hard_no";
    if (filterMode === "conflict") {
      if (!a || !b) return false;
      const bothOk = ["yes", "willing", "maybe"];
      if (a === "hard_no" || b === "hard_no") return true;
      return !(bothOk.includes(a) && bothOk.includes(b));
    }
    if (filterMode === "match") {
      if (!a || !b) return false;
      return (a === "yes" || a === "willing") && (b === "yes" || b === "willing");
    }
    return true;
  }

  function handleExportContract() {
    if (!profileA || !profileB) return;
    const lines: string[] = [
      `# BDSM Negotiation — ${profileA.name} & ${profileB.name}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      "",
      "## Shared interests (both Yes/Willing)",
      "",
    ];
    const shared: string[] = [];
    const limits: string[] = [];
    const hardLimits: string[] = [];
    const conflicts: string[] = [];

    for (const kink of KINKS) {
      const a = profileA.entries[kink.id]?.status ?? null;
      const b = profileB.entries[kink.id]?.status ?? null;
      if (!a && !b) continue;
      const entryA = profileA.entries[kink.id];
      const entryB = profileB.entries[kink.id];
      const row = `- ${kink.name} [${profileA.name}: ${a ?? "—"}, ${profileB.name}: ${b ?? "—"}]`;
      const commentA = entryA?.comment ? ` (${profileA.name}: ${entryA.comment})` : "";
      const commentB = entryB?.comment ? ` (${profileB.name}: ${entryB.comment})` : "";
      const full = row + commentA + commentB;
      if (a === "hard_no" || b === "hard_no") hardLimits.push(full);
      else if ((a === "yes" || a === "willing") && (b === "yes" || b === "willing")) shared.push(full);
      else if (a === "no" || b === "no") limits.push(full);
      else conflicts.push(full);
    }

    lines.push(...shared, "", "## Hard limits", "", ...hardLimits, "", "## Soft limits / no", "", ...limits, "", "## Needs discussion", "", ...conflicts, "");
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contract-${profileA.name}-${profileB.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 w-full">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/" className="text-sm" style={{ color: "var(--muted)" }}>← Back</Link>
        <h1 className="text-xl font-bold flex-1">Compare Profiles</h1>
        {profileA && profileB && (
          <button
            onClick={handleExportContract}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            ↓ Export contract
          </button>
        )}
      </div>

      {/* Profile selectors */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {([{ id: aId, setId: setAId, label: "Profile A" }, { id: bId, setId: setBId, label: "Profile B" }] as const).map(
          ({ id, setId, label }) => (
            <div key={label}>
              <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>{label}</label>
              <select
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="">— select —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                ))}
              </select>
            </div>
          )
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(["all", "match", "conflict", "hardno"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilterMode(f)}
            className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
            style={filterMode === f
              ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
              : { background: "transparent", color: "var(--muted)", borderColor: "var(--border)" }}
          >
            {f === "all" ? "All" : f === "match" ? "✓ Matches" : f === "conflict" ? "⚠ Conflicts" : "⛔ Hard limits"}
          </button>
        ))}
        <label className="flex items-center gap-1.5 text-xs ml-2 cursor-pointer" style={{ color: "var(--muted)" }}>
          <input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} className="rounded" />
          Show unrated
        </label>
      </div>

      {(!profileA || !profileB) ? (
        <p className="text-center py-12 text-sm" style={{ color: "var(--muted)" }}>Select two profiles above to compare.</p>
      ) : (
        CATEGORIES.map((cat) => {
          const kinks = getKinksByCategory(cat).filter((k) => {
            const a = getEntry(profileA, k.id).status;
            const b = getEntry(profileB, k.id).status;
            return passesFilter(a, b);
          });
          if (!kinks.length) return null;
          return (
            <section key={cat} className="mb-6">
              <h2 className="text-sm font-semibold mb-2 px-1" style={{ color: "var(--accent)" }}>{cat}</h2>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {/* Table header */}
                <div className="grid grid-cols-[1fr_auto_auto] px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style={{ background: "var(--surface)", color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                  <span>Activity</span>
                  <span className="w-28 text-center">{profileA.name}</span>
                  <span className="w-28 text-center">{profileB.name}</span>
                </div>
                {kinks.map((kink, i) => {
                  const eA = getEntry(profileA, kink.id);
                  const eB = getEntry(profileB, kink.id);
                  const highlight = matchClass(eA.status, eB.status);
                  return (
                    <div
                      key={kink.id}
                      className={`grid grid-cols-[1fr_auto_auto] px-3 py-2 gap-2 items-start ${highlight} ${i % 2 === 0 ? "" : "bg-black/10"}`}
                      style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
                    >
                      <div>
                        <div className="text-sm">{kink.name}</div>
                        {(eA.comment || eB.comment) && (
                          <div className="mt-0.5 text-xs space-y-0.5" style={{ color: "var(--muted)" }}>
                            {eA.comment && <div><span className="font-medium" style={{ color: "var(--accent)" }}>{profileA.name}:</span> {eA.comment}</div>}
                            {eB.comment && <div><span className="font-medium" style={{ color: "var(--accent2)" }}>{profileB.name}:</span> {eB.comment}</div>}
                          </div>
                        )}
                      </div>
                      <div className="w-28 flex flex-col items-center gap-1">
                        <StatusBadge status={eA.status} />
                        {eA.score && <span className="text-xs" style={{ color: "var(--accent)" }}>{"★".repeat(eA.score)}</span>}
                      </div>
                      <div className="w-28 flex flex-col items-center gap-1">
                        <StatusBadge status={eB.status} />
                        {eB.score && <span className="text-xs" style={{ color: "var(--accent2)" }}>{"★".repeat(eB.score)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}

export default function CompareSuspense() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm" style={{ color: "var(--muted)" }}>Loading…</div>}>
      <ComparePage />
    </Suspense>
  );
}
