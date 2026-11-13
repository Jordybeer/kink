"use client";
import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import DisclosureBody from "@/components/ui/DisclosureBody";
import { useMotionSafe } from "@/lib/motion";
import { useStore, useHasHydrated } from "@/lib/store";
import { useContractStore } from "@/lib/contractStore";
import { KINKS } from "@/lib/kinks";
import type { Profile, SceneItem, SceneRecord } from "@/types";
import {
  activeSignedContractForPair,
  contractVersionById,
} from "@/lib/contractLifecycle";
import Sheet from "@/components/Sheet";
import PageShell from "@/components/PageShell";
import ProfileSelect from "@/components/ProfileSelect";
import TimePicker from "@/components/TimePicker";
import DurationStepper from "@/components/DurationStepper";
import AftercareSheet from "@/components/AftercareSheet";
import { ArrowRight, CaretDown, CaretRight, CaretUp, Check, ListPlus, Plus, Trash } from "@phosphor-icons/react";
import { moveUp, moveDown } from "@/lib/sceneOrder";
import { comparableEntry, visibleStatus, visibleUsedInScene } from "@/lib/privateResponses";
import { directionalCompareLabel, directionalComparisonEntries } from "@/lib/directionality";
import { splitProfilesByOwnership } from "@/lib/profileType";
import { readPartnerProfileId } from "@/lib/partnerPreference";
import { sceneDetailHref } from "@/lib/localRoutes";

function uid() {
  return crypto.randomUUID();
}

function SceneArcBar({ items }: { items: SceneItem[] }) {
  if (items.length === 0) return null;
  const counts = { zacht: 0, midden: 0, intens: 0 };
  for (const it of items) counts[it.intensity]++;
  const total = items.length;
  const segments = [
    { key: "zacht" as const, color: "var(--willing)", flex: counts.zacht / total },
    { key: "midden" as const, color: "var(--maybe)", flex: counts.midden / total },
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
  const t = useMotionSafe();
  const moveUpRef = useRef<HTMLButtonElement>(null);
  const moveDownRef = useRef<HTMLButtonElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const visibleDetails = locked || detailsOpen;
  const color = intensityColor(item.intensity);
  const detailsId = `scene-item-details-${item.id}`;

  return (
    <motion.div
      layout={t.reduced ? false : "position"}
      initial={t.reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...t.fast, layout: t.disclosure }}
      className="scene-item-reorder mb-2 flex items-stretch overflow-hidden rounded-2xl"
      aria-disabled={locked}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
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
                className="focus-ring ks-motion-choice rounded-full border px-3 text-xs disabled:opacity-60"
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
            aria-expanded={visibleDetails}
            aria-controls={detailsId}
            className="ks-motion-choice focus-ring ml-auto min-h-11 rounded-lg px-2 text-xs"
            style={{ color: visibleDetails ? "var(--accent)" : "var(--text2)" }}
          >
            {visibleDetails ? "Minder" : "Details"}
          </button>
        </div>

        <DisclosureBody open={visibleDetails} id={detailsId} contentClassName="space-y-3 pt-3">
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
            aria-label={`Notitie bij ${item.name}`}
            className="focus-ring w-full resize-none rounded-lg px-3 py-2 focus:outline-none read-only:opacity-70"
            style={{ background: "var(--surface2)", border: "1px solid var(--control-border)", color: "var(--text)", fontSize: 14 }}
          />

          {!locked && (
            <div className="flex items-center gap-1 border-t pt-2" style={{ borderColor: "var(--border)" }}>
              <span className="mr-auto text-xs" style={{ color: "var(--text2)" }}>Volgorde &amp; beheer</span>
              <button
                ref={moveUpRef}
                onClick={() => {
                  onMoveUp(index);
                  // At the endpoint this control becomes disabled. Keep keyboard
                  // focus on the same item, on its remaining reorder action.
                  if (index === 1) requestAnimationFrame(() => moveDownRef.current?.focus({ preventScroll: true }));
                }}
                disabled={index === 0}
                aria-label="Naar boven verplaatsen"
                className="ks-motion-choice focus-ring flex h-11 w-11 items-center justify-center rounded-lg disabled:opacity-30"
                style={{ color: "var(--text2)" }}
              >
                <CaretUp size={16} aria-hidden="true" />
              </button>
              <button
                ref={moveDownRef}
                onClick={() => {
                  onMoveDown(index);
                  if (index === totalItems - 2) requestAnimationFrame(() => moveUpRef.current?.focus({ preventScroll: true }));
                }}
                disabled={index === totalItems - 1}
                aria-label="Naar beneden verplaatsen"
                className="ks-motion-choice focus-ring flex h-11 w-11 items-center justify-center rounded-lg disabled:opacity-30"
                style={{ color: "var(--text2)" }}
              >
                <CaretDown size={16} aria-hidden="true" />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                aria-label={`${item.name} verwijderen`}
                className="ks-motion-choice focus-ring flex h-11 w-11 items-center justify-center rounded-lg"
                style={{ color: "var(--hard-no)" }}
              >
                <Trash size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </DisclosureBody>
      </div>
    </motion.div>
  );
}

function KinkChip({
  name, added, color, onAdd, featured = false,
}: { name: string; added: boolean; color: string; onAdd: () => void; featured?: boolean }) {
  const t = useMotionSafe();
  return (
    <motion.button
      type="button"
      onClick={onAdd}
      disabled={added}
      data-added={added}
      aria-label={`${name}, ${added ? "Toegevoegd" : "Toevoegen aan setlist"}`}
      whileTap={t.tap}
      transition={t.state}
      className={`ks-modal-choice ks-motion-choice focus-ring min-w-0 ${featured ? "ks-modal-choice-featured" : ""} disabled:cursor-default`}
      style={{ "--choice-color": color } as import("react").CSSProperties}
    >
      <span className="ks-modal-choice-rail" aria-hidden="true" />
      <span className="min-w-0 flex-1 break-words text-sm font-semibold leading-5">{name}</span>
      <span aria-hidden="true" className="ks-modal-choice-action">
        {added ? <Check size={16} weight="bold" /> : <Plus size={17} />}
      </span>
    </motion.button>
  );
}

function ScenePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profiles, scenes, saveScene, lockSceneConsent, completeScene, pinnedProfileId } = useStore();
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
  const [suggestionSearch, setSuggestionSearch] = useState("");
  const [showAftercare, setShowAftercare] = useState(false);

  const currentScene = sceneId ? scenes.find((s) => s.id === sceneId) ?? null : null;
  const isConsentLocked = !!(
    currentScene?.consentLockedAt
    || currentScene?.consentSnapshots
    || currentScene?.consentAgreement
  );
  const ownership = splitProfilesByOwnership(profiles, pinnedProfileId);
  const preferredOwn = ownership.mine.find((profile) => profile.id === pinnedProfileId) ?? ownership.mine[0];
  const preferredPartnerId = _hasHydrated ? readPartnerProfileId() : null;
  const preferredPartner = ownership.shared.find((profile) => profile.id === preferredPartnerId);
  const canUsePartnerDefault = !sceneIdParam && !aId && !bId && !!preferredOwn && !!preferredPartner;
  const fallbackAId = canUsePartnerDefault ? preferredOwn?.id ?? "" : "";
  const fallbackBId = canUsePartnerDefault ? preferredPartner?.id ?? "" : "";
  const resolvedAId = currentScene?.profileAId ?? (aId || fallbackAId);
  const resolvedBId = currentScene?.profileBId ?? (bId || fallbackBId);
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

  function selectProfile(side: "a" | "b", profileId: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("id");
    if (resolvedAId) next.set("a", resolvedAId);
    if (resolvedBId) next.set("b", resolvedBId);
    next.set(side, profileId);
    const otherSide = side === "a" ? "b" : "a";
    if (next.get(otherSide) === profileId) next.delete(otherSide);
    setSaveError(null);
    router.replace(`/scene?${next.toString()}`);
  }

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
    if (!profileA || !profileB || profileA.id === profileB.id) {
      setSaveError("Kies twee verschillende profielen voordat je deze scène opslaat.");
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
  const showEditorBar = !isCompleted && !isConsentLocked;
  const showPlayBar = currentScene?.status === "planned" && isConsentLocked;
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
  const activeContract = resolvedAId && resolvedBId && resolvedAId !== resolvedBId
    ? activeSignedContractForPair(contractSeries, resolvedAId, resolvedBId)
    : undefined;
  const needsProfiles = !sceneIdParam && (!profileA || !profileB || profileA.id === profileB.id);
  const showOptionalContract = !sceneIdParam && !needsProfiles && !activeContract;

  return (
    <>
      <main
        className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col px-4"
        style={{
          paddingTop: 20,
          paddingBottom: showEditorBar
            ? "calc(136px + env(safe-area-inset-bottom))"
            : showPlayBar
              ? "calc(72px + env(safe-area-inset-bottom))"
              : 32,
        }}
      >
        <div className="mb-3 grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-2">
          <Link
            href={backHref}
            prefetch={false}
            aria-label="Terug"
            className="ks-motion-choice focus-ring flex h-11 w-11 items-center rounded-lg"
            style={{ color: "var(--text2)", fontSize: 13 }}
          >
            <ArrowRight size={16} className="rotate-180" aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <label htmlFor="scene-title" className="sr-only">Naam van scène</label>
            <input
              id="scene-title"
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
          <button
            type="button"
            onClick={handleExport}
            disabled={items.length === 0}
            className="ks-motion-choice focus-ring min-h-11 rounded-xl px-3 text-xs font-semibold disabled:opacity-35"
            style={{ color: "var(--text2)", border: "1px solid var(--border)" }}
            aria-label="Exporteer scène als PDF"
          >
            PDF
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="grid min-w-0 gap-1">
            <label htmlFor="scene-date" className="text-xs font-medium" style={{ color: "var(--text2)" }}>Datum</label>
            <input
              id="scene-date"
              type="date"
              value={sceneDate}
              onChange={(e) => { if (!isConsentLocked) { setSceneDate(e.target.value); setSaved(false); } }}
              disabled={isConsentLocked}
              className="focus-ring min-w-0 max-w-full rounded-lg px-2 focus:outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--control-border)", color: "var(--text2)", fontSize: 16, minHeight: "var(--touch-target)" }}
            />
          </div>
          <div className="grid gap-1">
            <label htmlFor="scene-time" className="text-xs font-medium" style={{ color: "var(--text2)" }}>Tijd</label>
            <TimePicker
              id="scene-time"
              value={sceneTime}
              disabled={isConsentLocked}
              onChange={(v) => { if (!isConsentLocked) { setSceneTime(v); setSaved(false); } }}
            />
          </div>
        </div>

        {needsProfiles && (
          <section
            className="mb-3 rounded-xl p-3"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            aria-labelledby="scene-profiles-title"
          >
            <p id="scene-profiles-title" className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Voor wie is deze scène?
            </p>
            <p className="mt-1 text-xs leading-5" style={{ color: "var(--text2)" }}>
              Kies twee profielen. Een contract is optioneel.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <ProfileSelect
                profiles={profiles}
                value={resolvedAId}
                onChange={(id) => selectProfile("a", id)}
                placeholder="Profiel A"
              />
              <ProfileSelect
                profiles={profiles}
                value={resolvedBId}
                onChange={(id) => selectProfile("b", id)}
                placeholder="Profiel B"
              />
            </div>
          </section>
        )}

        {showOptionalContract && profileA && profileB && (
          <section
            className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1"
            aria-labelledby="scene-contract-title"
          >
            <div className="min-w-0 flex-1">
              <p id="scene-contract-title" className="text-sm" style={{ color: "var(--text2)" }}>
                Een contract is optioneel.
              </p>
            </div>
            <Link
              href={`/contract?a=${profileA.id}&b=${profileB.id}`}
              className="ks-motion-choice focus-ring inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Contract opstellen
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </section>
        )}

        <div className="mb-3 flex items-center gap-2">
          <label htmlFor="scene-safeword" className="flex-none text-xs font-semibold" style={{ color: "var(--hard-no)", minWidth: 72 }}>Safeword</label>
          <input
            id="scene-safeword"
            type="text"
            value={safeword}
            onChange={(e) => { if (!isConsentLocked) { setSafeword(e.target.value); setSaved(false); } }}
            disabled={isConsentLocked}
            placeholder="bijv. rood"
            className="focus-ring min-w-0 flex-1 rounded-lg px-3 focus:outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--control-border)", color: "var(--text)", fontSize: 14, minHeight: "var(--touch-target)" }}
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
            className="ks-motion-choice focus-ring mb-4 flex min-h-12 w-full items-center justify-between rounded-xl px-3"
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
              <p className="text-sm" style={{ color: "var(--text2)" }}>{hasKinks && !isCompleted && !isConsentLocked ? "Kies ‘Kinks toevoegen’ of voeg onderaan een eigen item toe." : "Voeg onderaan een eigen item toe."}</p>
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

      {showEditorBar && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40"
          style={{ background: "color-mix(in srgb, var(--bg) 92%, transparent)", backdropFilter: "blur(18px)", borderTop: "1px solid var(--border)", padding: "10px 16px", paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
        >
          {saveError && (
            <div className="mx-auto mb-2 max-w-3xl">
              <p role="alert" className="text-xs ks-fade-in" style={{ color: "var(--hard-no)" }}>{saveError}</p>
            </div>
          )}
          <div className="mx-auto max-w-3xl">
            <div className="flex gap-2">
              <label htmlFor="scene-own-item" className="sr-only">Eigen item</label>
              <input
                id="scene-own-item"
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addManualItem(); }}
                placeholder="Eigen item…"
                className="focus-ring min-w-0 flex-1 rounded-xl px-3 focus:outline-none"
                style={{ background: "var(--surface)", border: "1px solid var(--control-border)", color: "var(--text)", fontSize: 14, height: 44 }}
              />
              <button
                onClick={addManualItem}
                aria-label="Item toevoegen"
                className="ks-motion-choice focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-xl font-bold"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}
              >
                <Plus size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-2">
              <button
                onClick={() => handleSave("draft")}
                disabled={items.length === 0}
                className="ks-motion-choice focus-ring inline-flex min-h-11 items-center justify-center gap-1 rounded-xl px-3 text-sm font-bold disabled:opacity-40"
                style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
              >
                {savedStatus === "draft" ? <><Check size={14} aria-hidden="true" /> Opgeslagen</> : "Opslaan"}
              </button>
              <button
                onClick={() => handleSave("planned")}
                disabled={items.length === 0}
                className="ks-motion-choice focus-ring inline-flex min-h-11 items-center justify-center gap-1 rounded-xl px-3 text-sm font-semibold disabled:opacity-40"
                style={{ background: "var(--surface)", border: "1px solid var(--border-accent)", color: savedStatus === "planned" ? "var(--accent)" : "var(--text)" }}
                aria-label="Scène inplannen"
                aria-describedby="scene-plan-lock-note"
              >
                {savedStatus === "planned" ? <><Check size={14} aria-hidden="true" /> Ingepland</> : "Inplannen"}
              </button>
            </div>
            <p id="scene-plan-lock-note" className="mt-1.5 text-center text-[11px] leading-4" style={{ color: "var(--text2)" }}>
              Inplannen zet activiteiten, intensiteiten en safeword vast.
            </p>
          </div>
        </div>
      )}

      {showPlayBar && currentScene && (
        <div
          data-scene-play-bar
          className="fixed bottom-0 left-0 right-0 z-40"
          style={{ background: "color-mix(in srgb, var(--bg) 94%, transparent)", backdropFilter: "blur(18px)", borderTop: "1px solid var(--border)", padding: "10px 16px", paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto max-w-3xl">
            <button
              type="button"
              onClick={() => setShowAftercare(true)}
              className="ks-motion-choice focus-ring min-h-11 w-full rounded-xl px-4 text-sm font-bold"
              style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
            >
              Scène afronden
            </button>
          </div>
        </div>
      )}

      {showAftercare && currentScene && (
        <AftercareSheet
          onSave={(entry) => {
            completeScene(currentScene.id, entry);
            setShowAftercare(false);
            router.replace(sceneDetailHref(currentScene.id));
          }}
          onClose={() => setShowAftercare(false)}
        />
      )}

      <Sheet
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Toevoegen aan setlist"
        eyebrow="Scène / samenstellen"
        subtitle="Een setlist van dingen die jullie écht willen verkennen."
        aria-label="Kinks toevoegen"
        variant="surface"
        scrollable
        headerIcon={<ListPlus size={20} aria-hidden="true" />}
        footer={
          <div className="grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-[minmax(0,1fr)_auto] min-[360px]:items-center">
            <span className="min-w-0 break-words text-sm" style={{ color: "var(--text2)" }}>
              {items.length} {items.length === 1 ? "item" : "items"} in de setlist
            </span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="ks-modal-primary ks-motion-choice focus-ring min-h-11 min-w-0 w-full rounded-xl px-5 text-sm font-semibold whitespace-normal min-[360px]:w-auto"
              style={{ color: "var(--on-accent-fill)" }}
            >
              Klaar
            </button>
          </div>
        }
      >
        <div className="pb-2">
          <p className="mb-4 text-sm leading-5" style={{ color: "var(--text2)" }}>
            Suggesties helpen kiezen, maar zijn nooit automatisch toestemming.
          </p>
          <label htmlFor="scene-suggestion-search" className="sr-only">Zoek een interesse</label>
          <input
            id="scene-suggestion-search"
            type="search"
            value={suggestionSearch}
            onChange={(event) => setSuggestionSearch(event.target.value)}
            placeholder="Zoek een interesse"
            className="focus-ring mb-5 min-h-12 w-full min-w-0 rounded-xl px-4 text-base outline-none"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
          />

          {topKinks.some((k) => directionalCompareLabel(k.id, k.name).toLocaleLowerCase().includes(suggestionSearch.trim().toLocaleLowerCase())) && (
            <section className="mb-5" aria-label="Meest gebruikt">
              <h3 className="ks-modal-section-title mb-3" style={{ color: "var(--accent2)" }}>Meest gebruikt</h3>
              <div className="grid gap-1">
                {topKinks.filter((k) => directionalCompareLabel(k.id, k.name).toLocaleLowerCase().includes(suggestionSearch.trim().toLocaleLowerCase())).map((k, index) => (
                  <KinkChip key={k.id} name={directionalCompareLabel(k.id, k.name)} added={addedKinkIds.has(k.id)} color="var(--accent2)" featured={index === 0} onAdd={() => addFromKink(directionalCompareLabel(k.id, k.name), k.id)} />
                ))}
              </div>
            </section>
          )}

          {mutualKinks.some((k) => directionalCompareLabel(k.id, k.name).toLocaleLowerCase().includes(suggestionSearch.trim().toLocaleLowerCase())) && (
            <section className="mb-5" aria-label="Wederzijds">
              <h3 className="ks-modal-section-title mb-3" style={{ color: "var(--yes)" }}>Wederzijds</h3>
              <div className="grid gap-1">
                {mutualKinks.filter((k) => directionalCompareLabel(k.id, k.name).toLocaleLowerCase().includes(suggestionSearch.trim().toLocaleLowerCase())).map((k) => (
                  <KinkChip key={k.id} name={directionalCompareLabel(k.id, k.name)} added={addedKinkIds.has(k.id)} color="var(--yes)" onAdd={() => addFromKink(directionalCompareLabel(k.id, k.name), k.id)} />
                ))}
              </div>
            </section>
          )}

          {spanningKinks.some((k) => directionalCompareLabel(k.id, k.name).toLocaleLowerCase().includes(suggestionSearch.trim().toLocaleLowerCase())) && (
            <section className="mb-5" aria-label="Spanning">
              <h3 className="ks-modal-section-title mb-3" style={{ color: "var(--no)" }}>Spanning</h3>
              <div className="grid gap-1">
                {spanningKinks.filter((k) => directionalCompareLabel(k.id, k.name).toLocaleLowerCase().includes(suggestionSearch.trim().toLocaleLowerCase())).map((k) => (
                  <KinkChip key={k.id} name={directionalCompareLabel(k.id, k.name)} added={addedKinkIds.has(k.id)} color="var(--no)" onAdd={() => addFromKink(directionalCompareLabel(k.id, k.name), k.id)} />
                ))}
              </div>
            </section>
          )}
          {suggestionSearch.trim() && ![...topKinks, ...mutualKinks, ...spanningKinks].some(
            (k) => directionalCompareLabel(k.id, k.name).toLocaleLowerCase().includes(suggestionSearch.trim().toLocaleLowerCase()),
          ) && (
            <p className="py-5 text-center text-sm" style={{ color: "var(--text2)" }}>
              Geen suggesties gevonden. Je kunt zelf een item toevoegen in je setlist.
            </p>
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
