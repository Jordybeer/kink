"use client";
import { use, useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { CATEGORIES, getKinksByCategory } from "@/lib/kinks";
import CategorySection from "@/components/CategorySection";
import type { KinkStatus } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProfilePage({ params }: Props) {
  const { id } = use(params);
  const { profiles, setEntry } = useStore();
  const _hasHydrated = useHasHydrated();
  const profile = profiles.find((p) => p.id === id);

  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const navRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setSectionRef = useCallback((el: HTMLElement | null, cat: string) => {
    if (el) sectionRefs.current.set(cat, el);
    else sectionRefs.current.delete(cat);
  }, []);

  useEffect(() => {
    if (!_hasHydrated) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cat = entry.target.getAttribute("data-category");
            if (cat) setActiveCategory(cat);
          }
        }
      },
      { rootMargin: "-10% 0px -75% 0px", threshold: 0 }
    );

    sectionRefs.current.forEach((el) => observerRef.current!.observe(el));
    return () => observerRef.current?.disconnect();
  }, [_hasHydrated]);

  // Keep the active chip visible in the nav
  useEffect(() => {
    if (!navRef.current) return;
    const btn = navRef.current.querySelector(`[data-nav="${activeCategory}"]`) as HTMLElement | null;
    btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeCategory]);

  if (!_hasHydrated) return null;

  if (!profile) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p style={{ color: "var(--text2)" }}>Profiel niet gevonden.</p>
        <Link href="/" className="focus-ring mt-4 inline-block text-sm" style={{ color: "var(--accent)" }}>
          ← Terug
        </Link>
      </main>
    );
  }

  const totalRated = Object.values(profile.entries).filter((e) => e.status).length;
  const totalKinks = CATEGORIES.reduce((sum, cat) => sum + getKinksByCategory(cat).length, 0);
  const progress = totalKinks > 0 ? (totalRated / totalKinks) * 100 : 0;

  function handleExport() {
    const lines: string[] = [
      `# KinkList — ${profile!.name} (${profile!.role})`,
      `Gegenereerd: ${new Date().toLocaleDateString("nl-NL")}`,
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

  function scrollToCategory(cat: string) {
    sectionRefs.current.get(cat)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="max-w-3xl mx-auto w-full pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <Link
            href="/"
            aria-label="Terug naar profielen"
            className="focus-ring text-sm transition-colors"
            style={{ color: "var(--text2)" }}
          >
            ← Terug
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{profile.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
              >
                {profile.role}
              </span>
              <span className="text-xs tabular-nums" style={{ color: "var(--text2)" }}>
                {totalRated} / {totalKinks} beoordeeld
              </span>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--accent), var(--accent2))",
            }}
          />
        </div>
      </div>

      {/* Sticky category scrollspy nav */}
      <div
        ref={navRef}
        className="no-scrollbar sticky top-0 z-10 flex gap-1.5 overflow-x-auto px-4 py-2"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            data-nav={cat}
            onClick={() => scrollToCategory(cat)}
            className="focus-ring flex-none px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
            style={
              activeCategory === cat
                ? { background: "var(--accent)", color: "#000", border: "1px solid var(--accent)" }
                : { color: "var(--text2)", border: "1px solid var(--border)" }
            }
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Categories */}
      <div className="px-4 pt-3">
        {CATEGORIES.map((cat) => (
          <div
            key={cat}
            ref={(el) => setSectionRef(el, cat)}
            data-category={cat}
          >
            <CategorySection
              category={cat}
              kinks={getKinksByCategory(cat)}
              entries={profile.entries}
              onStatusChange={(kinkId, s: KinkStatus) => setEntry(profile.id, kinkId, { status: s })}
              onScoreChange={(kinkId, n) => setEntry(profile.id, kinkId, { score: n })}
              onCommentChange={(kinkId, c) => setEntry(profile.id, kinkId, { comment: c })}
            />
          </div>
        ))}
      </div>

      {/* FAB export */}
      <button
        onClick={handleExport}
        aria-label="Exporteer lijst als tekstbestand"
        className="focus-ring fixed bottom-6 right-4 z-10 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-opacity hover:opacity-90"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        ↓ Exporteer
      </button>
    </main>
  );
}
