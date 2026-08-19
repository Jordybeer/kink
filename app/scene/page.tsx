"use client";
import { useState, useCallback, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { useMotionSafe } from "@/lib/motion";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { useContractStore } from "@/lib/contractStore";
import { KINKS } from "@/lib/kinks";
import type { Profile, SceneItem, SceneRecord } from "@/types";
import {
  activeSignedContractForPair,
  contractVersionById,
  type ContractSeries,
} from "@/lib/contractLifecycle";
import Sheet from "@/components/Sheet";
import PageShell from "@/components/PageShell";
import ProfileSelect from "@/components/ProfileSelect";
import TimePicker from "@/components/TimePicker";
import DurationStepper from "@/components/DurationStepper";
import { ArrowRight, CaretDown, CaretRight, CaretUp, Check, ListPlus, LockKey, Plus, Trash, X } from "@phosphor-icons/react";
import { moveUp, moveDown } from "@/lib/sceneOrder";
import { comparableEntry, visibleStatus, visibleUsedInScene } from "@/lib/privateResponses";
import { directionalCompareLabel, directionalComparisonEntries } from "@/lib/directionality";

function uid() {
  return crypto.randomUUID();
}

// ─── Contract gate ────────────────────────────────────────────────────────────

function ContractGate({
  profiles,
  initialA,
  initialB,
  contractSeries,
}: {
  profiles: Profile[];
  initialA: string;
  initialB: string;
  contractSeries: ContractSeries[];
}) {
  const router = useRouter();
  const t = useMotionSafe();
  const [selectedA, setSelectedA] = useState(initialA);
  const [selectedB, setSelectedB] = useState(initialB);
  const [whyOpen, setWhyOpen] = useState(false);

  const canProceed = selectedA && selectedB && selectedA !== selectedB;
  const existingContract = canProceed
    ? activeSignedContractForPair(contractSeries, selectedA, selectedB)
    : undefined;
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
        padding: "max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(20px) saturate(0.6)",
        WebkitBackdropFilter: "blur(20px) saturate(0.6)",
      }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={t.modal}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          maxWidth: 460,
          width: "100%",
          maxHeight: "min(680px, calc(var(--visual-viewport-height, 100dvh) - 32px))",
          overflowY: "auto",
          padding: "24px 20px 20px",
        }}
      >
        <div className="mb-4 flex items-center justify-center">
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
            <LockKey size={22} weight="duotone" aria-hidden="true" style={{ color: "var(--accent)" }} />
          </div>
        </div>

        <h2 className="mb-2 text-center text-lg font-semibold" style={{ color: "var(--text)" }}>
          Verbond vereist
        </h2>

        <p className="mx-auto mb-4 max-w-sm text-center text-sm leading-6" style={{ color: "var(--text2)" }}>
          Voor een scène is een actief bevestigd contract nodig. Kies twee profielen om verder te gaan.
        </p>

        <button
          type="button"
          onClick={() => setWhyOpen((open) => !open)}
          aria-expanded={whyOpen}
          className="focus-ring mx-auto mb-4 flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-medium"
          style={{ color: "var(--accent)" }}
        >
          Waarom is dit nodig?
          <CaretDown size={13} aria-hidden="true" className={whyOpen ? "rotate-180" : ""} />
        </button>

        {whyOpen && (
          <div className="mb-5 rounded-xl p-3 text-sm leading-6" style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}>
            Een verbond legt grenzen, verlangens en safewords vast voordat de setlist wordt gepland. Zo blijven toestemming en afspraken het uitgangspunt van de scène.
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
            className="focus-ring mb-2 inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold"
            style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
          >
            Ga naar scène <ArrowRight size={15} aria-hidden="true" />
          </button>
        ) : (
          <button
            onClick={() => router.push(contractHref)}
            disabled={!canProceed}
            className="focus-ring mb-2 min-h-12 w-full rounded-xl px-4 text-sm font-semibold disabled:opacity-40"
            style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
          >
            Contract opstellen
          </button>
        )}

        <button
          onClick={() => router.back()}
          className="focus-ring min-h-11 w-full rounded-xl px-4 text-sm"
          style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text2)" }}
        >
          Terug
        </button>
      </motion.div>
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

function intensityColor(v: SceneItem["intensity"]) {
  return v === "zacht" ? "var(--willing)" : v === "midden" ? "var(--maybe)" : "var(--hard-no)";
}

interface SceneItemRowProps {
  item: SceneItem;
  locked?: boolean;
  index: number;
  totalItems: number;
  onUpdate: (id: string, patch: Partial<SceneItem>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (i: number) => void;
  onMoveDown: (i: number) => void;
}

function SceneItemRow({
  item, locked = false, index, totalItems,
  onUpdate, onDelete, onMoveUp, onMoveDown,
}: SceneItemRowProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const visibleDetails = locked || detailsOpen;
  const color = intensityColor(item.intensity);

  return (
    <div
      className="scene-item-reorder mb-2 flex items-stretch overflow-hidden rounded-2xl ks-slide-up"
      aria-disabled={locked}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        animationDelay: `${index * 35}ms`,
      }}
    >
      <div className="transition-colors" style={{ width: 3, background: color, flexShrink: 0 }} aria-hidden="true" />

      <div className="min-w-0 flex-1 p-3">
        <div className="mb-2 min-w-0">
          <span className="block truncate text-sm font-medium" style={{ color: "var(--text)" }}>
            {item.name}
          </span>
          {item.tags && item.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-1.5 py-0.5 text-[11px]"
                  style={{ borderColor: "var(--border)", color: "var(--text2)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          {(["zacht", "midden", "intens"] as const).map((v) => {
            const active = item.intensity === v;
            const c = intensityColor(v);
            return (
              <button
                key={v}
                onClick={() => onUpdate(item.id, { intensity: v })}
                disabled={locked}
                aria-pressed={active}
                className="focus-ring rounded-full border px-3 text-xs transition-colors disabled:opacity-60"
                style={{
                  minHeight: 44,
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
            aria-label={visibleDetails ? "Details verbergen" : "Duur, notitie en beheer"}
            aria-expanded={visibleDetails}
            className="focus-ring ml-auto min-h-11 rounded-lg px-2 text-xs"
            style={{ color: visibleDetails ? "var(--accent)" : "var(--text2)" }}
          >
            {visibleDetails ? "Minder" : "Details"}
          </button>
        </div>

        <div className={`accordion-content ${visibleDetails ? "open" : ""}`}>
          <div className="accordion-inner space-y-3 pt-3">
            <div className="flex items-start gap-2">
              <label className="flex-none pt-1 text-xs" style={{ color: "var(--text2)", minWidth: 32 }}>Duur</label>
              <DurationStepper
                value={item.duration}
                disabled={locked}
                onChange={(v) => onUpdate(item.id, { duration: v })}
              />
            </div>
            <textarea
              rows={2}
              value={item.note}
              readOnly={locked}
              onChange={(e) => onUpdate(item.id, { note: e.target.value })}
              placeholder="Notitie…"
              className="focus-ring w-full resize-none rounded-lg px-3 py-2 focus:outline-none read-only:opacity-70"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14 }}
            />

            {!locked && (
              <div className="flex items-center gap-1 border-t pt-2" style={{ borderColor: "var(--border)" }}>
                <span className="mr-auto text-xs" style={{ color: "var(--text2)" }}>Volgorde &amp; beheer</span>
                <button
                  onClick={() => onMoveUp(index)}
                  disabled={index === 0}
                  aria-label="Naar boven verplaatsen"
                  className="focus-ring flex h-11 w-11 items-center justify-center rounded-lg disabled:opacity-30"
                  style={{ color: "var(--text2)" }}
                >
                  <CaretUp size={16} aria-hidden="true" />
                </button>
                <button
                  onClick={() => onMoveDown(index)}
                  disabled={index === totalItems - 1}
                  aria-label="Naar beneden verplaatsen"
                  className="focus-ring flex h-11 w-11 items-center justify-center rounded-lg disabled:opacity-30"
                  style={{ color: "var(--text2)" }}
                >
                  <CaretDown size={16} aria-hidden="true" />
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  aria-label={`${item.name} verwijderen`}
                  className="focus-ring flex h-11 w-11 items-center justify-center rounded-lg"
                  style={{ color: "var(--hard-no)" }}
                >
                  <Trash size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KinkChip({
  name, added, color, onAdd,
}: { name: string; added: boolean; color: string; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      disabled={added}
      className="text-xs px-3 py-1.5 rounded-full border focus-ring disabled:opacity-40 flex items-center gap-1 transition-colors"
      style={{
        background: added ? "transparent" : `color-mix(in srgb, ${color} 12%, transparent)`,
        borderColor: added ? "var(--border)" : `color-mix(in srgb, ${color} 45%, transparent)`,
        color: added ? "var(--text2)" : color,
        minHeight: 44,
      }}
    >
      {!added && <Plus size={12} aria-hidden="true" />}
      {name}
    </button>
  );
}

function ScenePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profiles, scenes, saveScene, lockSceneConsent } = useStore();
  const contractSeries = useContractStore((state) => state.series);
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

  const currentScene = sceneId ? scenes.find((s) => s.id === sceneId) ?? null : null;
  const isConsentLocked = !!(
    currentScene?.consentLockedAt
    || currentScene?.consentSnapshots
    || currentScene?.consentAgreement
  );
  const resolvedAId = currentScene?.profileAId ?? aId;
  const resolvedBId = currentScene?.profileBId ?? bId;
  const profileA: Profile | undefined = profiles.find((p) => p.id === resolvedAId);
  const profileB: Profile | undefined = profiles.find((p) => p.id === resolvedBId);

  useEffect(() => {
    if (!_hasHydrated || !sceneIdParam) return;
    const scene = scenes.find((s) => s.id === sceneIdParam);
    if (!scene) return;
    const source = scene.consentAgreement ?? scene;
    setItems(source.items);
    setSceneDate(source.plannedDate ?? "");
    setSceneTime(source.plannedTime ?? "");
    setSceneTitle(source.title);
    setSafeword(source.safeword ?? "");
    setSaved(true);
  }, [_hasHydrated, sceneIdParam]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!_hasHydrated || !resolvedAId || !resolvedBId) return;
    const contract = activeSignedContractForPair(contractSeries, resolvedAId, resolvedBId);
    const version = contract ? contractVersionById(contract, contract.currentVersionId) : undefined;
    if (version?.summary.safeword) {
      setSafeword((prev) => prev || version.summary.safeword!);
    }
  }, [_hasHydrated, resolvedAId, resolvedBId, contractSeries]);

  const handleUpdate = useCallback((id: string, patch: Partial<SceneItem>) => {
    if (isConsentLocked) return;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    setSaved(false); setSavedStatus(null);
  }, [isConsentLocked]);

  const handleDelete = useCallback((id: string) => {
    if (isConsentLocked) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSaved(false); setSavedStatus(null);
  }, [isConsentLocked]);

  const handleMoveUp = useCallback((i: number) => {
    if (isConsentLocked) return;
    setItems((prev) => moveUp(prev, i));
    setSaved(false); setSavedStatus(null);
  }, [isConsentLocked]);

  const handleMoveDown = useCallback((i: number) => {
    if (isConsentLocked) return;
    setItems((prev) => moveDown(prev, i));
    setSaved(false); setSavedStatus(null);
  }, [isConsentLocked]);

  function addFromKink(kinkName: string, kinkId: string) {
    if (isConsentLocked) return;
    const pair = directionalComparisonEntries(profileA?.entries, profileB?.entries, kinkId);
    const sourceEntry = comparableEntry(pair.sourceEntry);
    const partnerEntry = comparableEntry(pair.partnerEntry);
    const tags = [...new Set([...(sourceEntry.tags ?? []), ...(partnerEntry.tags ?? [])])];
    setItems((prev) => [...prev, { id: uid(), name: kinkName, kinkId, intensity: "midden", duration: "", note: "", fromKink: true, tags }]);
    setSaved(false); setSavedStatus(null);
  }

  function addManualItem() {
    if (isConsentLocked) return;
    const name = newItemName.trim();
    if (!name) return;
    setItems((prev) => [...prev, { id: uid(), name, intensity: "midden", duration: "", note: "", fromKink: false }]);
    setNewItemName("");
    setSaved(false); setSavedStatus(null);
  }

  async function handleSave(status: "draft" | "planned") {
    const existingScene = sceneId ? scenes.find((candidate) => candidate.id === sceneId) : undefined;
    if (existingScene?.consentLockedAt || existingScene?.consentSnapshots || existingScene?.consentAgreement) {
      setSaveError("Deze afspraken zijn vastgezet. Maak een nieuwe scène voor een gewijzigde setlist.");
      return;
    }
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
    if (status === "planned") {
      const result = await lockSceneConsent(id);
      if (!result.ok) setSaveError(`Scène opgeslagen, maar toestemming is nog niet bevestigd: ${result.message}`);
    }
  }

  async function handleExport() {
    const { exportConsentBoundScenePdf } = await import("@/lib/sceneConsentExport");
    const draft: SceneRecord = {
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
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await exportConsentBoundScenePdf(
      isConsentLocked && currentScene ? currentScene : draft,
      { profileA, profileB },
    );
  }

  if (!_hasHydrated) return <PageShell loading width="2xl" flush />;

  const isCompleted = currentScene?.status === "completed";
  const backHref = aId && bId ? `/compare?a=${aId}&b=${bId}` : "/scenes";
  const addedKinkIds = new Set(items.map((it) => it.kinkId).filter(Boolean));

  const comparisonEntries = (kinkId: string) =>
    directionalComparisonEntries(profileA?.entries, profileB?.entries, kinkId);

  const topKinks = profileA
    ? KINKS.filter((k) => visibleUsedInScene(comparisonEntries(k.id).sourceEntry) > 0)
        .sort((a, b) => {
          const pairA = comparisonEntries(a.id);
          const pairB = comparisonEntries(b.id);
          return (visibleUsedInScene(pairB.partnerEntry) + visibleUsedInScene(pairB.sourceEntry)) -
            (visibleUsedInScene(pairA.partnerEntry) + visibleUsedInScene(pairA.sourceEntry));
        })
        .slice(0, 5)
    : [];

  const mutualKinks = KINKS.filter((k) => {
    const pair = comparisonEntries(k.id);
    const a = visibleStatus(pair.sourceEntry);
    const b = visibleStatus(pair.partnerEntry);
    return !!a && !!b && (a === "yes" || a === "willing") && (b === "yes" || b === "willing");
  });

  const spanningKinks = KINKS.filter((k) => {
    const pair = comparisonEntries(k.id);
    const a = visibleStatus(pair.sourceEntry);
    const b = visibleStatus(pair.partnerEntry);
    if (!a || !b || a === "hard_no" || b === "hard_no" || a === "no" || b === "no") return false;
    return !((a === "yes" || a === "willing") && (b === "yes" || b === "willing")) && (a === "maybe" || b === "maybe");
  });

  const hasKinks = mutualKinks.length > 0 || spanningKinks.length > 0 || topKinks.length > 0;
  const gated = !sceneIdParam && !activeSignedContractForPair(contractSeries, resolvedAId, resolvedBId);

  return (
    <>
      <main
        className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col px-4"
        style={{ paddingTop: 20, paddingBottom: 120 }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Link
            href={backHref}
            prefetch={false}
            aria-label="Terug"
            className="focus-ring flex h-11 w-11 flex-none items-center rounded-lg"
            style={{ color: "var(--text2)", fontSize: 13 }}
          >
            <ArrowRight size={16} className="rotate-180" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={sceneTitle}
              onChange={(e) => { if (!isConsentLocked) { setSceneTitle(e.target.value); setSaved(false); } }}
              disabled={isConsentLocked}
              placeholder={profileA && profileB ? `${profileA.name} & ${profileB.name}` : "Scène…"}
              className="ks-input-lg focus-ring w-full rounded-lg bg-transparent font-bold focus:outline-none"
              style={{ color: "var(--text)" }}
            />
            {profileA && profileB && (
              <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text2)" }}>
                {profileA.name} &amp; {profileB.name}
              </p>
            )}
          </div>
        </div>

        <div className="mb-3 flex items-center gap-1.5">
          <input
            type="date"
            value={sceneDate}
            onChange={(e) => { if (!isConsentLocked) { setSceneDate(e.target.value); setSaved(false); } }}
            disabled={isConsentLocked}
            className="focus-ring flex-1 rounded-lg px-2 focus:outline-none"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)", fontSize: 12, height: 36, colorScheme: "dark", maxWidth: 180 }}
          />
          <TimePicker
            value={sceneTime}
            disabled={isConsentLocked}
            onChange={(v) => { if (!isConsentLocked) { setSceneTime(v); setSaved(false); } }}
          />
        </div>

        {!profileA && !profileB && !sceneIdParam && (
          <div className="mb-3 rounded-xl px-3 py-2.5 text-xs" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <p className="mb-1" style={{ color: "var(--text2)" }}>Kies profielen voor kink-suggesties, of voeg items handmatig toe.</p>
            <Link href="/compare" className="inline-flex items-center gap-1" style={{ color: "var(--accent)" }}><ArrowRight size={13} aria-hidden="true" />Profielen kiezen via Vergelijk</Link>
          </div>
        )}

        <div className="mb-3 flex items-center gap-2">
          <label className="flex-none text-xs font-semibold" style={{ color: "var(--hard-no)", minWidth: 72 }}>Safeword</label>
          <input
            type="text"
            value={safeword}
            onChange={(e) => { if (!isConsentLocked) { setSafeword(e.target.value); setSaved(false); } }}
            disabled={isConsentLocked}
            placeholder="bijv. rood"
            className="focus-ring flex-1 rounded-lg px-3 focus:outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, height: 40 }}
          />
        </div>

        {isConsentLocked && (
          <div className="mb-4 rounded-xl px-3 py-2.5 text-xs" style={{ background: "color-mix(in srgb, var(--yes) 8%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--yes) 30%, var(--border))", color: "var(--text2)" }}>
            Deze setlist is vastgezet. Activiteiten, intensiteiten en safeword kunnen hier niet meer stilletjes worden aangepast.
          </div>
        )}

        {hasKinks && !isCompleted && !isConsentLocked && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="focus-ring mb-4 flex min-h-12 w-full items-center justify-between rounded-xl px-3"
            style={{ background: "color-mix(in srgb, var(--accent) 6%, transparent)", border: "1px solid var(--border-accent)" }}
          >
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--accent)" }}>
              <Plus size={15} aria-hidden="true" />
              Kinks toevoegen
            </span>
            <CaretRight size={14} aria-hidden="true" style={{ color: "var(--accent)", opacity: 0.7 }} />
          </button>
        )}

        <div className="mb-4">
          <SceneArcBar items={items} />
        </div>

        <div className="flex-1">
          {items.length === 0 ? (
            <div className="flex select-none flex-col items-center justify-center py-16 text-center ks-fade-in">
              <div className="mb-4" style={{ opacity: 0.35 }}>
                <ListPlus size={48} weight="duotone" aria-hidden="true" style={{ color: "var(--text2)" }} />
              </div>
              <p className="mb-1 text-sm font-medium" style={{ color: "var(--text)" }}>Lege setlist</p>
              <p className="text-sm" style={{ color: "var(--text2)" }}>Voeg kinks of eigen items toe via de balk onderaan</p>
            </div>
          ) : (
            <div>
              {items.map((item, i) => (
                <SceneItemRow
                  key={item.id}
                  item={item}
                  locked={isConsentLocked}
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

      <div
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{ background: "var(--bg)", borderTop: "1px solid var(--border)", padding: "10px 16px", paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        {saveError && (
          <div className="mx-auto mb-2 max-w-3xl">
            <p role="alert" className="text-xs ks-fade-in" style={{ color: "var(--hard-no)" }}>{saveError}</p>
          </div>
        )}
        <div className="mx-auto flex max-w-3xl flex-wrap gap-2">
          {!isCompleted && !isConsentLocked && (
            <div className="flex w-full gap-2 sm:w-auto sm:flex-1">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addManualItem(); }}
                placeholder="Eigen item…"
                className="focus-ring min-w-0 flex-1 rounded-xl px-3 focus:outline-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, height: 44 }}
              />
              <button
                onClick={addManualItem}
                aria-label="Item toevoegen"
                className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-xl font-bold"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}
              >
                <Plus size={20} aria-hidden="true" />
              </button>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={items.length === 0}
            className="focus-ring h-11 flex-1 rounded-xl px-3 text-xs font-bold disabled:opacity-40 sm:flex-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)", minWidth: 52 }}
            aria-label="Exporteer als PDF"
          >
            PDF
          </button>

          {!isCompleted && !isConsentLocked && (
            <>
              <button
                onClick={() => handleSave("draft")}
                disabled={items.length === 0}
                className="focus-ring inline-flex h-11 flex-1 items-center justify-center gap-1 rounded-xl px-3 text-xs font-bold disabled:opacity-40 sm:flex-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: savedStatus === "draft" ? "var(--accent)" : "var(--text)" }}
              >
                {savedStatus === "draft" ? <><Check size={13} aria-hidden="true" /> Concept</> : "Opslaan"}
              </button>
              <button
                onClick={() => handleSave("planned")}
                disabled={items.length === 0}
                className="focus-ring inline-flex h-11 flex-1 items-center justify-center gap-1 rounded-xl px-3 text-xs font-bold disabled:opacity-40 sm:flex-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: savedStatus === "planned" ? "var(--accent)" : "var(--text)" }}
              >
                {savedStatus === "planned" ? <><Check size={13} aria-hidden="true" /> Gepland</> : "Plannen"}
              </button>
            </>
          )}
        </div>
      </div>

      {gated && (
        <ContractGate
          profiles={profiles}
          initialA={aId}
          initialB={bId}
          contractSeries={contractSeries}
        />
      )}

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
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {topKinks.length > 0 && (
            <div className="mb-5">
              <p className="text-sm mb-3" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--accent2)" }}>Meest gebruikt</p>
              <div className="flex flex-wrap gap-2">
                {topKinks.map((k) => (
                  <KinkChip key={k.id} name={directionalCompareLabel(k.id, k.name)} added={addedKinkIds.has(k.id)} color="var(--accent2)" onAdd={() => addFromKink(directionalCompareLabel(k.id, k.name), k.id)} />
                ))}
              </div>
            </div>
          )}

          {mutualKinks.length > 0 && (
            <div className="mb-5">
              <p className="text-sm mb-3" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--yes)" }}>Wederzijds</p>
              <div className="flex flex-wrap gap-2">
                {mutualKinks.map((k) => (
                  <KinkChip key={k.id} name={directionalCompareLabel(k.id, k.name)} added={addedKinkIds.has(k.id)} color="var(--yes)" onAdd={() => addFromKink(directionalCompareLabel(k.id, k.name), k.id)} />
                ))}
              </div>
            </div>
          )}

          {spanningKinks.length > 0 && (
            <div>
              <p className="text-sm mb-3" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--no)" }}>Spanning</p>
              <div className="flex flex-wrap gap-2">
                {spanningKinks.map((k) => (
                  <KinkChip key={k.id} name={directionalCompareLabel(k.id, k.name)} added={addedKinkIds.has(k.id)} color="var(--no)" onAdd={() => addFromKink(directionalCompareLabel(k.id, k.name), k.id)} />
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