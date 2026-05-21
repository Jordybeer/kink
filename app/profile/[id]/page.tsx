"use client";
import { use } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { CATEGORIES, getKinksByCategory } from "@/lib/kinks";
import CategorySection from "@/components/CategorySection";
import type { KinkStatus } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProfilePage({ params }: Props) {
  const { id } = use(params);
  const { profiles, setEntry, _hasHydrated } = useStore();
  const profile = profiles.find((p) => p.id === id);

  if (!_hasHydrated) {
    return null;
  }

  if (!profile) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p style={{ color: "var(--muted)" }}>Profile not found.</p>
        <Link href="/" className="mt-4 inline-block text-sm" style={{ color: "var(--accent)" }}>← Back to profiles</Link>
      </main>
    );
  }

  const totalRated = Object.values(profile.entries).filter((e) => e.status).length;
  const totalKinks = CATEGORIES.reduce((sum, cat) => sum + getKinksByCategory(cat).length, 0);

  function handleExport() {
    const lines: string[] = [
      `# KinkList — ${profile!.name} (${profile!.role})`,
      `Generated: ${new Date().toLocaleDateString()}`,
      "",
    ];

    for (const cat of CATEGORIES) {
      const kinks = getKinksByCategory(cat);
      const active = kinks.filter((k) => profile!.entries[k.id]?.status);
      if (!active.length) continue;
      lines.push(`## ${cat}`);
      for (const k of active) {
        const e = profile!.entries[k.id];
        const stars = e.score ? "★".repeat(e.score) + "☆".repeat(5 - e.score) : "";
        const comment = e.comment ? ` — ${e.comment}` : "";
        lines.push(`- [${e.status?.toUpperCase()}] ${k.name}${stars ? "  " + stars : ""}${comment}`);
      }
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile!.name}-kinks.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/" className="text-sm transition-colors" style={{ color: "var(--muted)" }}>← Back</Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{profile.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)" }}>{profile.role}</span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{totalRated} / {totalKinks} rated</span>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          ↓ Export .txt
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-5 text-xs">
        {(["yes", "willing", "maybe", "no", "hard_no"] as const).map((s) => (
          <span key={s} className={`px-2 py-0.5 rounded border status-${s}`}>
            {s === "yes" ? "✓ Yes" : s === "willing" ? "↗ Willing" : s === "maybe" ? "~ Maybe" : s === "no" ? "✗ No" : "⛔ Hard no"}
          </span>
        ))}
        <span className="text-xs ml-1" style={{ color: "var(--muted)" }}>— click a label to toggle; click again to clear</span>
      </div>

      {/* Categories */}
      {CATEGORIES.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          kinks={getKinksByCategory(cat)}
          entries={profile.entries}
          onStatusChange={(kinkId, s) => setEntry(profile.id, kinkId, { status: s })}
          onScoreChange={(kinkId, n) => setEntry(profile.id, kinkId, { score: n })}
          onCommentChange={(kinkId, c) => setEntry(profile.id, kinkId, { comment: c })}
        />
      ))}
    </main>
  );
}
