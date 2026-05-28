"use client";
import { use, useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { CATEGORIES, getKinksByCategoryAndLevel, LEVEL_MAX } from "@/lib/kinks";
import CategorySection from "@/components/CategorySection";
import KinkRow from "@/components/KinkRow";
import type { ExperienceLevel, KinkStatus } from "@/types";
import QRModal from "@/components/QRModal";
import ProfileHero from "@/components/ProfileHero";
import BottomNav from "@/components/BottomNav";
import ProfileTour from "@/components/ProfileTour";
import { ChevronDown, ChevronRight } from "lucide-react";

const ALL_CATS = [...CATEGORIES, "Meer"];

const STATUS_COLORS: Record<NonNullable<KinkStatus>, string> = {
  willing: "var(--willing)", yes: "var(--yes)", maybe: "var(--maybe)",
  no: "var(--no)", hard_no: "var(--hard-no)",
};
const STATUS_LABELS: Record<NonNullable<KinkStatus>, string> = {
  willing: "Graag", yes: "Ja", maybe: "Misschien", no: "Nee", hard_no: "Harde grens",
};

const ROLE_GROUPS: { label: string; roles: string[] }[] = [
  { label: "D/s dynamiek",   roles: ["Switch", "Dominant", "Submissive"] },
  { label: "Zorgzame D/s",   roles: ["Daddy Dom", "Mommy Dom", "little", "Middle", "Caregiver"] },
  { label: "Impact & touw",  roles: ["Top", "Bottom", "Sadist", "Masochist", "Rigger", "Rope Bunny"] },
  { label: "Karakter",       roles: ["Brat", "Brat Tamer", "Primal Hunter", "Primal Prey"] },
  { label: "Dier & spel",    roles: ["Handler/Owner", "Pet"] },
  { label: "Overig",         roles: ["Voyeur", "Exhibitionist", "Kinkster", "Vanilla (curious)"] },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; sub: string }[] = [
  { value: "beginner",  label: "Beginner",  sub: "kort" },
  { value: "gevorderd", label: "Gevorderd", sub: "normaal" },
  { value: "ervaren",   label: "Ervaren",   sub: "lang" },
  { value: "diepgaand", label: "Diepgaand", sub: "alles" },
];

const RELATIONSHIP_STATUSES = [
  "Single", "Taken", "Getrouwd", "Gecollared",
  "Polyamoreus", "Open relatie", "Geowned", "Het is ingewikkeld",
];

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProfilePage({ params }: Props) {
  const { id } = use(params);
  const { profiles, setEntry, addCustomKink, removeCustomKink, renameProfile, setProfileAvatar, updatePrivateNote, profileTourComplete, completeProfileTour } = useStore();
  const _hasHydrated = useHasHydrated();
  const profile = profiles.find((p) => p.id === id);

  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [customInput, setCustomInput] = useState("");
  const [search, setSearch] = useState("");
  const [compact, setCompact] = useState(false);
  const [hideComments, setHideComments] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editLevel, setEditLevel] = useState<ExperienceLevel>("beginner");
  const [editRelStatus, setEditRelStatus] = useState("");
  const [editFetLife, setEditFetLife] = useState("");
  const [editBdsmtestUrl, setEditBdsmtestUrl] = useState("");
  const [editUrlError, setEditUrlError] = useState<string | null>(null);
  const [showOverviewComments, setShowOverviewComments] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editListOpen, setEditListOpen] = useState(false);
  const [meerOpen, setMeerOpen] = useState(true);
  const editListInitialized = useRef(false);
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
    if (!_hasHydrated || !profile || editListInitialized.current) return;
    editListInitialized.current = true;
    const hasRatings = Object.values(profile.entries).some((e) => e.status);
    setEditListOpen(!hasRatings);
  }, [_hasHydrated, profile]);

  function handleStartEdit() {
    if (!profile) return;
    setEditName(profile.name);
    setEditRole(profile.role);
    setEditLevel(profile.experienceLevel ?? "beginner");
    setEditRelStatus(profile.relationshipStatus ?? "");
    setEditFetLife(profile.fetLifeUsername ?? "");
    setEditBdsmtestUrl(profile.bdsmtestUrl ?? "");
    setEditUrlError(null);
    setEditing(true);
  }

  function handleSaveEdit() {
    if (!profile || !editName.trim()) return;
    const fetLife = editFetLife.trim();
    if (fetLife && (fetLife.includes("://") || fetLife.includes("<") || fetLife.includes(">"))) {
      setEditUrlError("FetLife: vul alleen je gebruikersnaam in, geen URL.");
      return;
    }
    const bdsmtest = editBdsmtestUrl.trim();
    if (bdsmtest && !/^https?:\/\/(www\.)?bdsmtest\.org\//i.test(bdsmtest)) {
      setEditUrlError("BDSMTest: URL moet beginnen met https://bdsmtest.org/");
      return;
    }
    setEditUrlError(null);
    renameProfile(profile.id, editName.trim(), editRole, editLevel, editRelStatus || undefined, fetLife || undefined, bdsmtest || undefined);
    setEditing(false);
  }

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
        const comment = e.comment ? ` — ${e.comment}` : "";
        lines.push(`- [${e.status?.toUpperCase()}] ${k.name}${comment}`);
      }
      lines.push("");
    }
    if ((profile!.customKinks ?? []).length > 0) {
      lines.push("## Meer");
      for (const ck of profile!.customKinks) {
        const e = profile!.entries[ck.id];
        if (!e?.status) continue;
        const comment = e.comment ? ` — ${e.comment}` : "";
        lines.push(`- [${e.status?.toUpperCase()}] ${ck.name}${comment}`);
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
        const tags = (e.tags ?? []).length ? ` [${e.tags!.join(", ")}]` : "";
        doc.text(`• ${k.name}`, margin + 2, y);
        doc.setTextColor(...muted);
        doc.text(`${statusLabel}${tags}`, margin + 2 + doc.getTextWidth(`• ${k.name}`) + 3, y);
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
    <main className={`max-w-3xl mx-auto w-full ${!profile.isImported ? "pb-28" : "pb-10"}`}>
      {!profileTourComplete && <ProfileTour onComplete={completeProfileTour} />}

      {/* Error toast */}
      {errorMessage && (
        <div
          className="fixed top-4 left-4 right-4 mx-auto max-w-md z-[300] px-4 py-3 rounded-xl text-sm shadow-lg animate-fade-in"
          style={{ background: "var(--surface)", border: "1px solid var(--hard-no)", color: "var(--hard-no)" }}
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <Link href="/" aria-label="Terug naar profielen" className="focus-ring text-sm transition-colors py-2 pr-2" style={{ color: "var(--text2)" }}>
            ← Terug
          </Link>
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
        onEdit={profile.isImported ? undefined : handleStartEdit}
        onAvatarChange={(dataUrl) => setProfileAvatar(profile.id, dataUrl)}
        onError={(msg) => {
          setErrorMessage(msg);
          setTimeout(() => setErrorMessage(null), 5000);
        }}
      />

      {/* Edit list toggle — primary CTA directly below hero */}
      {!profile.isImported && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setEditListOpen((v) => !v)}
            className="focus-ring w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{
              background: editListOpen ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "var(--surface)",
              border: editListOpen ? "1px solid var(--accent)" : "1px solid var(--border)",
              color: editListOpen ? "var(--accent)" : "var(--text2)",
            }}
          >
            ✏ {editListOpen ? "Verberg bewerken ↑" : "Lijst bewerken ↓"}
          </button>
        </div>
      )}

      {/* Inline profile edit form */}
      {editing && !profile.isImported && (
        <div className="px-4 pb-5">
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--accent)" }}>
              Profiel bijwerken
            </h3>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Naam of alias…"
              className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none placeholder-[color:var(--text2)]"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <label className="text-xs mb-1.5 font-medium block" style={{ color: "var(--text2)" }}>Rol</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              {ROLE_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.roles.map((r) => <option key={r} value={r}>{r}</option>)}
                </optgroup>
              ))}
            </select>
            <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>Ervaringsniveau</p>
            <div className="grid grid-cols-4 gap-1.5 mb-4" role="group" aria-label="Ervaringsniveau">
              {EXPERIENCE_LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setEditLevel(l.value)}
                  aria-pressed={editLevel === l.value}
                  className="focus-ring flex flex-col items-center py-2 rounded-lg text-xs font-medium transition-colors border"
                  style={
                    editLevel === l.value
                      ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                      : { color: "var(--text2)", borderColor: "var(--border)" }
                  }
                >
                  <span className="font-semibold">{l.label}</span>
                  <span className="text-[10px] opacity-70">{l.sub}</span>
                </button>
              ))}
            </div>
            <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>
              Relatiestatus <span className="font-normal opacity-60">(optioneel)</span>
            </p>
            <div className="no-scrollbar flex gap-1.5 mb-4 overflow-x-auto pb-1" role="group" aria-label="Relatiestatus">
              {RELATIONSHIP_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setEditRelStatus((rs) => (rs === s ? "" : s))}
                  aria-pressed={editRelStatus === s}
                  className="focus-ring flex-none px-3 py-1 rounded-full text-xs font-medium transition-colors border"
                  style={
                    editRelStatus === s
                      ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                      : { color: "var(--text2)", borderColor: "var(--border)" }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>
              FetLife <span className="font-normal opacity-60">(optioneel)</span>
            </p>
            <input
              value={editFetLife}
              onChange={(e) => setEditFetLife(e.target.value)}
              placeholder="Gebruikersnaam…"
              className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none placeholder-[color:var(--text2)]"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>
              BDSMTest <span className="font-normal opacity-60">(optioneel)</span>
            </p>
            <input
              value={editBdsmtestUrl}
              onChange={(e) => setEditBdsmtestUrl(e.target.value)}
              placeholder="https://bdsmtest.org/r/…"
              className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none placeholder-[color:var(--text2)]"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            {editUrlError && (
              <p className="text-xs mb-3 px-1" style={{ color: "var(--hard-no)" }}>{editUrlError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="focus-ring flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                Opslaan
              </button>
              <button
                onClick={() => setEditing(false)}
                className="focus-ring px-4 py-2.5 rounded-lg border text-sm"
                style={{ borderColor: "var(--border)", color: "var(--text2)" }}
              >
                Annuleer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read-only overview — compare-style cards, only rated kinks */}
      <div className="px-4 pt-2 pb-3">
        {totalRated === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm mb-3" style={{ color: "var(--text2)" }}>Nog niets beoordeeld.</p>
            <button
              onClick={() => setEditListOpen(true)}
              className="focus-ring text-sm px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Bewerk je lijst om te beginnen →
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text2)" }}>
                {totalRated} beoordeeld
              </span>
              <button
                onClick={() => setShowOverviewComments((v) => !v)}
                aria-label={showOverviewComments ? "Verberg notities" : "Toon notities"}
                title={showOverviewComments ? "Verberg notities" : "Toon notities"}
                className="focus-ring p-1.5 rounded-lg border text-xs transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  color: showOverviewComments ? "var(--accent)" : "var(--text2)",
                  background: showOverviewComments ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
                }}
              >
                💬
              </button>
            </div>
            {CATEGORIES.map((cat) => {
              const ratedKinks = getKinksByCategoryAndLevel(cat, maxLevel).filter(
                (k) => profile.entries[k.id]?.status
              );
              if (!ratedKinks.length) return null;
              return (
                <div key={cat} className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: "var(--text2)" }}>
                    {cat}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {ratedKinks.map((kink) => {
                      const entry = profile.entries[kink.id];
                      const s = entry.status!;
                      return (
                        <div
                          key={kink.id}
                          className="rounded-xl px-3 py-2.5"
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderLeft: `4px solid ${STATUS_COLORS[s]}`,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm flex-1 leading-snug">{kink.name}</span>
                            <span
                              className="text-xs px-1.5 py-0.5 rounded border whitespace-nowrap flex-none"
                              style={{
                                color: STATUS_COLORS[s],
                                borderColor: `color-mix(in srgb, ${STATUS_COLORS[s]} 35%, transparent)`,
                                background: `color-mix(in srgb, ${STATUS_COLORS[s]} 15%, transparent)`,
                              }}
                            >
                              {STATUS_LABELS[s]}
                            </span>
                          </div>
                          {showOverviewComments && entry.comment && (
                            <p className="text-xs mt-1 truncate" style={{ color: "var(--text2)" }}>
                              {entry.comment}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Custom kinks overview */}
            {customKinks.filter((ck) => profile.entries[ck.id]?.status).length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: "var(--text2)" }}>
                  Meer
                </p>
                <div className="flex flex-col gap-1.5">
                  {customKinks.filter((ck) => profile.entries[ck.id]?.status).map((ck) => {
                    const s = profile.entries[ck.id].status!;
                    return (
                      <div
                        key={ck.id}
                        className="rounded-xl px-3 py-2.5"
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderLeft: `4px solid ${STATUS_COLORS[s]}`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm flex-1">{ck.name}</span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded border whitespace-nowrap flex-none"
                            style={{
                              color: STATUS_COLORS[s],
                              borderColor: `color-mix(in srgb, ${STATUS_COLORS[s]} 35%, transparent)`,
                              background: `color-mix(in srgb, ${STATUS_COLORS[s]} 15%, transparent)`,
                            }}
                          >
                            {STATUS_LABELS[s]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Private notes — imported profiles only */}
      {profile.isImported && (
        <div className="px-4 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text2)" }}>
            Persoonlijke notitie
          </p>
          <textarea
            value={profile.privateNote ?? ""}
            onChange={(e) => updatePrivateNote(profile.id, e.target.value)}
            placeholder="Wanneer/waar ontmoet, indrukken…"
            rows={3}
            className="focus-ring w-full text-sm rounded-lg border px-3 py-2 placeholder-[color:var(--text2)] focus:outline-none"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", resize: "none" }}
          />
        </div>
      )}

      {/* Collapsible edit list */}
      {editListOpen && (
        <>
          {/* Edit toolbar: search + compact/hideComments */}
          <div className="px-4 pb-2 flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek een kink…"
              className="focus-ring flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none placeholder-[color:var(--text2)]"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <button
              onClick={() => setHideComments((v) => !v)}
              aria-label={hideComments ? "Toon notities" : "Verberg notities"}
              title={hideComments ? "Toon notities" : "Verberg notities"}
              className="focus-ring p-2 rounded-lg border text-xs flex-none transition-colors"
              style={{
                border: "1px solid var(--border)",
                color: hideComments ? "var(--accent)" : "var(--text2)",
                background: hideComments ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
              }}
            >
              💬
            </button>
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
                onClick={() => { setActiveCategory(cat); scrollToCategory(cat); }}
                className="focus-ring flex-none px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
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

          {/* Search results or full category list */}
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
                        hideComments={hideComments}
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
                        onBulkRestore={(snapshot) => {
                          for (const [kinkId, entry] of Object.entries(snapshot)) {
                            setEntry(profile.id, kinkId, { status: entry.status ?? null });
                          }
                        }}
                        compact={compact}
                        hideComments={hideComments}
                      />
                    </div>
                  );
                })}

                {/* Meer — custom kinks */}
                <div ref={(el) => setSectionRef(el, "Meer")} data-category="Meer" className="mb-3">
                  <button
                    onClick={() => setMeerOpen((v) => !v)}
                    aria-expanded={meerOpen}
                    className="focus-ring w-full flex items-center gap-2 px-3 py-2.5 rounded-lg mb-1"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: "4px solid var(--accent)" }}
                  >
                    {meerOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="font-semibold text-sm flex-1 text-left">Meer</span>
                    <span className="text-xs tabular-nums" style={{ color: "var(--text2)" }}>
                      {customKinks.length} eigen
                    </span>
                  </button>

                  {meerOpen && <div className="flex flex-col pl-1 mb-2">
                    {customKinks.map((ck) => {
                      const ckStatus = profile.entries[ck.id]?.status ?? null;
                      const ckBorderColor = ckStatus ? STATUS_COLORS[ckStatus] : "transparent";
                      return (
                        <div
                          key={ck.id}
                          className="rounded-xl overflow-hidden mb-1 transition-[border-left-color] duration-150"
                          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `4px solid ${ckBorderColor}` }}
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
                          <div className="no-scrollbar flex items-center gap-1 px-3 pb-2.5 overflow-x-auto">
                            {(["willing","yes","maybe","no","hard_no"] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => handleStatus(ck.id, ckStatus === s ? null : s)}
                                aria-pressed={ckStatus === s}
                                className={`focus-ring rounded-full border text-[11px] font-medium transition-colors whitespace-nowrap flex-none px-2.5 py-1.5${ckStatus === s ? ` status-${s}` : ""}`}
                                style={ckStatus !== s ? { color: "var(--text2)", borderColor: "var(--border)" } : {}}
                              >
                                {s === "yes" ? "Ja" : s === "willing" ? "Graag" : s === "maybe" ? "Misschien" : s === "no" ? "Nee" : "Harde grens"}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>}

                  {meerOpen && <form onSubmit={handleAddCustom} className="flex gap-2">
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
                  </form>}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Terug naar boven */}
      <div className="px-4 pb-6 pt-2 flex justify-center">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="focus-ring text-xs px-4 py-2 rounded-full border transition-colors"
          style={{ color: "var(--text2)", borderColor: "var(--border)" }}
        >
          ↑ Terug naar boven
        </button>
      </div>

      <QRModal profile={shareOpen && !profile.isImported ? profile : null} onClose={() => setShareOpen(false)} />
      <BottomNav />

      {/* FAB export — hidden for imported profiles (privacy) */}
      {profile.isImported && (
        <div className="fixed bottom-20 right-4 z-[110] px-3 py-2 rounded-full text-xs" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
          🔒 Geïmporteerd profiel
        </div>
      )}
      {!profile.isImported && (
        <div className="fixed bottom-20 right-4 z-[110] flex flex-col items-end gap-1">
          <span className="text-[10px] font-semibold px-2" style={{ color: "var(--text2)" }}>Exporteer</span>
          <div
            className="focus-ring flex items-center gap-1 rounded-full shadow-lg overflow-hidden"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <button
              onClick={handleExport}
              aria-label="Exporteer lijst als tekstbestand"
              className="px-3 py-3 min-h-[44px] text-sm font-semibold hover:bg-[var(--surface)] transition-colors"
              style={{ color: "var(--text)" }}
            >
              ↓ TXT
            </button>
            <div style={{ width: "1px", background: "var(--border)", alignSelf: "stretch" }} />
            <button
              onClick={handlePDFExport}
              aria-label="Exporteer lijst als PDF"
              className="px-3 py-3 min-h-[44px] text-sm font-semibold hover:bg-[var(--surface)] transition-colors"
              style={{ color: "var(--accent)" }}
            >
              ↓ PDF
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
