"use client";
import { use, useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { CATEGORIES, getKinksByCategoryAndLevel, LEVEL_MAX } from "@/lib/kinks";
import CategorySection from "@/components/CategorySection";
import type { KinkStatus } from "@/types";

const STAR_LEGEND = "★ Nooit · ★★ Één keer · ★★★ Af en toe · ★★★★ Regelmatig · ★★★★★ Veel ervaring";
const ALL_CATS = [...CATEGORIES, "Meer"];

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProfilePage({ params }: Props) {
  const { id } = use(params);
  const { profiles, setEntry, addCustomKink, removeCustomKink } = useStore();
  const _hasHydrated = useHasHydrated();
  const profile = profiles.find((p) => p.id === id);

  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [customInput, setCustomInput] = useState("");
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

  const maxLevel = LEVEL_MAX[profile.experienceLevel ?? "beginner"];
  const visibleKinks = CATEGORIES.flatMap((cat) => getKinksByCategoryAndLevel(cat, maxLevel));
  const totalRated = visibleKinks.filter((k) => profile.entries[k.id]?.status).length;
  const totalVisible = visibleKinks.length;
  const progress = totalVisible > 0 ? (totalRated / totalVisible) * 100 : 0;

  function handleExport() {
    const lines: string[] = [
      `# KinkList — ${profile!.name} (${profile!.role})`,
      `Gegenereerd: ${new Date().toLocaleDateString("nl-NL")}`,
      "",
    ];
    for (const cat of CATEGORIES) {
      const kinks = getKinksByCategoryAndLevel(cat, maxLevel);
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
    if ((profile!.customKinks ?? []).length > 0) {
      lines.push("## Meer");
      for (const ck of profile!.customKinks) {
        const e = profile!.entries[ck.id];
        if (!e?.status) continue;
        const stars = e.score ? "★".repeat(e.score) : "";
        const comment = e.comment ? ` — ${e.comment}` : "";
        lines.push(`- [${e.status?.toUpperCase()}] ${ck.name}${stars ? "  " + stars : ""}${comment}`);
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

  function handleAddCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!customInput.trim()) return;
    addCustomKink(profile!.id, customInput.trim());
    setCustomInput("");
  }

  const customKinks = profile.customKinks ?? [];

  return (
    <main className="max-w-3xl mx-auto w-full pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <Link href="/" aria-label="Terug naar profielen" className="focus-ring text-sm transition-colors" style={{ color: "var(--text2)" }}>
            ← Terug
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{profile.name}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}>
                {profile.role}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                {profile.experienceLevel ?? "beginner"}
              </span>
              <span className="text-xs tabular-nums" style={{ color: "var(--text2)" }}>
                {totalRated} / {totalVisible} beoordeeld
              </span>
            </div>
          </div>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--accent), var(--accent2))" }}
          />
        </div>
      </div>

      {/* Star legend */}
      <div className="px-4 pb-2">
        <p className="text-[11px]" style={{ color: "var(--text2)" }}>
          <span className="font-semibold" style={{ color: "var(--accent)" }}>★ Ervaring:</span> {STAR_LEGEND}
        </p>
      </div>

      {/* Sticky scrollspy nav */}
      <div
        ref={navRef}
        className="no-scrollbar sticky top-0 z-10 flex gap-1.5 overflow-x-auto px-4 py-2"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        {ALL_CATS.map((cat) => (
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

      {/* Standard categories — filtered by level */}
      <div className="px-4 pt-3">
        {CATEGORIES.map((cat) => {
          const kinks = getKinksByCategoryAndLevel(cat, maxLevel);
          if (!kinks.length) return null;
          return (
            <div key={cat} ref={(el) => setSectionRef(el, cat)} data-category={cat}>
              <CategorySection
                category={cat}
                kinks={kinks}
                entries={profile.entries}
                onStatusChange={(kinkId, s: KinkStatus) => setEntry(profile.id, kinkId, { status: s })}
                onScoreChange={(kinkId, n) => setEntry(profile.id, kinkId, { score: n })}
                onCommentChange={(kinkId, c) => setEntry(profile.id, kinkId, { comment: c })}
              />
            </div>
          );
        })}

        {/* Meer — custom kinks */}
        <div ref={(el) => setSectionRef(el, "Meer")} data-category="Meer" className="mb-3">
          <div
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg mb-1"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: "4px solid var(--accent)" }}
          >
            <span className="font-semibold text-sm flex-1">Meer</span>
            <span className="text-xs tabular-nums" style={{ color: "var(--text2)" }}>
              {customKinks.length} eigen
            </span>
          </div>

          {/* Custom kink rows */}
          <div className="flex flex-col pl-1 mb-2">
            {customKinks.map((ck) => (
              <div
                key={ck.id}
                className="rounded-xl overflow-hidden mb-1"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderLeft: `4px solid ${profile.entries[ck.id]?.status ? "var(--accent)" : "transparent"}`,
                }}
              >
                <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                  <span className="flex-1 text-[15px] font-medium">{ck.name}</span>
                  <button
                    onClick={() => removeCustomKink(profile.id, ck.id)}
                    aria-label={`${ck.name} verwijderen`}
                    className="focus-ring w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors"
                    style={{ color: "var(--text2)", border: "1px solid var(--border)" }}
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-5 border-t border-[var(--border)]">
                  {(["yes", "willing", "maybe", "no", "hard_no"] as NonNullable<KinkStatus>[]).map((val) => {
                    const labels: Record<string, string> = { yes: "Heel graag", willing: "Interesse", maybe: "Voor hen", no: "Liever niet", hard_no: "Harde grens" };
                    const icons: Record<string, string> = { yes: "✓", willing: "↗", maybe: "♡", no: "✕", hard_no: "✕✕" };
                    const active = profile.entries[ck.id]?.status === val;
                    return (
                      <button
                        key={val}
                        title={labels[val]}
                        aria-pressed={active}
                        onClick={() => setEntry(profile.id, ck.id, { status: active ? null : val })}
                        className={`focus-ring h-11 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
                          active ? `status-${val}` : "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--surface3)]"
                        }`}
                      >
                        <span className="text-[13px] leading-none">{icons[val]}</span>
                        <span>{labels[val]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Add custom kink input */}
          <form onSubmit={handleAddCustom} className="flex gap-2">
            <input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Voeg iets eigens toe…"
              className="focus-ring flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none placeholder-[color:var(--text2)]"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <button
              type="submit"
              className="focus-ring px-3 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              + Voeg toe
            </button>
          </form>
        </div>
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
