"use client";
import { use, useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { CATEGORIES, getKinksByCategoryAndLevel, LEVEL_MAX } from "@/lib/kinks";
import CategorySection from "@/components/CategorySection";
import KinkRow from "@/components/KinkRow";
import CheckIn from "@/components/CheckIn";
import type { KinkStatus } from "@/types";
import QRModal from "@/components/QRModal";
import ProfileHero from "@/components/ProfileHero";

const DESIRE_LEGEND = "★ Weinig  ·  ★★★ Gemiddeld  ·  ★★★★★ Heel graag";
const ALL_CATS = [...CATEGORIES, "Meer"];

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProfilePage({ params }: Props) {
  const { id } = use(params);
  const { profiles, setEntry, addCustomKink, removeCustomKink, renameProfile, setProfileAvatar } = useStore();
  const _hasHydrated = useHasHydrated();
  const profile = profiles.find((p) => p.id === id);

  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [customInput, setCustomInput] = useState("");
  const [checkInDone, setCheckInDone] = useState(false);
  const [search, setSearch] = useState("");
  const [compact, setCompact] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [fetLifeInput, setFetLifeInput] = useState("");
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

  useEffect(() => {
    if (!_hasHydrated || !profile) return;
    const key = `checkin-${profile.id}`;
    if (localStorage.getItem(key)) {
      setCheckInDone(true);
      return;
    }
    const hasRatings = Object.values(profile.entries).some((e) => e.status);
    if (hasRatings) {
      setCheckInDone(true);
      localStorage.setItem(key, "1");
    }
  }, [_hasHydrated, profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync fetLifeInput when profile loads
  useEffect(() => {
    if (profile) setFetLifeInput(profile.fetLifeUsername ?? "");
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function handleStatus(kinkId: string, s: KinkStatus) {
    setEntry(profile!.id, kinkId, { status: s, desire: null });
  }

  function saveFetLife() {
    renameProfile(
      profile!.id, profile!.name, profile!.role, profile!.experienceLevel,
      profile!.relationshipStatus, fetLifeInput.trim() || undefined
    );
  }
  const visibleKinks = CATEGORIES.flatMap((cat) => getKinksByCategoryAndLevel(cat, maxLevel));
  const totalRated = visibleKinks.filter((k) => profile.entries[k.id]?.status).length;
  const totalVisible = visibleKinks.length;
  const progress = totalVisible > 0 ? (totalRated / totalVisible) * 100 : 0;

  const searchTrimmed = search.trim();
  const searchResults = searchTrimmed
    ? visibleKinks.filter((k) => k.name.toLowerCase().includes(searchTrimmed.toLowerCase()))
    : [];

  function handleExport() {
    const lines: string[] = [
      `# KinkSync — ${profile!.name} (${profile!.role})`,
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

  async function handlePDFExport() {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210;
    const margin = 20;
    const lineW = W - margin * 2;
    let y = 20;

    const accent: [number, number, number] = [192, 132, 252];
    const dark: [number, number, number] = [20, 18, 28];
    const muted: [number, number, number] = [120, 110, 160];
    const light: [number, number, number] = [220, 215, 240];

    // Background
    doc.setFillColor(...dark);
    doc.rect(0, 0, W, 297, "F");

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...accent);
    doc.text("KinkSync", W / 2, y, { align: "center" });
    y += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...muted);
    doc.text("kinksync.be", W / 2, y, { align: "center" });
    y += 7;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...light);
    doc.text(`${profile!.name} — ${profile!.role}`, W / 2, y, { align: "center" });
    y += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...muted);
    doc.text(`${profile!.experienceLevel} · Gegenereerd op ${new Date().toLocaleDateString("nl-NL")}`, W / 2, y, { align: "center" });
    y += 5;

    doc.setDrawColor(...accent);
    doc.setLineWidth(0.4);
    doc.line(margin, y, W - margin, y);
    y += 6;

    const STATUS_COLORS: Record<string, [number, number, number]> = {
      yes:     [74, 222, 128],
      willing: [96, 165, 250],
      maybe:   [192, 132, 252],
      no:      [120, 110, 160],
      hard_no: [239, 68, 68],
    };
    const STATUS_NL: Record<string, string> = {
      yes: "Heel graag", willing: "Interesse", maybe: "Voor hen", no: "Liever niet", hard_no: "Harde grens",
    };

    for (const cat of CATEGORIES) {
      const kinks = getKinksByCategoryAndLevel(cat, maxLevel);
      const active = kinks.filter((k) => profile!.entries[k.id]?.status);
      if (!active.length) continue;

      if (y > 260) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 297, "F"); y = 20; }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...accent);
      doc.text(cat.toUpperCase(), margin, y);
      y += 5;

      for (const k of active) {
        if (y > 265) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 297, "F"); y = 20; }
        const e = profile!.entries[k.id];
        const color = e.status ? STATUS_COLORS[e.status] : muted;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...color);
        const statusLabel = e.status ? `[${STATUS_NL[e.status]}]` : "";
        const stars = e.score ? "★".repeat(e.score) : "";
        const tags = (e.tags ?? []).length ? ` [${e.tags!.join(", ")}]` : "";
        doc.text(`• ${k.name}`, margin + 2, y);
        doc.setTextColor(...muted);
        doc.text(`${statusLabel}${stars ? "  " + stars : ""}${tags}`, margin + 2 + doc.getTextWidth(`• ${k.name}`) + 3, y);
        y += 4.5;
        if (e.comment) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.setTextColor(...muted);
          const commentLines = doc.splitTextToSize(`  ${e.comment}`, lineW - 5);
          doc.text(commentLines, margin + 4, y);
          y += commentLines.length * 4;
        }
      }
      y += 3;
    }

    const customKinksList = profile!.customKinks ?? [];
    const activeCustom = customKinksList.filter((ck) => profile!.entries[ck.id]?.status);
    if (activeCustom.length) {
      if (y > 260) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 297, "F"); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...accent);
      doc.text("MEER (EIGEN KINKS)", margin, y);
      y += 5;
      for (const ck of activeCustom) {
        const e = profile!.entries[ck.id];
        const color = e?.status ? STATUS_COLORS[e.status] : muted;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...color);
        const statusLabel = e?.status ? `[${STATUS_NL[e.status]}]` : "";
        doc.text(`• ${ck.name}  ${statusLabel}`, margin + 2, y);
        y += 4.5;
      }
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text(`${i} / ${pageCount}`, W - margin, 290, { align: "right" });
    }

    doc.save(`${profile!.name}-kinks.pdf`);
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
      {/* Emotional check-in overlay */}
      {_hasHydrated && profile && !checkInDone && (
        <CheckIn
          profileName={profile.name}
          onDone={() => {
            setCheckInDone(true);
            localStorage.setItem(`checkin-${profile.id}`, "1");
          }}
        />
      )}

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
          <button
            onClick={() => setCompact((v) => !v)}
            aria-label={compact ? "Uitgebreide weergave" : "Compacte weergave"}
            title={compact ? "Uitgebreide weergave" : "Compacte weergave"}
            className="focus-ring p-2 rounded-lg border text-xs flex-none transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: compact ? "var(--accent)" : "var(--text2)",
              background: compact ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
            }}
          >
            {compact ? "≡" : "⊡"}
          </button>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--accent), var(--accent2))" }}
          />
        </div>
      </div>

      {/* Profile Hero */}
      <ProfileHero
        profile={profile}
        maxLevel={maxLevel}
        onShare={profile.isImported ? undefined : () => setShareOpen(true)}
        onAvatarChange={(dataUrl) => setProfileAvatar(profile.id, dataUrl)}
      />

      {/* Verlangen legend + FetLife input */}
      <div className="px-4 pb-2 flex flex-col gap-2">
        <p className="text-[11px]" style={{ color: "var(--text2)" }}>
          <span className="font-semibold" style={{ color: "var(--accent)" }}>★ Verlangen:</span> {DESIRE_LEGEND}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] flex-none" style={{ color: "var(--text2)" }}>FL:</span>
          <input
            value={fetLifeInput}
            onChange={(e) => setFetLifeInput(e.target.value)}
            onBlur={saveFetLife}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
            placeholder="FetLife gebruikersnaam (optioneel)"
            className="flex-1 text-[11px] bg-transparent border-b focus:outline-none py-0.5 transition-colors"
            style={{
              color: "var(--text)",
              borderBottomColor: fetLifeInput ? "var(--accent)" : "var(--border)",
            }}
          />
          {fetLifeInput && (
            <a
              href={`https://fetlife.com/users/${fetLifeInput}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] hover:underline flex-none"
              style={{ color: "var(--accent)" }}
            >
              ↗
            </a>
          )}
        </div>
      </div>

      {/* Search filter */}
      <div className="px-4 pb-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek een kink…"
          className="focus-ring w-full rounded-lg px-3 py-2 text-sm focus:outline-none placeholder-[color:var(--text2)]"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
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

      {/* Standard categories — filtered by level, or search results */}
      <div className="px-4 pt-3">
        {searchTrimmed ? (
          <div>
            <p className="text-[11px] mb-2 tabular-nums" style={{ color: "var(--text2)" }}>
              {searchResults.length} resultaten
            </p>
            {searchResults.length === 0 ? (
              <p className="text-center text-sm py-8" style={{ color: "var(--text2)" }}>
                Geen kinks gevonden voor &ldquo;{searchTrimmed}&rdquo;
              </p>
            ) : (
              <div className="flex flex-col pl-1">
                {searchResults.map((kink) => (
                  <KinkRow
                    key={kink.id}
                    kink={kink}
                    entry={profile.entries[kink.id] ?? { status: null, score: null, comment: "" }}
                    onStatusChange={(s) => handleStatus(kink.id, s)}
                    onExperiencedChange={(v) => setEntry(profile.id, kink.id, { experienced: v })}
                    onCommentChange={(c) => setEntry(profile.id, kink.id, { comment: c })}
                    onTagsChange={(tags) => setEntry(profile.id, kink.id, { tags })}
                    compact={compact}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
        {CATEGORIES.map((cat) => {
          const kinks = getKinksByCategoryAndLevel(cat, maxLevel);
          if (!kinks.length) return null;
          return (
            <div key={cat} ref={(el) => setSectionRef(el, cat)} data-category={cat}>
              <CategorySection
                category={cat}
                kinks={kinks}
                entries={profile.entries}
                onStatusChange={(kinkId, s) => handleStatus(kinkId, s)}
                onExperiencedChange={(kinkId, v) => setEntry(profile.id, kinkId, { experienced: v })}
                onCommentChange={(kinkId, c) => setEntry(profile.id, kinkId, { comment: c })}
                onTagsChange={(kinkId, tags) => setEntry(profile.id, kinkId, { tags })}
                onBulkSkip={() => {
                  for (const k of getKinksByCategoryAndLevel(cat, maxLevel)) {
                    setEntry(profile.id, k.id, { status: "no", desire: null });
                  }
                }}
                compact={compact}
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
            {customKinks.map((ck) => {
              const ckStatus = profile.entries[ck.id]?.status ?? null;
              const ckBorderColor = ckStatus ? ({ yes: "var(--yes)", willing: "var(--willing)", maybe: "var(--maybe)", no: "var(--no)", hard_no: "var(--hard-no)" }[ckStatus]) : "transparent";
              return (
                <div
                  key={ck.id}
                  className="rounded-xl overflow-hidden mb-1 transition-[border-left-color] duration-150"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderLeft: `4px solid ${ckBorderColor}`,
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
                  <div className="flex items-center gap-1 px-3 pb-2.5 flex-wrap">
                    {(["yes","willing","maybe","no","hard_no"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatus(ck.id, ckStatus === s ? null : s)}
                        aria-pressed={ckStatus === s}
                        className={`focus-ring rounded-full border text-[11px] font-medium transition-colors px-2.5 py-1${ckStatus === s ? ` status-${s}` : ""}`}
                        style={ckStatus !== s ? { color: "var(--text2)", borderColor: "var(--border)" } : {}}
                      >
                        {s === "yes" ? "Ja" : s === "willing" ? "Graag" : s === "maybe" ? "Misschien" : s === "no" ? "Nee" : "Harde grens"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
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
          </>
        )}
      </div>

      <QRModal profile={shareOpen && !profile.isImported ? profile : null} onClose={() => setShareOpen(false)} />

      {/* FAB export — hidden for imported profiles (privacy) */}
      {profile.isImported && (
        <div className="fixed bottom-6 right-4 z-10 px-3 py-2 rounded-full text-xs" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
          🔒 Geïmporteerd profiel
        </div>
      )}
      {!profile.isImported && <div
        className="focus-ring fixed bottom-6 right-4 z-10 flex items-center gap-1 rounded-full shadow-lg overflow-hidden"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
      >
        <button
          onClick={handleExport}
          aria-label="Exporteer lijst als tekstbestand"
          className="px-3 py-2.5 text-sm font-semibold hover:bg-[var(--surface)] transition-colors"
          style={{ color: "var(--text)" }}
        >
          ↓ TXT
        </button>
        <div style={{ width: "1px", background: "var(--border)", alignSelf: "stretch" }} />
        <button
          onClick={handlePDFExport}
          aria-label="Exporteer lijst als PDF"
          className="px-3 py-2.5 text-sm font-semibold hover:bg-[var(--surface)] transition-colors"
          style={{ color: "var(--accent)" }}
        >
          ↓ PDF
        </button>
      </div>}
    </main>
  );
}
