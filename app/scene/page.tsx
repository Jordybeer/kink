"use client";
import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { KINKS } from "@/lib/kinks";
import type { Profile, SceneItem, ContractSnapshot } from "@/types";
import Sheet from "@/components/Sheet";
import PageShell from "@/components/PageShell";
import TimePicker from "@/components/TimePicker";
import DurationStepper from "@/components/DurationStepper";
import { ChevronUp, ChevronDown } from "lucide-react";
import { moveUp, moveDown } from "@/lib/sceneOrder";

function uid() {
  return crypto.randomUUID();
}

// ─── Contract helpers ────────────────────────────────────────────────────────

function contractForPair(
  contracts: ContractSnapshot[],
  aId: string,
  bId: string
): ContractSnapshot | undefined {
  if (!aId || !bId) return undefined;
  return contracts.find(
    (c) =>
      (c.profileAId === aId && c.profileBId === bId) ||
      (c.profileAId === bId && c.profileBId === aId)
  );
}

// ─── Profile select (custom animated dropdown) ───────────────────────────────

function ProfileSelect({
  profiles,
  value,
  onChange,
  placeholder,
}: {
  profiles: Profile[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = profiles.find((p) => p.id === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full focus-ring"
        style={{
          background: "var(--surface2)",
          border: `1px solid ${open ? "var(--accent)" : "var(--border)"}`,
          borderRadius: 10,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          color: selected ? "var(--text)" : "var(--text2)",
          fontSize: 14,
          minHeight: 44,
          width: "100%",
          transition: "border-color 150ms ease",
        }}
      >
        <span className="truncate">{selected?.name ?? placeholder}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
            color: "var(--text2)",
          }}
          aria-hidden="true"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div
        style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "var(--surface2)",
          border: "1px solid var(--border-accent)",
          borderRadius: 10,
          overflow: "hidden",
          zIndex: 10,
          maxHeight: open ? 220 : 0,
          opacity: open ? 1 : 0,
          transform: open ? "scaleY(1) translateY(0)" : "scaleY(0.9) translateY(-4px)",
          transformOrigin: "top",
          transition: "max-height 220ms cubic-bezier(0.4,0,0.2,1), opacity 180ms ease, transform 180ms ease",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div style={{ overflowY: "auto", maxHeight: 220 }}>
          {profiles.length === 0 ? (
            <p style={{ padding: "10px 12px", fontSize: 13, color: "var(--text2)" }}>
              Geen profielen
            </p>
          ) : (
            profiles.map((p, i) => (
              <button
                key={p.id}
                onClick={() => { onChange(p.id); setOpen(false); }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  textAlign: "left",
                  fontSize: 14,
                  color: p.id === value ? "var(--accent)" : "var(--text)",
                  background: p.id === value
                    ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                    : "transparent",
                  borderBottom: i < profiles.length - 1 ? "1px solid var(--border)" : "none",
                  display: "block",
                  minHeight: 44,
                  transition: "background 120ms ease",
                }}
              >
                {p.name}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Contract gate ────────────────────────────────────────────────────────────

function ContractGate({
  profiles,
  initialA,
  initialB,
  contracts,
}: {
  profiles: Profile[];
  initialA: string;
  initialB: string;
  contracts: ContractSnapshot[];
}) {
  const router = useRouter();
  const [entered, setEntered] = useState(false);
  const [selectedA, setSelectedA] = useState(initialA);
  const [selectedB, setSelectedB] = useState(initialB);

  useEffect(() => {
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const canProceed = selectedA && selectedB && selectedA !== selectedB;
  const existingContract = canProceed ? contractForPair(contracts, selectedA, selectedB) : undefined;
  const contractHref = canProceed
    ? `/contract?a=${selectedA}&b=${selectedB}`
    : "/contract";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(20px) saturate(0.6)",
        WebkitBackdropFilter: "blur(20px) saturate(0.6)",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          maxWidth: 440,
          width: "100%",
          padding: "28px 24px 24px",
          transform: entered
            ? "scale(1) translateY(0)"
            : "scale(0.92) translateY(20px)",
          opacity: entered ? 1 : 0,
          transition:
            "transform 320ms cubic-bezier(0.34,1.4,0.64,1), opacity 280ms ease",
        }}
      >
        {/* Lock icon */}
        <div className="flex items-center justify-center mb-5">
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "color-mix(in srgb, var(--accent) 12%, transparent)",
              border: "1px solid var(--border-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4" y="11" width="16" height="11" rx="2" stroke="var(--accent)" strokeWidth="1.8"/>
              <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1.5" fill="var(--accent)"/>
            </svg>
          </div>
        </div>

        <h2
          className="text-base font-bold text-center mb-3"
          style={{ color: "var(--text)" }}
        >
          Verbond vereist
        </h2>

        <p
          className="text-sm text-center mb-2"
          style={{ color: "var(--text2)", lineHeight: 1.65 }}
        >
          Elke scène begint met toestemming. Een verbond legt jullie grenzen,
          verlangens en safewords vast — zodat wat je speelt bewust en veilig is
          voor beiden.
        </p>
        <p
          className="text-sm text-center mb-6"
          style={{ color: "var(--text2)", lineHeight: 1.65 }}
        >
          Spelen zonder afspraken is spelen in het donker. Het verbond is geen
          formaliteit — het is de fundering waarop vertrouwen en overgave kunnen
          bestaan. Kies hieronder twee profielen en maak eerst een verbond aan.
        </p>

        {/* Profile selectors — 1 row, 2 columns */}
        <div className="flex gap-3 mb-5">
          <ProfileSelect
            profiles={profiles}
            value={selectedA}
            onChange={setSelectedA}
            placeholder="Profiel A"
          />
          <ProfileSelect
            profiles={profiles}
            value={selectedB}
            onChange={setSelectedB}
            placeholder="Profiel B"
          />
        </div>

        {existingContract ? (
          <button
            onClick={() => router.push(`/scene?a=${selectedA}&b=${selectedB}`)}
            className="w-full py-3 rounded-xl text-sm font-bold focus-ring mb-3"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Ga naar scène →
          </button>
        ) : (
          <button
            onClick={() => router.push(contractHref)}
            disabled={!canProceed}
            className="w-full py-3 rounded-xl text-sm font-bold focus-ring disabled:opacity-40 mb-3"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Contract opstellen
          </button>
        )}

        <button
          onClick={() => router.back()}
          className="w-full py-3 rounded-xl text-sm focus-ring"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text2)",
          }}
        >
          Terug
        </button>
      </div>
    </div>
  );
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

// ─── Intensity color ─────────────────────────────────────────────────────────

function intensityColor(v: SceneItem["intensity"]) {
  return v === "zacht" ? "var(--willing)" : v === "midden" ? "var(--maybe)" : "var(--hard-no)";
}

// ─── Scene item row ──────────────────────────────────────────────────────────

interface SceneItemRowProps {
  item: SceneItem;
  index: number;
  totalItems: number;
  onUpdate: (id: string, patch: Partial<SceneItem>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (i: number) => void;
  onMoveDown: (i: number) => void;
}

function SceneItemRow({
  item, index, totalItems,
  onUpdate, onDelete, onMoveUp, onMoveDown,
}: SceneItemRowProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
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
      <div
        style={{ width: 3, background: color, flexShrink: 0, transition: "background 120ms ease" }}
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0 p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium block truncate" style={{ color: "var(--text)" }}>
              {item.name}
            </span>
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded-full border"
                    style={{ borderColor: "var(--border)", color: "var(--text2)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-0.5">
            <button
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              aria-label="Naar boven verplaatsen"
              className="focus-ring rounded-lg disabled:opacity-30"
              style={{ minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}
            >
              <ChevronUp size={16} aria-hidden="true" />
            </button>
            <button
              onClick={() => onMoveDown(index)}
              disabled={index === totalItems - 1}
              aria-label="Naar beneden verplaatsen"
              className="focus-ring rounded-lg disabled:opacity-30"
              style={{ minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}
            >
              <ChevronDown size={16} aria-hidden="true" />
            </button>
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
          </div>
        </div>

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
                    minHeight: 44,
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
              style={{ minHeight: 44, color: detailsOpen ? "var(--accent)" : "var(--text2)" }}
            >
              {detailsOpen ? "Minder" : "Details"}
            </button>
          </div>

        <div className={`accordion-content ${detailsOpen ? "open" : ""}`}>
          <div className="accordion-inner space-y-2 pt-2">
            <div className="flex items-start gap-2">
              <label className="text-xs flex-none pt-1" style={{ color: "var(--text2)", minWidth: 32 }}>Duur</label>
              <DurationStepper value={item.duration} onChange={(v) => onUpdate(item.id, { duration: v })} />
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
        minHeight: 44,
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
  const { profiles, scenes, contracts, saveScene } = useStore();
  const _hasHydrated = useHasHydrated();

  const sceneIdParam = searchParams.get("id");
  const aId = searchParams.get("a") ?? "";
  const bId = searchParams.get("b") ?? "";

  const [sceneId, setSceneId] = useState<string | null>(sceneIdParam);
  const [items, setItems] = useState<SceneItem[]>([]);
  const [sceneDate, setSceneDate] = useState("");
  const [sceneTime, setSceneTime] = useState("");
  const [sceneTitle, setSceneTitle] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedStatus, setSavedStatus] = useState<"draft" | "planned" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [safeword, setSafeword] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    setSceneTime(scene.plannedTime ?? "");
    setSceneTitle(scene.title);
    setSafeword(scene.safeword ?? "");
    setSaved(true);
  }, [_hasHydrated, sceneIdParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autofill safeword from contract when profiles are known
  useEffect(() => {
    if (!_hasHydrated || !resolvedAId || !resolvedBId) return;
    const contract = contractForPair(contracts, resolvedAId, resolvedBId);
    if (contract?.safeword) {
      setSafeword((prev) => prev || contract.safeword!);
    }
  }, [_hasHydrated, resolvedAId, resolvedBId, contracts]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdate = useCallback((id: string, patch: Partial<SceneItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    setSaved(false); setSavedStatus(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSaved(false); setSavedStatus(null);
  }, []);

  const handleMoveUp = useCallback((i: number) => {
    setItems((prev) => moveUp(prev, i));
    setSaved(false); setSavedStatus(null);
  }, []);

  const handleMoveDown = useCallback((i: number) => {
    setItems((prev) => moveDown(prev, i));
    setSaved(false); setSavedStatus(null);
  }, []);


  function addFromKink(kinkName: string, kinkId: string) {
    const tags = [...new Set([...(profileA?.entries[kinkId]?.tags ?? []), ...(profileB?.entries[kinkId]?.tags ?? [])])];
    setItems((prev) => [...prev, { id: uid(), name: kinkName, kinkId, intensity: "midden", duration: "", note: "", fromKink: true, tags }]);
    setSaved(false); setSavedStatus(null);
  }

  function addManualItem() {
    const name = newItemName.trim();
    if (!name) return;
    setItems((prev) => [...prev, { id: uid(), name, intensity: "midden", duration: "", note: "", fromKink: false }]);
    setNewItemName("");
    setSaved(false); setSavedStatus(null);
  }

  function handleSave(status: "draft" | "planned") {
    if (!profileA || !profileB) {
      setSaveError("Kies twee profielen voordat je deze scène vastlegt.");
      return;
    }
    setSaveError(null);
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
      plannedTime: sceneTime || undefined,
      safeword: safeword.trim() || undefined,
      status,
    });
    setSceneId(id);
    setSaved(true);
    setSavedStatus(status);
    router.replace(`/scene?id=${id}`);
  }

  async function handleExport() {
    const { exportScenePdf } = await import("@/lib/scenePdf");
    const scene = {
      id: sceneId ?? "draft",
      title: sceneTitle.trim(),
      profileAId: profileA?.id ?? "",
      profileBId: profileB?.id ?? "",
      profileAName: profileA?.name ?? "",
      profileBName: profileB?.name ?? "",
      items,
      plannedDate: sceneDate || undefined,
      plannedTime: sceneTime || undefined,
      safeword: safeword.trim() || undefined,
      status: "draft" as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await exportScenePdf(scene, { profileA, profileB });
  }

  if (!_hasHydrated) return <PageShell loading width="2xl" flush />;

  const currentScene = sceneId ? scenes.find((s) => s.id === sceneId) : null;
  const isCompleted = currentScene?.status === "completed";
  const backHref = aId && bId ? `/compare?a=${aId}&b=${bId}` : "/scenes";
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

  // Gate: new scene with no signed contract for the pair
  const gated = !sceneIdParam && !contractForPair(contracts, resolvedAId, resolvedBId);

  return (
    <>
      <main
        className="max-w-2xl mx-auto px-4 w-full flex flex-col"
        style={{ paddingTop: 20, paddingBottom: 120, minHeight: "100dvh" }}
      >
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
              className="ks-input-lg w-full bg-transparent focus:outline-none focus-ring rounded font-bold"
              style={{ color: "var(--text)" }}
            />
            {profileA && profileB && (
              <p className="text-xs truncate mt-0.5" style={{ color: "var(--text2)" }}>
                {profileA.name} &amp; {profileB.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-none">
            <input
              type="date"
              value={sceneDate}
              onChange={(e) => { setSceneDate(e.target.value); setSaved(false); }}
              className="focus:outline-none focus-ring rounded-lg px-2"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)", fontSize: 12, height: 36, colorScheme: "dark" }}
            />
            <TimePicker value={sceneTime} onChange={(v) => { setSceneTime(v); setSaved(false); }} />
          </div>
        </div>

        {/* Profile hint */}
        {!profileA && !profileB && !sceneIdParam && (
          <div className="rounded-lg px-3 py-2.5 mb-3 text-xs" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <p className="mb-1" style={{ color: "var(--text2)" }}>Kies profielen voor kink-suggesties — of voeg items handmatig toe.</p>
            <Link href="/compare" style={{ color: "var(--accent)" }}>→ Profielen kiezen via Vergelijk</Link>
          </div>
        )}

        {/* Safeword */}
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs flex-none font-semibold" style={{ color: "var(--hard-no)", minWidth: 72 }}>Safeword</label>
          <input
            type="text"
            value={safeword}
            onChange={(e) => { setSafeword(e.target.value); setSaved(false); }}
            placeholder="bijv. rood"
            className="flex-1 rounded-lg px-3 focus:outline-none focus-ring"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, height: 40 }}
          />
        </div>

        {/* + Kinks trigger (replaces manual input in scroll area) */}
        {hasKinks && !isCompleted && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl mb-4 focus-ring"
            style={{
              background: "color-mix(in srgb, var(--accent) 6%, transparent)",
              border: "1px solid var(--border-accent)",
            }}
          >
            <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
              + Kinks toevoegen
            </span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ color: "var(--accent)", opacity: 0.7 }}>
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Arc bar */}
        <div className="mb-4">
          <SceneArcBar items={items} />
        </div>


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
              <p className="text-xs" style={{ color: "var(--text2)" }}>Voeg kinks of eigen items toe via de balk onderaan</p>
            </div>
          ) : (
            <div>
              {items.map((item, i) => (
                <SceneItemRow
                  key={item.id}
                  item={item}
                  index={i}
                  totalItems={items.length}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Fixed action bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{ background: "var(--bg)", borderTop: "1px solid var(--border)", padding: "10px 16px", paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        {saveError && (
          <div className="max-w-2xl mx-auto mb-2">
            <p role="alert" className="text-xs ks-fade-in" style={{ color: "var(--hard-no)" }}>
              {saveError}
            </p>
          </div>
        )}
        <div className="max-w-2xl mx-auto flex gap-2">

          {/* Manual add — hidden when completed */}
          {!isCompleted && (
            <>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addManualItem(); }}
                placeholder="Eigen item…"
                className="flex-1 min-w-0 rounded-xl px-3 focus:outline-none focus-ring"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, height: 44 }}
              />
              <button
                onClick={addManualItem}
                aria-label="Item toevoegen"
                className="rounded-xl font-bold focus-ring flex-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)", minWidth: 44, height: 44, fontSize: 20 }}
              >
                +
              </button>
            </>
          )}

          {/* PDF */}
          <button
            onClick={handleExport}
            disabled={items.length === 0}
            className="focus-ring rounded-xl text-xs font-bold disabled:opacity-40 flex-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)", minWidth: 52, height: 44, padding: "0 12px" }}
            aria-label="Exporteer als PDF"
          >
            PDF
          </button>

          {!isCompleted && (
            <>
              <button
                onClick={() => handleSave("draft")}
                disabled={items.length === 0}
                className="focus-ring rounded-xl text-xs font-bold disabled:opacity-40 flex-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: savedStatus === "draft" ? "var(--accent)" : "var(--text)", height: 44, padding: "0 12px" }}
              >
                {savedStatus === "draft" ? "Concept ✓" : "Opslaan"}
              </button>
              <button
                onClick={() => handleSave("planned")}
                disabled={items.length === 0}
                className="focus-ring rounded-xl text-xs font-bold disabled:opacity-40 flex-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: savedStatus === "planned" ? "var(--accent)" : "var(--text)", height: 44, padding: "0 12px" }}
              >
                {savedStatus === "planned" ? "Gepland ✓" : "Plannen"}
              </button>
            </>
          )}

        </div>
      </div>

      {/* Contract gate — only for new scenes without a signed contract */}
      {gated && (
        <ContractGate
          profiles={profiles}
          initialA={aId}
          initialB={bId}
          contracts={contracts}
        />
      )}

      {/* ── Kink drawer (Sheet) ── */}
      <Sheet open={drawerOpen} onClose={() => setDrawerOpen(false)} aria-label="Kinks toevoegen">
        <div className="rounded-t-2xl px-4 pt-5 pb-8" style={{ background: "var(--surface)", maxHeight: "70vh", overflowY: "auto" }}>
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border)" }} aria-hidden="true" />

          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>Toevoegen aan setlist</h2>
            <button
              onClick={() => setDrawerOpen(false)}
              className="focus-ring rounded-lg"
              style={{ minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}
              aria-label="Sluiten"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {topKinks.length > 0 && (
            <div className="mb-5">
              <p className="text-sm mb-3" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--accent2)" }}>Meest gebruikt</p>
              <div className="flex flex-wrap gap-2">
                {topKinks.map((k) => (
                  <KinkChip key={k.id} name={k.name} added={addedKinkIds.has(k.id)} color="var(--accent2)" onAdd={() => addFromKink(k.name, k.id)} />
                ))}
              </div>
            </div>
          )}

          {mutualKinks.length > 0 && (
            <div className="mb-5">
              <p className="text-sm mb-3" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--yes)" }}>Wederzijds</p>
              <div className="flex flex-wrap gap-2">
                {mutualKinks.map((k) => (
                  <KinkChip key={k.id} name={k.name} added={addedKinkIds.has(k.id)} color="var(--yes)" onAdd={() => addFromKink(k.name, k.id)} />
                ))}
              </div>
            </div>
          )}

          {spanningKinks.length > 0 && (
            <div>
              <p className="text-sm mb-3" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--no)" }}>Spanning</p>
              <div className="flex flex-wrap gap-2">
                {spanningKinks.map((k) => (
                  <KinkChip key={k.id} name={k.name} added={addedKinkIds.has(k.id)} color="var(--no)" onAdd={() => addFromKink(k.name, k.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </Sheet>
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
