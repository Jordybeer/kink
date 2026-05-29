"use client";
import { useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { KINKS } from "@/lib/kinks";
import type { Profile } from "@/types";

interface SceneItem {
  id: string;
  name: string;
  intensity: "zacht" | "midden" | "intens";
  duration: string;
  note: string;
  fromKink: boolean;
}

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
      style={
        active
          ? {
              background: `color-mix(in srgb, ${cssVar} 20%, transparent)`,
              borderColor: cssVar,
              color: cssVar,
            }
          : {
              background: "transparent",
              borderColor: "var(--border)",
              color: "var(--text2)",
            }
      }
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

function SceneItemCard({
  item,
  index,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: SceneItemCardProps) {
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
      {/* Drag handle */}
      <span
        className="text-lg leading-none pt-1 cursor-grab select-none flex-none"
        style={{ color: "var(--text2)" }}
        aria-hidden="true"
      >
        ⠿
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: name + delete */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium flex-1 truncate">{item.name}</span>
          <button
            onClick={() => onDelete(item.id)}
            aria-label={`${item.name} verwijderen`}
            className="text-xs px-1.5 py-0.5 rounded transition-colors focus-ring flex-none"
            style={{ color: "var(--text2)" }}
          >
            ✕
          </button>
        </div>

        {/* Row 2: intensity pills + details toggle */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["zacht", "midden", "intens"] as const).map((v) => (
            <IntensityPill
              key={v}
              value={v}
              active={item.intensity === v}
              onSelect={() => onUpdate(item.id, { intensity: v })}
            />
          ))}
          <button
            onClick={() => setDetailsOpen((o) => !o)}
            aria-label={detailsOpen ? "Details verbergen" : "Details tonen"}
            aria-expanded={detailsOpen}
            className="text-xs ml-1 transition-opacity hover:opacity-70 focus-ring"
            style={{ color: "var(--text2)" }}
          >
            📝
          </button>
        </div>

        {/* Row 3: collapsible details */}
        <div className={`accordion-content mt-2 ${detailsOpen ? "open" : ""}`}>
          <div className="accordion-inner space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-xs flex-none" style={{ color: "var(--text2)" }}>
                Duur:
              </label>
              <input
                type="text"
                value={item.duration}
                onChange={(e) => onUpdate(item.id, { duration: e.target.value })}
                placeholder="~20 min"
                className="flex-1 text-xs rounded px-2 py-1 focus:outline-none focus-ring"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>
            <textarea
              rows={2}
              value={item.note}
              onChange={(e) => onUpdate(item.id, { note: e.target.value })}
              placeholder="Notitie…"
              className="w-full text-xs rounded px-2 py-1.5 focus:outline-none resize-none focus-ring"
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScenePage() {
  const searchParams = useSearchParams();
  const { profiles } = useStore();
  const _hasHydrated = useHasHydrated();

  const aId = searchParams.get("a") ?? "";
  const bId = searchParams.get("b") ?? "";

  const profileA: Profile | undefined = profiles.find((p) => p.id === aId);
  const profileB: Profile | undefined = profiles.find((p) => p.id === bId);

  const [items, setItems] = useState<SceneItem[]>([]);
  const [sceneDate, setSceneDate] = useState("");
  const [newItemName, setNewItemName] = useState("");

  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const matchedKinks = KINKS.filter((k) => {
    const a = profileA?.entries[k.id]?.status ?? null;
    const b = profileB?.entries[k.id]?.status ?? null;
    return !!a && !!b && (a === "yes" || a === "willing") && (b === "yes" || b === "willing");
  });

  const handleDragStart = useCallback((i: number) => {
    dragItem.current = i;
  }, []);

  const handleDragEnter = useCallback((i: number) => {
    dragOver.current = i;
  }, []);

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

  function addFromKink(kinkName: string) {
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        name: kinkName,
        intensity: "midden",
        duration: "",
        note: "",
        fromKink: true,
      },
    ]);
  }

  function addManualItem() {
    const name = newItemName.trim();
    if (!name) return;
    setItems((prev) => [
      ...prev,
      { id: uid(), name, intensity: "midden", duration: "", note: "", fromKink: false },
    ]);
    setNewItemName("");
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

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...accent);
    doc.text("Scène Menu", W / 2, y, { align: "center" });
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    const subtitle =
      profileA && profileB ? `${profileA.name} & ${profileB.name}` : "KinkSync";
    doc.text(subtitle, W / 2, y, { align: "center" });
    y += 4;
    if (sceneDate) {
      doc.text(sceneDate, W / 2, y, { align: "center" });
      y += 4;
    }
    doc.text("kinksync.be", W / 2, y, { align: "center" });
    y += 5;

    doc.setDrawColor(...accent);
    doc.setLineWidth(0.3);
    doc.line(margin, y, W - margin, y);
    y += 6;

    const intensityColors: Record<string, [number, number, number]> = {
      zacht: [96, 165, 250],
      midden: [251, 191, 36],
      intens: [239, 68, 68],
    };

    items.forEach((item, i) => {
      if (y > 185) {
        doc.addPage();
        doc.setFillColor(...dark);
        doc.rect(0, 0, W, 210, "F");
        y = 15;
      }
      const color = intensityColors[item.intensity];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...light);
      doc.text(`${i + 1}. ${item.name}`, margin, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...color);
      const meta = [item.intensity, item.duration].filter(Boolean).join(" · ");
      if (meta) {
        doc.text(meta, margin, y + 4);
      }

      if (item.note) {
        doc.setTextColor(...muted);
        doc.setFontSize(8);
        const noteLines = doc.splitTextToSize(item.note, W - margin * 2 - 5);
        doc.text(noteLines, margin + 2, y + (meta ? 8 : 4));
        y += noteLines.length * 4;
      }
      y += meta ? 10 : 6;
    });

    if (y < 175) {
      y = 180;
      doc.setDrawColor(...muted);
      doc.setLineWidth(0.2);
      const sigW = (W - margin * 2 - 10) / 2;
      doc.line(margin, y, margin + sigW, y);
      doc.line(margin + sigW + 10, y, W - margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      const nameA = profileA?.name ?? "Persoon A";
      const nameB = profileB?.name ?? "Persoon B";
      doc.text(nameA, margin + sigW / 2, y, { align: "center" });
      doc.text(nameB, margin + sigW + 10 + sigW / 2, y, { align: "center" });
    }

    doc.save(`scene-${profileA?.name ?? "scene"}-${profileB?.name ?? ""}.pdf`);
  }

  if (!_hasHydrated) return null;

  const backHref =
    aId && bId ? `/compare?a=${aId}&b=${bId}` : "/compare";

  const addedKinkNames = new Set(items.filter((it) => it.fromKink).map((it) => it.name));

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-32 w-full flex flex-col min-h-dvh">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Link href={backHref} className="focus-ring text-sm transition-colors" style={{ color: "var(--text2)" }}>
          ← Terug
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Scène Menu</h1>
          {profileA && profileB ? (
            <p
              className="text-sm mt-0.5"
              style={{
                background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {profileA.name} &amp; {profileB.name}
            </p>
          ) : (
            <p className="text-sm mt-0.5" style={{ color: "var(--text2)" }}>
              Scène
            </p>
          )}
        </div>

        {/* Date input */}
        <div className="flex items-center gap-2">
          <label className="text-xs flex-none" style={{ color: "var(--text2)" }}>
            Datum:
          </label>
          <input
            type="date"
            value={sceneDate}
            onChange={(e) => setSceneDate(e.target.value)}
            className="text-xs rounded px-2 py-1 focus:outline-none focus-ring"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--text2)",
              colorScheme: "dark",
            }}
          />
        </div>
      </div>

      {/* Scene items list */}
      <div className="flex-1 flex flex-col">
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center select-none">
            <div className="text-3xl mb-3">🎯</div>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Nog geen activiteiten gepland</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
              Tik op een chip hieronder om<br />toe te voegen aan de scène
            </p>
          </div>
        ) : (
          <div>
            {items.map((item, i) => (
              <SceneItemCard
                key={item.id}
                item={item}
                index={i}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnter}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add manual item */}
      <div className="flex gap-2 mt-3 mb-8">
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addManualItem();
          }}
          placeholder="Eigen item toevoegen…"
          className="flex-1 text-sm rounded-lg px-3 py-2 focus:outline-none focus-ring"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
        <button
          onClick={addManualItem}
          aria-label="Item toevoegen"
          className="px-4 py-2 rounded-lg text-sm font-bold transition-opacity hover:opacity-90 focus-ring"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          +
        </button>
      </div>

      {/* Matched kinks quick-add */}
      {matchedKinks.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
            Voeg toe vanuit jullie matches
          </p>
          <div className="flex flex-wrap gap-1.5">
            {matchedKinks.map((k) => {
              const alreadyAdded = addedKinkNames.has(k.name);
              return (
                <button
                  key={k.id}
                  onClick={() => addFromKink(k.name)}
                  className="text-[11px] px-2.5 py-1 rounded-full border transition-all focus-ring"
                  style={
                    alreadyAdded
                      ? {
                          background: "transparent",
                          borderColor: "var(--border)",
                          color: "var(--text2)",
                          opacity: 0.5,
                        }
                      : {
                          background: `color-mix(in srgb, var(--accent) 12%, transparent)`,
                          borderColor: `color-mix(in srgb, var(--accent) 40%, transparent)`,
                          color: "var(--accent)",
                        }
                  }
                >
                  {k.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={handleExport}
        disabled={items.length === 0}
        aria-label="Exporteer als PDF"
        className="fixed bottom-6 right-4 px-5 py-3 rounded-2xl text-sm font-bold shadow-lg transition-opacity hover:opacity-90 focus-ring disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "var(--accent)", color: "#000", zIndex: 40 }}
      >
        ↓ Exporteer PDF
      </button>
    </main>
  );
}

export default function SceneSuspense() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-sm" style={{ color: "var(--text2)" }}>
          Laden…
        </div>
      }
    >
      <ScenePage />
    </Suspense>
  );
}
