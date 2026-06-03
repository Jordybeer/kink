"use client";
import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { KINKS } from "@/lib/kinks";
import type { Profile, SceneItem } from "@/types";
import AftercareSheet from "@/components/AftercareSheet";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface IntensityPillProps {
  value: SceneItem["intensity"];
  active: boolean;
  onSelect: () => void;
}

function IntensityPill({ value, active, onSelect }: IntensityPillProps) {
  const label = value === "zacht" ? "Zacht" : value === "midden" ? "Midden" : "Intens";
  const cssVar = value === "zacht" ? "var(--willing)" : value === "midden" ? "var(--maybe)" : "var(--hard-no)";
  return (
    <button
      onClick={onSelect}
      aria-pressed={active}
      className="text-[10px] px-2 py-1 rounded-full border transition-colors focus-ring"
      style={active
        ? { background: `color-mix(in srgb, ${cssVar} 20%, transparent)`, borderColor: cssVar, color: cssVar }
        : { background: "transparent", borderColor: "var(--border)", color: "var(--text2)" }}
    >
      {label}
    </button>
  );
}

interface SceneItemCardProps {
  item: SceneItem;
  index: number;
  onUpdate: (id: string, patch: Partial<SceneItem>) => void;
  onDelete: (id: string) => void;
  onDragStart: (i: number) => void;
  onDragEnter: (i: number) => void;
  onDragEnd: () => void;
}

function SceneItemCard({ item, index, onUpdate, onDelete, onDragStart, onDragEnter, onDragEnd }: SceneItemCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragEnter={() => onDragEnter(index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className="rounded-xl p-3 mb-2 flex items-start gap-3"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <span className="text-lg leading-none pt-1 cursor-grab select-none flex-none" style={{ color: "var(--text2)" }} aria-hidden="true">⠿</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium flex-1 truncate">{item.name}</span>
          <button onClick={() => onDelete(item.id)} aria-label={`${item.name} verwijderen`} className="text-xs px-1.5 py-0.5 rounded transition-colors focus-ring flex-none" style={{ color: "var(--text2)" }}>✕</button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["zacht", "midden", "intens"] as const).map((v) => (
            <IntensityPill key={v} value={v} active={item.intensity === v} onSelect={() => onUpdate(item.id, { intensity: v })} />
          ))}
          <button onClick={() => setDetailsOpen((o) => !o)} aria-label={detailsOpen ? "Details verbergen" : "Details tonen"} aria-expanded={detailsOpen} className="text-xs ml-1 transition-opacity hover:opacity-70 focus-ring" style={{ color: "var(--text2)" }}>📝</button>
        </div>
        <div className={`accordion-content mt-2 ${detailsOpen ? "open" : ""}`}>
          <div className="accordion-inner space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-xs flex-none" style={{ color: "var(--text2)" }}>Duur:</label>
              <input type="text" value={item.duration} onChange={(e) => onUpdate(item.id, { duration: e.target.value })} placeholder="~20 min" className="flex-1 text-xs rounded px-2 py-1 focus:outline-none focus-ring" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </div>
            <textarea rows={2} value={item.note} onChange={(e) => onUpdate(item.id, { note: e.target.value })} placeholder="Notitie…" className="w-full text-xs rounded px-2 py-1.5 focus:outline-none resize-none focus-ring" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScenePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profiles, scenes, saveScene, deleteScene, completeScene } = useStore();
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

  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const resolvedAId = sceneId ? (scenes.find(s => s.id === sceneId)?.profileAId ?? aId) : aId;
  const resolvedBId = sceneId ? (scenes.find(s => s.id === sceneId)?.profileBId ?? bId) : bId;
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

  // Auto-add matches on new scene
  useEffect(() => {
    if (!_hasHydrated || sceneIdParam || !profileA || !profileB) return;
    const toAdd = KINKS.filter((k) => {
      const a = profileA.entries[k.id]?.status ?? null;
      const b = profileB.entries[k.id]?.status ?? null;
      return !!a && !!b && (a === "yes" || a === "willing") && (b === "yes" || b === "willing");
    });
    setItems(toAdd.map((k) => ({ id: uid(), name: k.name, kinkId: k.id, intensity: "midden" as const, duration: "", note: "", fromKink: true })));
  }, [_hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragStart = useCallback((i: number) => { dragItem.current = i; }, []);
  const handleDragEnter = useCallback((i: number) => { dragOver.current = i; }, []);
  const handleDragEnd = useCallback(() => {
    if (dragItem.current === null || dragOver.current === null) return;
    const updated = [...items];
    const dragged = updated.splice(dragItem.current, 1)[0];
    updated.splice(dragOver.current, 0, dragged);
    setItems(updated);
    dragItem.current = null;
    dragOver.current = null;
  }, [items]);

  const handleUpdate = useCallback((id: string, patch: Partial<SceneItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  function addFromKink(kinkName: string, kinkId: string) {
    setItems((prev) => [...prev, { id: uid(), name: kinkName, kinkId, intensity: "midden", duration: "", note: "", fromKink: true }]);
  }

  function addMaybes() {
    if (!profileA || !profileB) return;
    const addedKinkIds = new Set(items.map((it) => it.kinkId).filter(Boolean));
    const maybes = KINKS.filter((k) => {
      if (addedKinkIds.has(k.id)) return false;
      const a = profileA.entries[k.id]?.status ?? null;
      const b = profileB.entries[k.id]?.status ?? null;
      if (!a || !b) return false;
      if (a === "hard_no" || b === "hard_no" || a === "no" || b === "no") return false;
      return a === "maybe" || b === "maybe";
    });
    setItems((prev) => [...prev, ...maybes.map((k) => ({ id: uid(), name: k.name, kinkId: k.id, intensity: "midden" as const, duration: "", note: "", fromKink: true }))]);
  }

  function addManualItem() {
    const name = newItemName.trim();
    if (!name) return;
    setItems((prev) => [...prev, { id: uid(), name, intensity: "midden", duration: "", note: "", fromKink: false }]);
    setNewItemName("");
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
    const title = sceneTitle.trim() || (profileA && profileB ? `${profileA.name} & ${profileB.name}` : "Scène Menu");
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
      const intensityColour: [number, number, number] =
        item.intensity === "zacht" ? [96, 165, 250] : item.intensity === "midden" ? [251, 146, 60] : [248, 113, 113];
      doc.setFillColor(...intensityColour);
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

    const filename = `scene-${(sceneTitle || "menu").replace(/\s+/g, "-").toLowerCase()}.pdf`;
    try { doc.save(filename); } catch { /* niet fataal */ }
  }

  if (!_hasHydrated) return null;

  const currentScene = sceneId ? scenes.find((s) => s.id === sceneId) : null;
  const isCompleted = currentScene?.status === "completed";
  const backHref = aId && bId ? `/compare?a=${aId}&b=${bId}` : sceneId ? "/scenes" : "/compare";
  const addedKinkIds = new Set(items.map((it) => it.kinkId).filter(Boolean));

  // Top 5 most used kinks from profileA
  const topKinks = profileA
    ? KINKS
        .filter((k) => (profileA.entries[k.id]?.usedInScene ?? 0) > 0)
        .sort((a, b) => (profileB?.entries[b.id]?.usedInScene ?? 0) + (profileA.entries[b.id]?.usedInScene ?? 0) - ((profileB?.entries[a.id]?.usedInScene ?? 0) + (profileA.entries[a.id]?.usedInScene ?? 0)))
        .slice(0, 5)
    : [];

  const matchedKinks = KINKS.filter((k) => {
    const a = profileA?.entries[k.id]?.status ?? null;
    const b = profileB?.entries[k.id]?.status ?? null;
    return !!a && !!b && (a === "yes" || a === "willing") && (b === "yes" || b === "willing");
  });

  const hasMaybes = profileA && profileB && KINKS.some((k) => {
    if (addedKinkIds.has(k.id)) return false;
    const a = profileA.entries[k.id]?.status ?? null;
    const b = profileB.entries[k.id]?.status ?? null;
    if (!a || !b || a === "hard_no" || b === "hard_no" || a === "no" || b === "no") return false;
    return a === "maybe" || b === "maybe";
  });

  return (
    <>
      <main className="max-w-2xl mx-auto px-4 py-6 pb-40 w-full flex flex-col min-h-dvh">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Link href={backHref} className="focus-ring text-sm transition-colors min-h-[44px] inline-flex items-center" style={{ color: "var(--text2)" }}>← Terug</Link>
          <div className="flex-1">
            <input
              type="text"
              value={sceneTitle}
              onChange={(e) => setSceneTitle(e.target.value)}
              placeholder={profileA && profileB ? `${profileA.name} & ${profileB.name}` : "Scène titel…"}
              className="text-xl font-bold w-full bg-transparent focus:outline-none focus-ring rounded"
              style={{ color: "var(--text)" }}
            />
            {profileA && profileB && (
              <p className="text-sm mt-0.5" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {profileA.name} &amp; {profileB.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs flex-none" style={{ color: "var(--text2)" }}>Datum:</label>
            <input type="date" value={sceneDate} onChange={(e) => setSceneDate(e.target.value)} className="text-xs rounded px-2 py-1 focus:outline-none focus-ring" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)", colorScheme: "dark" }} />
          </div>
        </div>

        {/* Scene items */}
        <div className="flex-1 flex flex-col">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center select-none">
              <div className="text-3xl mb-3">🎯</div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Nog geen activiteiten gepland</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>Tik op een chip hieronder om<br />toe te voegen aan de scène</p>
            </div>
          ) : (
            <div>
              {items.map((item, i) => (
                <SceneItemCard key={item.id} item={item} index={i} onUpdate={handleUpdate} onDelete={handleDelete} onDragStart={handleDragStart} onDragEnter={handleDragEnter} onDragEnd={handleDragEnd} />
              ))}
            </div>
          )}
        </div>

        {/* Manual add */}
        <div className="flex gap-2 mt-3 mb-6">
          <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addManualItem(); }} placeholder="Eigen item toevoegen…" className="flex-1 text-sm rounded-lg px-3 py-2 focus:outline-none focus-ring" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
          <button onClick={addManualItem} aria-label="Item toevoegen" className="px-4 py-2 rounded-lg text-sm font-bold transition-opacity hover:opacity-90 focus-ring" style={{ background: "var(--accent)", color: "#000" }}>+</button>
        </div>

        {/* Top 5 meest gebruikt */}
        {topKinks.length > 0 && (
          <div className="rounded-xl p-4 mb-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent2)" }}>Meest gebruikt</p>
            <div className="flex flex-wrap gap-1.5">
              {topKinks.map((k) => (
                <button key={k.id} onClick={() => addFromKink(k.name, k.id)} disabled={addedKinkIds.has(k.id)} className="text-[11px] px-2.5 py-1 rounded-full border transition-all focus-ring disabled:opacity-40" style={{ background: `color-mix(in srgb, var(--accent2) 12%, transparent)`, borderColor: `color-mix(in srgb, var(--accent2) 40%, transparent)`, color: "var(--accent2)" }}>
                  {k.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Matches quick-add */}
        {matchedKinks.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent)" }}>Jullie matches</p>
              {hasMaybes && (
                <button onClick={addMaybes} className="text-xs px-2.5 py-1 rounded-full border transition-colors focus-ring" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>+ Maybes toevoegen</button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchedKinks.map((k) => (
                <button key={k.id} onClick={() => addFromKink(k.name, k.id)} disabled={addedKinkIds.has(k.id)} className="text-[11px] px-2.5 py-1 rounded-full border transition-all focus-ring disabled:opacity-40" style={addedKinkIds.has(k.id) ? { background: "transparent", borderColor: "var(--border)", color: "var(--text2)" } : { background: `color-mix(in srgb, var(--accent) 12%, transparent)`, borderColor: `color-mix(in srgb, var(--accent) 40%, transparent)`, color: "var(--accent)" }}>
                  {k.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex gap-2 px-4 py-3 max-w-2xl mx-auto" style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
        <button onClick={handleExport} disabled={items.length === 0} className="px-4 py-2.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 focus-ring disabled:opacity-40" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>↓ PDF</button>
        {!isCompleted && (
          <>
            <button onClick={() => handleSave("draft")} disabled={items.length === 0} className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 focus-ring disabled:opacity-40" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
              {saved ? "✓ Opgeslagen" : "💾 Opslaan"}
            </button>
            <button onClick={() => handleSave("planned")} disabled={items.length === 0} className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 focus-ring disabled:opacity-40" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>📅 Plannen</button>
            {sceneId && (
              <button onClick={() => setShowAftercareSheet(true)} className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 focus-ring" style={{ background: "var(--accent)", color: "#000" }}>✅ Afronden</button>
            )}
          </>
        )}
        {isCompleted && (
          <div className="flex-1 flex items-center justify-center gap-2 text-xs" style={{ color: "var(--text2)" }}>
            <span>{currentScene?.aftercare?.trafficLight === "green" ? "🟢" : currentScene?.aftercare?.trafficLight === "amber" ? "🟡" : "🔴"}</span>
            <span>Afgerond</span>
            <Link href="/scenes" className="underline focus-ring" style={{ color: "var(--accent)" }}>Bekijk historiek</Link>
          </div>
        )}
      </div>

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
