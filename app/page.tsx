"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { Settings, Pin, PinOff, Pencil } from "lucide-react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, useHasHydrated } from "@/lib/store";
import { KINKS, LEVEL_MAX } from "@/lib/kinks";
import { ROLE_GROUPS, EXPERIENCE_LEVELS, RELATIONSHIP_STATUSES } from "@/lib/roles";
import type { ExperienceLevel, Profile } from "@/types";
import Onboarding from "@/components/Onboarding";
import QRScanner from "@/components/QRScanner";
import { decodeAny } from "@/lib/shareProfile";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const TOTAL_KINKS = KINKS.length;
const DESTROY_PHRASE = "wis alles";


function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    profiles,
    createProfile,
    deleteProfile,
    renameProfile,
    importProfiles,
    onboardingComplete,
    completeOnboarding,
    installPromptDismissed,
    dismissInstallPrompt,
    theme,
    setTheme,
    pinnedProfileId,
    pinProfile,
    unpinProfile,
    resetProfileTour,
  } = useStore();
  const _hasHydrated = useHasHydrated();
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("Switch");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editLevel, setEditLevel] = useState<ExperienceLevel>("beginner");
  const [editRelationshipStatus, setEditRelationshipStatus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [destroyOpen, setDestroyOpen] = useState(false);
  const [destroyPhrase, setDestroyPhrase] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<Profile | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importDragY, setImportDragY] = useState(0);
  const [importDragging, setImportDragging] = useState(false);
  const importDragStart = useRef(0);
  const settingsSheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(settingsSheetRef, settingsOpen);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const p = searchParams.get("p");
    if (!p) return;
    try {
      const incoming = decodeAny(p);
      setImportPreview(incoming);
    } catch {
      // ongeldige parameter, negeren
    }
  }, [searchParams]);

  async function handleInstall() {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      await deferredPrompt.current.userChoice;
      deferredPrompt.current = null;
    }
    dismissInstallPrompt();
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const id = createProfile(name.trim(), role, experienceLevel, relationshipStatus || undefined);
    setName("");
    setRelationshipStatus("");
    router.push(`/profile/${id}`);
  }

  function startEdit(p: { id: string; name: string; role: string; experienceLevel: ExperienceLevel; relationshipStatus?: string }) {
    setEditId(p.id);
    setEditName(p.name);
    setEditRole(p.role);
    setEditLevel(p.experienceLevel ?? "beginner");
    setEditRelationshipStatus(p.relationshipStatus ?? "");
  }

  function saveEdit() {
    if (!editId || !editName.trim()) return;
    const existing = profiles.find((p) => p.id === editId);
    renameProfile(editId, editName.trim(), editRole, editLevel, editRelationshipStatus || undefined, existing?.fetLifeUsername);
    setEditId(null);
  }

  function promptDelete(id: string) {
    setDeleteTarget(id);
    setSheetOpen(true);
  }

  function confirmDelete() {
    if (deleteTarget) deleteProfile(deleteTarget);
    setSheetOpen(false);
    setTimeout(() => setDeleteTarget(null), 300);
  }

  function cancelDelete() {
    setSheetOpen(false);
    setTimeout(() => setDeleteTarget(null), 300);
  }

  function handleDestroyAll() {
    localStorage.clear();
    window.location.reload();
  }

  function exportProfiles() {
    const data = JSON.stringify({ version: 1, profiles }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `kinksync-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null);
    setImportSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed.profiles || !Array.isArray(parsed.profiles)) {
          setImportError("Ongeldig bestand — geen geldige profielen gevonden.");
          return;
        }
        const incoming = parsed.profiles as Profile[];
        const existing = new Set(profiles.map((p: Profile) => p.id));
        const newOnes = incoming.filter((p: Profile) => !existing.has(p.id));
        if (!newOnes.length) {
          setImportError("Alle profielen in dit bestand bestaan al.");
          return;
        }
        importProfiles(newOnes.map((p: Profile) => ({ ...p, isImported: true })));
        setImportSuccess(`${newOnes.length} profiel(en) toegevoegd.`);
      } catch {
        setImportError("Bestand kon niet worden gelezen.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  if (!_hasHydrated) return null;

  if (!onboardingComplete) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  const pinnedProfile = profiles.find((p) => p.id === pinnedProfileId);
  const compareProfiles = pinnedProfile
    ? [pinnedProfile.id, profiles.find((p) => p.id !== pinnedProfileId)?.id ?? profiles[1]?.id].filter(Boolean)
    : profiles.slice(0, 2).map((p) => p.id);
  const deleteTargetProfile = profiles.find((p) => p.id === deleteTarget);

  // Group profiles by name for multi-role display
  const grouped = profiles.reduce<Map<string, typeof profiles>>((map, p) => {
    const key = p.name.toLowerCase().trim();
    map.set(key, [...(map.get(key) ?? []), p]);
    return map;
  }, new Map());
  const profileGroups = Array.from(grouped.values()).sort((a, b) =>
    a.some((p) => p.id === pinnedProfileId) ? -1 : b.some((p) => p.id === pinnedProfileId) ? 1 : 0
  );

  return (
    <>
      <main className="max-w-2xl mx-auto px-4 py-10 pb-24 w-full">
        {/* Hero */}
        <div className="mb-8 text-center relative">
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Instellingen openen"
            className="focus-ring absolute top-0 right-0 p-1 leading-none"
            style={{ color: "var(--text2)" }}
          >
            <Settings size={18} />
          </button>
          <h1
            className="text-3xl font-bold"
            style={{
              background: "linear-gradient(90deg, var(--accent), var(--accent2))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            KinkSync
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
            Verken grenzen. Samen. — <span className="opacity-50 text-xs">kinksync.be</span>
          </p>
        </div>

        {/* Create profile form — always visible when no profiles, toggle otherwise */}
        {profiles.length > 0 && (
          <button
            onClick={() => setFormOpen(v => !v)}
            className="focus-ring w-full rounded-xl p-4 mb-3 flex items-center gap-3 text-left transition-colors"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <span className="flex-1 text-sm font-medium" style={{ color: "var(--text2)" }}>
              {formOpen ? "▲ Annuleer" : "+ Nieuw profiel"}
            </span>
          </button>
        )}
        {(profiles.length === 0 || formOpen) && (
        <form
          onSubmit={(e) => { handleCreate(e); setFormOpen(false); }}
          className="rounded-xl p-5 mb-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="font-semibold text-xs uppercase tracking-widest mb-4" style={{ color: "var(--text2)" }}>
            Nieuw profiel
          </h2>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Naam of alias…"
            className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none placeholder-[color:var(--text2)]"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
          />

          <label htmlFor="role-select" className="text-xs mb-1.5 font-medium block" style={{ color: "var(--text2)" }}>Rol</label>
          <select
            id="role-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
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
                onClick={() => setExperienceLevel(l.value)}
                aria-pressed={experienceLevel === l.value}
                className="focus-ring flex flex-col items-center py-2 rounded-lg text-xs font-medium transition-colors border"
                style={
                  experienceLevel === l.value
                    ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                    : { color: "var(--text2)", borderColor: "var(--border)" }
                }
              >
                <span className="font-semibold">{l.label}</span>
                <span className="text-[10px] opacity-70">{l.sub}</span>
              </button>
            ))}
          </div>

          <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>Relatiestatus <span className="font-normal opacity-60">(optioneel)</span></p>
          <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Relatiestatus">
            {RELATIONSHIP_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRelationshipStatus((rs) => (rs === s ? "" : s))}
                aria-pressed={relationshipStatus === s}
                className="focus-ring px-3 py-1 rounded-full text-xs font-medium transition-colors border"
                style={
                  relationshipStatus === s
                    ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                    : { color: "var(--text2)", borderColor: "var(--border)" }
                }
              >
                {s}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="focus-ring w-full py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            Sla jezelf vast →
          </button>
        </form>
        )}

        {/* Scan QR button — verborgen terwijl import-sheet open is */}
        {!importPreview && <button
          onClick={() => setScanOpen(true)}
          className="focus-ring w-full rounded-xl p-4 mb-3 flex items-center gap-3 text-left transition-colors"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span className="text-lg" aria-hidden="true">📷</span>
          <span className="flex-1 text-sm font-medium" style={{ color: "var(--text2)" }}>
            Scan QR — importeer profiel van partner
          </span>
        </button>}

        {/* Profile list */}
        {profiles.length === 0 ? (
          <p className="text-center text-sm py-12" style={{ color: "var(--text2)" }}>
            Nog geen profielen. Wie ben jij in de speelkamer?
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-3 mb-6">
              {profileGroups.map((group) => {
                const groupName = group[0].name;
                const isMulti = group.length > 1;
                return (
                  <div key={groupName.toLowerCase().trim()}>
                    {isMulti && (
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <div
                          className="w-6 h-6 rounded-full flex-none overflow-hidden"
                          aria-hidden="true"
                        >
                          {group[0].avatarDataUrl ? (
                            <img src={group[0].avatarDataUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-black" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}>
                              {groupName[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-semibold">{groupName}</span>
                        <span className="text-xs" style={{ color: "var(--text2)" }}>{group.length} rollen</span>
                        {group.length === 2 && (
                          <Link
                            href={`/compare?a=${group[0].id}&b=${group[1].id}`}
                            className="focus-ring ml-auto text-xs px-2.5 py-1 rounded-full border transition-colors"
                            style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
                          >
                            Vergelijk rollen
                          </Link>
                        )}
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      {group.map((p) => {
                        const rated = Object.values(p.entries).filter((e) => e.status).length;
                        const maxKinks = KINKS.filter((k) => k.level <= LEVEL_MAX[p.experienceLevel ?? "beginner"]).length;
                        const progress = maxKinks > 0 ? (rated / maxKinks) * 100 : 0;
                        const initial = p.name[0].toUpperCase();
                        const lvl = EXPERIENCE_LEVELS.find((l) => l.value === (p.experienceLevel ?? "beginner"));

                        return (
                          <div
                            key={p.id}
                            className="rounded-xl overflow-hidden"
                            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                          >
                            {editId === p.id ? (
                              <div className="p-4">
                                <input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="focus-ring w-full rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none"
                                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                                />
                                <label htmlFor="role-select-edit" className="text-xs mb-1.5 block" style={{ color: "var(--text2)" }}>Rol</label>
                                <select
                                  id="role-select-edit"
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value)}
                                  className="focus-ring w-full rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none"
                                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                                >
                                  {ROLE_GROUPS.map((g) => (
                                    <optgroup key={g.label} label={g.label}>
                                      {g.roles.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </optgroup>
                                  ))}
                                </select>
                                <p className="text-xs mb-1.5" style={{ color: "var(--text2)" }}>Ervaringsniveau</p>
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
                                <p className="text-xs mb-1.5" style={{ color: "var(--text2)" }}>Relatiestatus <span className="opacity-60">(optioneel)</span></p>
                                <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Relatiestatus">
                                  {RELATIONSHIP_STATUSES.map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => setEditRelationshipStatus((rs) => (rs === s ? "" : s))}
                                      aria-pressed={editRelationshipStatus === s}
                                      className="focus-ring px-3 py-1 rounded-full text-xs font-medium transition-colors border"
                                      style={
                                        editRelationshipStatus === s
                                          ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                                          : { color: "var(--text2)", borderColor: "var(--border)" }
                                      }
                                    >
                                      {s}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={saveEdit}
                                    className="focus-ring flex-1 py-2 rounded-lg text-sm font-medium"
                                    style={{ background: "var(--accent)", color: "#000" }}
                                  >
                                    Opslaan
                                  </button>
                                  <button
                                    onClick={() => setEditId(null)}
                                    className="focus-ring px-4 py-2 rounded-lg border text-sm"
                                    style={{ borderColor: "var(--border)", color: "var(--text2)" }}
                                  >
                                    Annuleer
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex gap-3 px-3 pt-3 pb-2.5">
                                  {!isMulti && (
                                    <div className="w-10 h-10 rounded-full flex-none overflow-hidden mt-0.5" aria-hidden="true">
                                      {p.avatarDataUrl ? (
                                        <img src={p.avatarDataUrl} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-black" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}>
                                          {initial}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    {/* Row 1: name (or role in grouped view) + icon actions */}
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      {isMulti
                                        ? <span className="text-sm font-medium truncate" style={{ color: "var(--text2)" }}>{p.role}</span>
                                        : <span className="text-sm font-semibold truncate">{p.name}</span>
                                      }
                                      <div className="flex items-center gap-0 flex-none ml-auto">
                                        <button
                                          onClick={() => p.id === pinnedProfileId ? unpinProfile() : pinProfile(p.id)}
                                          aria-label={p.id === pinnedProfileId ? `${p.name} losmaken als hoofdprofiel` : `${p.name} vastpinnen als hoofdprofiel`}
                                          title={p.id === pinnedProfileId ? "Losmaken" : "Vastpinnen"}
                                          className="focus-ring w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                                          style={{ color: p.id === pinnedProfileId ? "var(--accent)" : "var(--text2)" }}
                                        >
                                          {p.id === pinnedProfileId ? <PinOff size={15} /> : <Pin size={15} />}
                                        </button>
                                        <button
                                          onClick={() => startEdit(p)}
                                          aria-label={`Profiel ${p.name} bewerken`}
                                          title="Bewerken"
                                          className="focus-ring w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                                          style={{ color: "var(--text2)" }}
                                        >
                                          <Pencil size={15} />
                                        </button>
                                        <button
                                          onClick={() => promptDelete(p.id)}
                                          aria-label={`Profiel ${p.name} verwijderen`}
                                          title="Verwijderen"
                                          className="focus-ring w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                                          style={{ color: "var(--text2)" }}
                                        >
                                          🗑
                                        </button>
                                      </div>
                                    </div>
                                    {/* Row 2: badges */}
                                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                      {p.id === pinnedProfileId && (
                                        <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)", border: "1px solid var(--accent)" }}>
                                          Mijn profiel
                                        </span>
                                      )}
                                      {!isMulti && (
                                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}>
                                          {p.role}
                                        </span>
                                      )}
                                      {lvl && (
                                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                                          {lvl.label}
                                        </span>
                                      )}
                                      {p.relationshipStatus && (
                                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}>
                                          {p.relationshipStatus}
                                        </span>
                                      )}
                                    </div>
                                    {/* Row 3: progress count + open button */}
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs tabular-nums" style={{ color: "var(--text2)" }}>
                                        {rated} / {maxKinks} beoordeeld
                                      </span>
                                      <Link
                                        href={`/profile/${p.id}`}
                                        className="focus-ring px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-none"
                                        style={{ background: "var(--accent)", color: "#000" }}
                                      >
                                        Open →
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                                <div className="h-1 mx-3 mb-3 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                                  <div
                                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                                    style={{
                                      width: `${progress}%`,
                                      background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                                    }}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compare CTA */}
            <div className="flex flex-col gap-3">
              {profiles.length >= 2 ? (
                <Link
                  href={`/compare?a=${compareProfiles[0]}&b=${compareProfiles[1]}`}
                  className="focus-ring block rounded-xl p-5 text-center transition-opacity hover:opacity-90"
                  style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
                >
                  <div className="text-base font-semibold" style={{ color: "var(--accent)" }}>
                    ⚡ Vergelijk profielen
                  </div>
                  <div className="text-sm mt-1" style={{ color: "var(--text2)" }}>
                    Ontdek waar jullie grenzen — en verlangens — overlappen.
                  </div>
                  {profiles.length > 2 && (
                    <div className="text-xs mt-1 opacity-50">{pinnedProfile ? `${pinnedProfile.name} + eerste andere` : "eerste twee profielen"}</div>
                  )}
                </Link>
              ) : (
                <div
                  className="rounded-xl p-5 text-center opacity-40"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  role="button"
                  tabIndex={0}
                  aria-disabled="true"
                  aria-label="Vergelijk profielen — voeg een tweede profiel toe om te vergelijken"
                >
                  <div className="text-base font-semibold" style={{ color: "var(--text2)" }}>
                    ⚡ Vergelijk profielen
                  </div>
                  <div className="text-sm mt-1" style={{ color: "var(--text2)" }}>
                    Voeg een tweede profiel toe om te vergelijken.
                  </div>
                </div>
              )}

              {profiles.length >= 2 ? (
                <Link
                  href={`/contract?a=${compareProfiles[0]}&b=${compareProfiles[1]}`}
                  className="focus-ring block rounded-xl p-5 text-center transition-opacity hover:opacity-90"
                  style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
                >
                  <div className="text-base font-semibold" style={{ color: "var(--accent)" }}>
                    ✍ Maak een contract
                  </div>
                  <div className="text-sm mt-1" style={{ color: "var(--text2)" }}>
                    Leg afspraken vast, safewords en aftercare — en exporteer als PDF.
                  </div>
                </Link>
              ) : (
                <div
                  className="rounded-xl p-5 text-center opacity-40"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  role="button"
                  tabIndex={0}
                  aria-disabled="true"
                  aria-label="Maak een contract — voeg twee profielen toe om een contract te maken"
                >
                  <div className="text-base font-semibold" style={{ color: "var(--text2)" }}>
                    ✍ Maak een contract
                  </div>
                  <div className="text-sm mt-1" style={{ color: "var(--text2)" }}>
                    Voeg twee profielen toe om een contract te maken.
                  </div>
                </div>
              )}

              <Link
                href="/scene"
                className="focus-ring block rounded-xl p-5 text-center transition-opacity hover:opacity-90"
                style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
              >
                <div className="text-base font-semibold" style={{ color: "var(--accent)" }}>
                  🎬 Scène planner
                </div>
                <div className="text-sm mt-1" style={{ color: "var(--text2)" }}>
                  Plan activiteiten, intensiteit en timing vooraf.
                </div>
              </Link>

              <Link
                href="/session"
                className="focus-ring block rounded-xl p-5 transition-opacity hover:opacity-90"
                style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
              >
                <div className="text-base font-semibold" style={{ color: "var(--accent)" }}>
                  📡 Live sessie
                </div>
                <div className="text-sm mt-1" style={{ color: "var(--text2)" }}>
                  Vergelijk kinks live met je partner — elk op eigen toestel.
                </div>
                <div
                  className="mt-3 rounded-lg px-3 py-2.5 text-xs leading-relaxed"
                  style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
                >
                  <span className="font-semibold" style={{ color: "var(--text)" }}>🔒 Privacy — </span>
                  Om verbinding te maken wisselen de twee toestellen eenmalig een klein technisch signaal uit via onze server, zodat ze elkaar kunnen vinden. Daarna verloopt alles rechtstreeks van toestel tot toestel. Je kinks, naam en andere gegevens verlaten je toestel nooit — ze worden nergens opgeslagen of doorgestuurd.
                </div>
              </Link>
            </div>
          </>
        )}
      </main>

      {/* Settings bottom sheet */}
      <div className={`sheet-overlay ${settingsOpen ? "open" : ""}`} onClick={() => setSettingsOpen(false)} aria-hidden="true" />
      <div ref={settingsSheetRef} className={`sheet-panel ${settingsOpen ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Instellingen">
        <div
          className="rounded-t-2xl p-6"
          style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}
        >
          <div className="mx-auto mb-4 w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
          <h2 className="text-lg font-bold text-center mb-5">Instellingen</h2>
          <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "var(--text2)" }}>
            Thema
          </p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {(
              [
                { value: "midnight", label: "Midnight", color: "#c084fc" },
                { value: "red",      label: "Deep Red",  color: "#ef4444" },
                { value: "forest",   label: "Forest",    color: "#4ade80" },
                { value: "mono",     label: "Mono",      color: "#e5e5e5" },
              ] as { value: "midnight" | "red" | "forest" | "mono"; label: string; color: string }[]
            ).map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                aria-pressed={theme === t.value}
                className="focus-ring rounded-xl p-3 flex items-center gap-2 border transition-colors text-left"
                style={
                  theme === t.value
                    ? {
                        borderColor: "var(--accent)",
                        background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                      }
                    : { borderColor: "var(--border)" }
                }
              >
                <span
                  className="rounded-full flex-none"
                  style={{ width: 20, height: 20, background: t.color }}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>

          <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "var(--text2)" }}>
            Back-up &amp; herstel
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={exportProfiles}
              className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              ⬇ Maak backup (JSON)
            </button>
            <label className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors text-center cursor-pointer"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              ⬆ Herstel backup
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="sr-only"
              />
            </label>
            {importError && (
              <p className="text-xs text-center" style={{ color: "var(--hard-no)" }}>{importError}</p>
            )}
            {importSuccess && (
              <p className="text-xs text-center" style={{ color: "var(--accent)" }}>{importSuccess}</p>
            )}
            <button
              onClick={() => setSettingsOpen(false)}
              className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors mt-1"
              style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            >
              Sluit
            </button>
          </div>

          <p className="text-xs uppercase tracking-widest font-semibold mb-3 mt-5" style={{ color: "var(--text2)" }}>
            Rondleiding
          </p>
          <button
            onClick={() => { resetProfileTour(); setSettingsOpen(false); }}
            className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors mb-5"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            🔍 Rondleiding opnieuw starten
          </button>

          <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "var(--text2)" }}>
            Gegevens
          </p>
          <button
            onClick={() => { setSettingsOpen(false); setDestroyPhrase(""); setDestroyOpen(true); }}
            className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
            style={{ borderColor: "var(--hard-no)", color: "var(--hard-no)" }}
          >
            Vernietig alle data
          </button>
        </div>
      </div>

      {/* Destroy-all bottom sheet */}
      <div className={`sheet-overlay ${destroyOpen ? "open" : ""}`} onClick={() => setDestroyOpen(false)} aria-hidden="true" />
      <div className={`sheet-panel ${destroyOpen ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Alle data verwijderen">
        <div
          className="rounded-t-2xl p-6"
          style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}
        >
          <div className="mb-6" />
          <h2 className="text-lg font-bold text-center mb-2">Vernietig alle data</h2>
          <p className="text-center text-sm mb-4" style={{ color: "var(--text2)" }}>
            Dit verwijdert alle profielen, contracten en instellingen permanent.{" "}
            Typ <strong style={{ color: "var(--text)" }}>wis alles</strong> om te bevestigen.
          </p>
          <input
            value={destroyPhrase}
            onChange={(e) => setDestroyPhrase(e.target.value)}
            placeholder="wis alles"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none text-center"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <div className="flex flex-col gap-3">
            <button
              onClick={handleDestroyAll}
              disabled={destroyPhrase.trim().toLowerCase() !== DESTROY_PHRASE}
              className="focus-ring w-full py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-30"
              style={{ background: "#7f1d1d", border: "1px solid var(--hard-no)", color: "#fca5a5" }}
            >
              Vernietig voor altijd
            </button>
            <button
              onClick={() => setDestroyOpen(false)}
              className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            >
              Annuleer
            </button>
          </div>
        </div>
      </div>

      {/* Delete bottom sheet */}
      <div className={`sheet-overlay ${sheetOpen ? "open" : ""}`} onClick={cancelDelete} aria-hidden="true" />
      <div className={`sheet-panel ${sheetOpen ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Profiel verwijderen">
        <div
          className="rounded-t-2xl p-6"
          style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}
        >
          <div className="mb-6" />
          <h2 className="text-lg font-bold text-center mb-1">Profiel verwijderen?</h2>
          {deleteTargetProfile && (
            <p className="text-center text-sm mb-6" style={{ color: "var(--text2)" }}>
              <span style={{ color: "var(--text)" }}>{deleteTargetProfile.name}</span> wordt permanent gewist.
              Dit kan niet ongedaan worden gemaakt.
            </p>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={confirmDelete}
              className="focus-ring w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: "#7f1d1d", border: "1px solid var(--hard-no)", color: "#fca5a5" }}
            >
              Verwijder voor altijd
            </button>
            <button
              onClick={cancelDelete}
              className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            >
              Annuleer
            </button>
          </div>
        </div>
      </div>

      <QRScanner
        open={scanOpen}
        onResult={(p) => {
          try { setImportPreview(decodeAny(p)); } catch { /* ongeldige QR */ }
          setScanOpen(false);
        }}
        onClose={() => setScanOpen(false)}
      />

      {/* Import profile sheet */}
      <div
        className={`sheet-overlay ${importPreview ? "open" : ""}`}
        onClick={() => setImportPreview(null)}
        aria-hidden="true"
      />
      <div
        className={`sheet-panel ${importPreview ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Profiel importeren"
        onTouchStart={(e) => {
          importDragStart.current = e.touches[0].clientY;
          setImportDragging(true);
        }}
        onTouchMove={(e) => {
          const dy = e.touches[0].clientY - importDragStart.current;
          if (dy > 0) setImportDragY(dy);
        }}
        onTouchEnd={() => {
          if (importDragY > 80) {
            setImportDragY(0);
            setImportPreview(null);
          } else {
            setImportDragY(0);
          }
          setImportDragging(false);
        }}
        style={importDragging || importDragY > 0 ? {
          transform: `translateY(${importDragY}px)`,
          transition: importDragging ? "none" : undefined,
        } : undefined}
      >
        <div
          className="rounded-t-2xl p-6"
          style={{
            background: "var(--surface)",
            borderTop: "1px solid var(--border)",
            borderLeft: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
          }}
        >
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border)" }} />
          <h2 className="text-lg font-bold text-center mb-4">Profiel importeren?</h2>

          {importPreview && (
            <div
              className="rounded-xl p-4 mb-5 flex items-center gap-3"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black flex-none"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                aria-hidden="true"
              >
                {importPreview.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{importPreview.name}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
                  >
                    {importPreview.role}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)" }}
                  >
                    {importPreview.experienceLevel}
                  </span>
                </div>
                <div className="text-xs mt-0.5 tabular-nums" style={{ color: "var(--text2)" }}>
                  {Object.values(importPreview.entries).filter((e) => e.status).length} kinks beoordeeld
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {importDone ? (
              <p className="text-sm text-center py-2 font-semibold" style={{ color: "var(--accent)" }}>
                ✓ Profiel geïmporteerd!
              </p>
            ) : (
              <button
                onClick={() => {
                  if (!importPreview) return;
                  importProfiles([{ ...importPreview, isImported: true }]);
                  setImportDone(true);
                  router.replace("/");
                  setTimeout(() => {
                    setImportPreview(null);
                    setImportDone(false);
                  }, 1500);
                }}
                className="focus-ring w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                Importeer profiel
              </button>
            )}
            <button
              onClick={() => { setImportPreview(null); router.replace("/"); }}
              className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            >
              Niet nu
            </button>
          </div>
        </div>
      </div>

      {/* Install prompt banner */}
      {_hasHydrated && !installPromptDismissed && onboardingComplete && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[120] py-3 px-4 flex items-center gap-3"
          style={{ background: "var(--surface)", borderTop: "1px solid var(--border-accent)" }}
          role="banner"
        >
          <span className="text-xl" aria-hidden="true">📱</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Installeer KinkSync</div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>
              Bewaar op je beginscherm voor snelle toegang.
            </div>
          </div>
          <button
            onClick={handleInstall}
            className="focus-ring px-3 py-1.5 rounded-lg text-xs font-semibold flex-none"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            Installeer
          </button>
          <label className="flex items-center gap-1.5 flex-none cursor-pointer select-none">
            <input
              type="checkbox"
              onChange={(e) => { if (e.target.checked) dismissInstallPrompt(); }}
              className="accent-[var(--accent)] w-4 h-4 flex-none"
            />
            <span className="text-xs" style={{ color: "var(--text2)" }}>Niet meer tonen</span>
          </label>
        </div>
      )}
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
