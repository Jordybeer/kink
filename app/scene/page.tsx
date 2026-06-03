"use client";
import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { KINKS } from "@/lib/kinks";
import type { Profile, SceneItem } from "@/types";
import AftercareSheet from "@/components/AftercareSheet";
import Sheet from "@/components/Sheet";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Arc bar ────────────────────────────────────────────────────────────────

function SceneArcBar({ items }: { items: SceneItem[] }) {
  if (items.length === 0) return null;
  const counts = { zacht: 0, midden: 0, intens: 0 };
  for (const it of items) counts[it.intensity]++;
  const total = items.length;
  const segments = [
    { key: "zacht"  as const, color: "var(--willing)", flex: counts.zacht  / total },
    { key: "midden" as const, color: "var(--maybe)",   flex: counts.midden / total },
    { key: "intens" as const, color: "var(--hard-no)", flex: counts.intens / total },
  ].filter((s) => s.flex > 0);

  return (
    <div
      className="flex rounded-full overflow-hidden"
      style={{ height: 4, gap: 2 }}
      role="img"
      aria-label={`Energie-arc: ${counts.zacht} zacht, ${counts.midden} midden, ${counts.intens} intens`}
    >
      {segments.map((s) => (
        <div
          key={s.key}
          className="scene-arc-segment rounded-full"
          style={{ flex: s.flex, background: s.color, opacity: 0.75 }}
        />
      ))}
    </div>
  );
}

// ─── Intensity accent bar ────────────────────────────────────────────────────

function intensityColor(v: SceneItem["intensity"]) {
  return v === "zacht" ? "var(--willing)" : v === "midden" ? "var(--maybe)" : "var(--hard-no)";
}

// ─── Scene item (normal mode) ────────────────────────────────────────────────

interface SceneItemRowProps {
  item: SceneItem;
  index: number;
  reorderMode: boolean;
  totalItems: number;
  onUpdate: (id: string, patch: Partial<SceneItem>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (i: number) => void;
  onMoveDown: (i: number) => void;
  longPressHandlers: (index: number) => {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
  };
}

function SceneItemRow({
  item, index, reorderMode, totalItems,
  onUpdate, onDelete, onMoveUp, onMoveDown,
  longPressHandlers,
}: SceneItemRowProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const lph = longPressHandlers(index);
  const color = intensityColor(item.intensity);

  return (
    <div
      className="scene-item-reorder flex items-stretch rounded-xl mb-2 overflow-hidden ks-slide-up"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        animationDelay: `${index * 35}ms`,
      }}
    >
      {/* Intensity accent bar */}
      <div
        style={{ width: 3, background: color, flexShrink: 0, transition: "background 120ms ease" }}
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0 p-3">
        {/* Row 1: name + actions */}
        <div className="flex items-center gap-2 mb-2">
          {/* Long-press handle (normal mode) / hidden in reorder */}
          {!reorderMode && (
            <button
              {...lph}
              aria-label="Ingedrukt houden om te herordenen"
              className="flex-none focus-ring rounded p-1 touch-manipulation"
              style={{ color: "var(--text2)", minWidth: 28, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
                <rect y="1"  width="12" height="2" rx="1" fill="currentColor"/>
                <rect y="7"  width="12" height="2" rx="1" fill="currentColor"/>
                <rect y="13" width="12" height="2" rx="1" fill="currentColor"/>
              </svg>
            </button>
          )}

          <span className="text-sm font-medium flex-1 truncate" style={{ color: "var(--text)" }}>
            {item.name}
          </span>

          {reorderMode ? (
            <div className="flex gap-1">
              <button
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                aria-label="Omhoog"
                className="focus-ring rounded-lg disabled:opacity-30"
                style={{ minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface2)", color: "var(--text2)" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={() => onMoveDown(index)}
                disabled={index === totalItems - 1}
                aria-label="Omlaag"
                className="focus-ring rounded-lg disabled:opacity-30"
                style={{ minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface2)", color: "var(--text2)" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 3v8M3 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onDelete(item.id)}
              aria-label={`${item.name} verwijderen`}
              className="focus-ring rounded-lg flex-none"
              style={{ minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Row 2: intensity selector */}
        {!reorderMode && (
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {(["zacht", "midden", "intens"] as const).map((v) => {
              const active = item.intensity === v;
              const c = intensityColor(v);
              return (
                <button
                  key={v}
                  onClick={() => onUpdate(item.id, { intensity: v })}
                  aria-pressed={active}
                  className="text-xs px-3 rounded-full border focus-ring"
                  style={{
                    minHeight: 28,
                    transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
                    background: active ? `color-mix(in srgb, ${c} 20%, transparent)` : "transparent",
                    borderColor: active ? c : "var(--border)",
                    color: active ? c : "var(--text2)",
                  }}
                >
                  {v === "zacht" ? "Zacht" : v === "midden" ? "Midden" : "Intens"}
                </button>
              );
            })}

            <button
              onClick={() => setDetailsOpen((o) => !o)}
              aria-label={detailsOpen ? "Details verbergen" : "Duur & notitie"}
              aria-expanded={detailsOpen}
              className="text-xs ml-auto focus-ring rounded px-2"
              style={{ minHeight: 28, color: detailsOpen ? "var(--accent)" : "var(--text2)" }}
            >
              {detailsOpen ? "Minder" : "Details"}
            </button>
          </div>
        )}

        {/* Accordion: duration + note */}
        <div className={`accordion-content ${detailsOpen && !reorderMode ? "open" : ""}`}>
          <div className="accordion-inner space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <label className="text-xs flex-none" style={{ color: "var(--text2)", minWidth: 32 }}>Duur</label>
              <input
                type="text"
                value={item.duration}
                onChange={(e) => onUpdate(item.id, { duration: e.target.value })}
                placeholder="~20 min"
                className="flex-1 rounded-lg px-3 py-1.5 focus:outline-none focus-ring"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14 }}
              />
            </div>
            <textarea
              rows={2}
              value={item.note}
              onChange={(e) => onUpdate(item.id, { note: e.target.value })}
              placeholder="Notitie…"
              className="w-full rounded-lg px-3 py-2 focus:outline-none resize-none focus-ring"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Kink chip ───────────────────────────────────────────────────────────────

function KinkChip({
  name, added, color, onAdd,
}: { name: string; added: boolean; color: string; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      disabled={added}
      className="text-xs px-3 py-1.5 rounded-full border focus-ring disabled:opacity-40 flex items-center gap-1"
      style={{
        transition: "background 120ms, border-color 120ms, color 120ms",
        background: added ? "transparent" : `color-mix(in srgb, ${color} 12%, transparent)`,
        borderColor: added ? "var(--border)" : `color-mix(in srgb, ${color} 45%, transparent)`,
        color: added ? "var(--text2)" : color,
        minHeight: 36,
      }}
    >
      {!added && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
      {name}
    </button>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

function ScenePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profiles, scenes, saveScene, completeScene } = useStore();
  const _hasHydrated = useHasHydrated();

  const sceneIdParam = searchParams.get("id");
  const aId = searchParams.get("a") ?? "";
  const bId = searchParams.get("b") ?? "";

  const [sceneId, setSceneId] = useState<string | null>(sceneIdParam);
  const [items, setItems] = useState<SceneItem[]>([]);
  const [sceneDate, setSceneDate] = useState("");
  const [sceneTitle, setSceneTitle] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [showAftercareSheet, setShowAftercareSheet] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Long-press timer
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedAId = sceneId ? (scenes.find((s) => s.id === sceneId)?.profileAId ?? aId) : aId;
  const resolvedBId = sceneId ? (scenes.find((s) => s.id === sceneId)?.profileBId ?? bId) : bId;
  const profileA: Profile | undefined = profiles.find((p) => p.id === resolvedAId);
  const profileB: Profile | undefined = profiles.find((p) => p.id === resolvedBId);

  // Load existing scene
  useEffect(() => {
    if (!_hasHydrated || !sceneIdParam) return;
    const scene = scenes.find((s) => s.id === sceneIdParam);
    if (!scene) return;
    setItems(scene.items);
    setSceneDate(scene.plannedDate ?? "");
    setSceneTitle(scene.title);
    setSaved(true);
  }, [_hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdate = useCallback((id: string, patch: Partial<SceneItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    setSaved(false);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSaved(false);
  }, []);

  const handleMoveUp = useCallback((i: number) => {
    if (i === 0) return;
    setItems((prev) => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
    setSaved(false);
  }, []);

  const handleMoveDown = useCallback((i: number) => {
    setItems((prev) => {
      if (i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
    setSaved(false);
  }, []);

  const longPressHandlers = useCallback((index: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      longPressTimer.current = setTimeout(() => {
        setReorderMode(true);
      }, 300);
    },
    onPointerUp: () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    },
    onPointerLeave: () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    },
  }), []);

  function addFromKink(kinkName: string, kinkId: string) {
    setItems((prev) => [...prev, { id: uid(), name: kinkName, kinkId, intensity: "midden", duration: "", note: "", fromKink: true }]);
    setSaved(false);
  }

  function addManualItem() {
    const name = newItemName.trim();
    if (!name) return;
    setItems((prev) => [...prev, { id: uid(), name, intensity: "midden", duration: "", note: "", fromKink: false }]);
    setNewItemName("");
    setSaved(false);
  }

  function handleSave(status: "draft" | "planned") {
    if (!profileA || !profileB) return;
    const title = sceneTitle.trim() || `${profileA.name} & ${profileB.name}`;
    const id = saveScene({
      id: sceneId ?? undefined,
      title,
      profileAId: profileA.id,
      profileBId: profileB.id,
      profileAName: profileA.name,
      profileBName: profileB.name,
      items,
      plannedDate: sceneDate || undefined,
      status,
    });
    setSceneId(id);
    setSaved(true);
    router.replace(`/scene?id=${id}`);
  }

  async function handleExport() {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a5" });
    const W = 148;
    const margin = 15;
    let y = 18;

    const dark: [number, number, number] = [20, 18, 28];
    const accent: [number, number, number] = [192, 132, 252];
    const muted: [number, number, number] = [120, 110, 160];
    const light: [number, number, number] = [220, 215, 240];

    doc.setFillColor(...dark);
    doc.rect(0, 0, W, 210, "F");
    doc.setTextColor(...accent);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const title = sceneTitle.trim() || (profileA && profileB ? `${profileA.name} & ${profileB.name}` : "Scène");
    doc.text(title, margin, y);
    y += 8;

    if (sceneDate) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...muted);
      doc.text(sceneDate, margin, y);
      y += 7;
    }

    doc.setDrawColor(...accent);
    doc.setLineWidth(0.3);
    doc.line(margin, y, W - margin, y);
    y += 6;

    for (const item of items) {
      if (y > 185) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 210, "F"); y = 15; }
      const ic: [number, number, number] = item.intensity === "zacht" ? [96, 165, 250] : item.intensity === "midden" ? [251, 146, 60] : [248, 113, 113];
      doc.setFillColor(...ic);
      doc.roundedRect(margin, y - 3.5, 3, 3, 0.5, 0.5, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...light);
      doc.text(item.name, margin + 5, y);
      if (item.duration) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...muted);
        doc.text(item.duration, W - margin, y, { align: "right" });
      }
      y += 5;
      if (item.note) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...muted);
        const lines = doc.splitTextToSize(item.note, W - margin * 2 - 5) as string[];
        doc.text(lines, margin + 5, y);
        y += lines.length * 4 + 1;
      }
      y += 3;
    }

    try { doc.save(`scene-${(sceneTitle || "menu").replace(/\s+/g, "-").toLowerCase()}.pdf`); } catch { /* niet fataal */ }
  }

  if (!_hasHydrated) return null;

  const currentScene = sceneId ? scenes.find((s) => s.id === sceneId) : null;
  const isCompleted = currentScene?.status === "completed";
  const backHref = aId && bId ? `/compare?a=${aId}&b=${bId}` : sceneId ? "/scenes" : "/compare";
  const addedKinkIds = new Set(items.map((it) => it.kinkId).filter(Boolean));

  const topKinks = profileA
    ? KINKS.filter((k) => (profileA.entries[k.id]?.usedInScene ?? 0) > 0)
        .sort((a, b) =>
          ((profileB?.entries[b.id]?.usedInScene ?? 0) + (profileA.entries[b.id]?.usedInScene ?? 0)) -
          ((profileB?.entries[a.id]?.usedInScene ?? 0) + (profileA.entries[a.id]?.usedInScene ?? 0)))
        .slice(0, 5)
    : [];

  const mutualKinks = KINKS.filter((k) => {
    const a = profileA?.entries[k.id]?.status ?? null;
    const b = profileB?.entries[k.id]?.status ?? null;
    return !!a && !!b && (a === "yes" || a === "willing") && (b === "yes" || b === "willing");
  });

  const spanningKinks = KINKS.filter((k) => {
    const a = profileA?.entries[k.id]?.status ?? null;
    const b = profileB?.entries[k.id]?.status ?? null;
    if (!a || !b || a === "hard_no" || b === "hard_no" || a === "no" || b === "no") return false;
    return !((a === "yes" || a === "willing") && (b === "yes" || b === "willing")) && (a === "maybe" || b === "maybe");
  });

  const hasKinks = mutualKinks.length > 0 || spanningKinks.length > 0 || topKinks.length > 0;

  return (
    <>
      <main className="max-w-2xl mx-auto px-4 w-full flex flex-col" style={{ paddingTop: 20, paddingBottom: 120, minHeight: "100dvh" }}>

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Link
            href={backHref}
            className="focus-ring rounded-lg flex-none"
            style={{ minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", color: "var(--text2)", fontSize: 13 }}
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={sceneTitle}
              onChange={(e) => { setSceneTitle(e.target.value); setSaved(false); }}
              placeholder={profileA && profileB ? `${profileA.name} & ${profileB.name}` : "Scène…"}
              className="w-full bg-transparent focus:outline-none focus-ring rounded font-bold"
              style={{ color: "var(--text)", fontSize: 18 }}
            />
            {profileA && profileB && (
              <p className="text-xs truncate mt-0.5" style={{ color: "var(--text2)" }}>
                {profileA.name} &amp; {profileB.name}
              </p>
            )}
          </div>
          <input
            type="date"
            value={sceneDate}
            onChange={(e) => { setSceneDate(e.target.value); setSaved(false); }}
            className="focus:outline-none focus-ring rounded-lg px-2"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)", fontSize: 12, height: 36, colorScheme: "dark" }}
          />
        </div>

        {/* Arc bar */}
        <div className="mb-4">
          <SceneArcBar items={items} />
        </div>

        {/* Reorder mode banner */}
        {reorderMode && (
          <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl ks-slide-up" style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid var(--border-accent)" }}>
            <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>Herordenen</span>
            <button
              onClick={() => setReorderMode(false)}
              className="text-xs font-bold focus-ring rounded-lg px-3 py-1"
              style={{ background: "var(--accent)", color: "#000", minHeight: 32 }}
            >
              Klaar
            </button>
          </div>
        )}

        {/* Items list */}
        <div className="flex-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 select-none ks-fade-in">
              <div className="mb-4" style={{ opacity: 0.35 }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <rect x="8" y="12" width="32" height="4" rx="2" fill="var(--text2)"/>
                  <rect x="8" y="22" width="24" height="4" rx="2" fill="var(--text2)"/>
                  <rect x="8" y="32" width="20" height="4" rx="2" fill="var(--text2)"/>
                  <circle cx="38" cy="34" r="8" fill="var(--accent)" opacity="0.7"/>
                  <path d="M35 34h6M38 31v6" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Lege setlist</p>
              <p className="text-xs" style={{ color: "var(--text2)" }}>Tik op + om kinks of eigen items toe te voegen</p>
            </div>
          ) : (
            <div>
              {items.map((item, i) => (
                <SceneItemRow
                  key={item.id}
                  item={item}
                  index={i}
                  reorderMode={reorderMode}
                  totalItems={items.length}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  longPressHandlers={longPressHandlers}
                />
              ))}
            </div>
          )}
        </div>

        {/* Manual add input */}
        <div className="flex gap-2 mt-4">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addManualItem(); }}
            placeholder="Eigen item…"
            className="flex-1 rounded-xl px-3 focus:outline-none focus-ring"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 15, height: 44 }}
          />
          <button
            onClick={addManualItem}
            aria-label="Item toevoegen"
            className="rounded-xl font-bold focus-ring"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)", minWidth: 44, height: 44, fontSize: 20 }}
          >
            +
          </button>
        </div>
      </main>

      {/* ── Fixed action bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{ background: "var(--bg)", borderTop: "1px solid var(--border)", padding: "10px 16px", paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-2xl mx-auto flex gap-2">
          {/* PDF */}
          <button
            onClick={handleExport}
            disabled={items.length === 0}
            className="focus-ring rounded-xl text-xs font-bold disabled:opacity-40"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)", minWidth: 52, height: 44, padding: "0 12px" }}
            aria-label="Exporteer als PDF"
          >
            PDF
          </button>

          {/* Add kinks drawer trigger */}
          {hasKinks && !reorderMode && !isCompleted && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="focus-ring rounded-xl text-xs font-bold"
              style={{ background: "var(--surface)", border: `1px solid var(--border-accent)`, color: "var(--accent)", minWidth: 44, height: 44, padding: "0 12px" }}
              aria-label="Kinks toevoegen"
            >
              + Kinks
            </button>
          )}

          {!isCompleted && (
            <>
              <button
                onClick={() => handleSave("draft")}
                disabled={items.length === 0}
                className="focus-ring rounded-xl text-xs font-bold disabled:opacity-40"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: saved ? "var(--accent)" : "var(--text)", height: 44, padding: "0 12px" }}
              >
                {saved ? "Opgeslagen ✓" : "Opslaan"}
              </button>
              <button
                onClick={() => handleSave("planned")}
                disabled={items.length === 0}
                className="focus-ring rounded-xl text-xs font-bold disabled:opacity-40"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", height: 44, padding: "0 12px" }}
              >
                Plannen
              </button>
            </>
          )}

          {/* Afronden — always visible when scene is saved and not yet completed */}
          {sceneId && !isCompleted && (
            <button
              onClick={() => setShowAftercareSheet(true)}
              className="flex-1 focus-ring rounded-xl text-sm font-bold"
              style={{ background: "var(--accent)", color: "#000", height: 44 }}
            >
              ✓ Afronden
            </button>
          )}

          {isCompleted && sceneId && (
            <Link
              href={`/scenes/${sceneId}`}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl text-sm font-bold focus-ring"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", height: 44 }}
            >
              {currentScene?.aftercare?.trafficLight === "green" ? "🟢" : currentScene?.aftercare?.trafficLight === "amber" ? "🟡" : "🔴"}
              {" "}Aftercare bekijken
            </Link>
          )}
        </div>
      </div>

      {/* ── Kink drawer (Sheet) ── */}
      <Sheet open={drawerOpen} onClose={() => setDrawerOpen(false)} aria-label="Kinks toevoegen">
        <div className="rounded-t-2xl px-4 pt-5 pb-8" style={{ background: "var(--surface)", maxHeight: "70vh", overflowY: "auto" }}>
          {/* Drag handle */}
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border)" }} aria-hidden="true" />

          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>Toevoegen aan setlist</h2>
            <button onClick={() => setDrawerOpen(false)} className="focus-ring rounded-lg" style={{ minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }} aria-label="Sluiten">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Top 5 */}
          {topKinks.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent2)" }}>Meest gebruikt</p>
              <div className="flex flex-wrap gap-2">
                {topKinks.map((k) => (
                  <KinkChip key={k.id} name={k.name} added={addedKinkIds.has(k.id)} color="var(--accent2)" onAdd={() => addFromKink(k.name, k.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Mutual */}
          {mutualKinks.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--yes)" }}>Mutual</p>
              <div className="flex flex-wrap gap-2">
                {mutualKinks.map((k) => (
                  <KinkChip key={k.id} name={k.name} added={addedKinkIds.has(k.id)} color="var(--yes)" onAdd={() => addFromKink(k.name, k.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Spanning */}
          {spanningKinks.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--no)" }}>Spanning</p>
              <div className="flex flex-wrap gap-2">
                {spanningKinks.map((k) => (
                  <KinkChip key={k.id} name={k.name} added={addedKinkIds.has(k.id)} color="var(--no)" onAdd={() => addFromKink(k.name, k.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </Sheet>

      {/* ── Aftercare sheet ── */}
      {showAftercareSheet && sceneId && (
        <AftercareSheet
          onSave={(entry) => {
            completeScene(sceneId, entry);
            setShowAftercareSheet(false);
          }}
          onClose={() => setShowAftercareSheet(false)}
        />
      )}
    </>
  );
}

export default function SceneSuspense() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm" style={{ color: "var(--text2)" }}>Laden…</div>}>
      <ScenePage />
    </Suspense>
  );
}
