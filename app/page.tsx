"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { Camera, Pin, PinOff, Pencil, Eye, EyeOff, Zap, FileText, Clapperboard, Anchor, Lock, Palette, HardDrive, Key, Fingerprint, Compass, RotateCcw, AlertTriangle, Download, Upload } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { STAGGER_CHILDREN, fadeUp, useMotionSafe } from "@/lib/motion";
import Sheet from "@/components/ui/Sheet";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, useHasHydrated } from "@/lib/store";
import { KINKS, LEVEL_MAX } from "@/lib/kinks";
import { ROLE_GROUPS, EXPERIENCE_LEVELS, RELATIONSHIP_STATUSES } from "@/lib/roles";
import RolePill from "@/components/RolePill";
import type { ExperienceLevel, Profile, ContractSnapshot } from "@/types";
import Onboarding from "@/components/Onboarding";
import PwaInstallGuide from "@/components/PwaInstallGuide";
import AppLock from "@/components/AppLock";
import PageShell from "@/components/PageShell";
import Wordmark from "@/components/Wordmark";
import dynamic from "next/dynamic";
import { decodeAny } from "@/lib/shareProfile";
import { getProfileType } from "@/lib/profileType";
import { eligibleParentProfiles } from "@/lib/subprofile";

const QRScanner = dynamic(() => import("@/components/QRScanner"), { ssr: false });
import type { EncryptedBackup } from "@/lib/crypto";
import { registerBiometric, isPlatformAuthenticatorAvailable } from "@/lib/webauthn";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const TOTAL_KINKS = KINKS.length;
const DESTROY_PHRASE = "wis alles";


function HomeContent() {
  const t = useMotionSafe();
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
    contracts,
    restoreContracts,
    pinnedProfileId,
    pinProfile,
    unpinProfile,
    resetProfileTour,
    appLockEnabled,
    appLockPin,
    setAppLockPin,
    clearAppLockPin,
    biometricEnabled,
    biometricCredentialId,
    enableBiometric,
    disableBiometric,
  } = useStore();
  const _hasHydrated = useHasHydrated();
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [lockState, setLockState] = useState<"locked" | "unlocked">("unlocked");
  const sessionUnlocked = useRef(
    typeof sessionStorage !== "undefined" && sessionStorage.getItem("app_unlocked") === "1"
  );

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNameError, setEditNameError] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editLevel, setEditLevel] = useState<ExperienceLevel>("beginner");
  const [editRelationshipStatus, setEditRelationshipStatus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [parentName, setParentName] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pinFlowOpen, setPinFlowOpen] = useState(false);
  const [pinFlowStep, setPinFlowStep] = useState(0);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [platformBioAvailable, setPlatformBioAvailable] = useState(false);
  const [bioRegistering, setBioRegistering] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);
  const [destroyOpen, setDestroyOpen] = useState(false);
  const [destroyPhrase, setDestroyPhrase] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [exportPwOpen, setExportPwOpen] = useState(false);
  const [exportPw, setExportPw] = useState("");
  const [exportPwConfirm, setExportPwConfirm] = useState("");
  const [exportPwError, setExportPwError] = useState<string | null>(null);
  const [exportPwLoading, setExportPwLoading] = useState(false);
  const [exportPwShow, setExportPwShow] = useState(false);
  const [exportPwStep, setExportPwStep] = useState(0);
  const [importPwOpen, setImportPwOpen] = useState(false);
  const [importPw, setImportPw] = useState("");
  const [importPwError, setImportPwError] = useState<string | null>(null);
  const [importPwLoading, setImportPwLoading] = useState(false);
  const [importPwShow, setImportPwShow] = useState(false);
  const [pendingEncrypted, setPendingEncrypted] = useState<EncryptedBackup | null>(null);
  const [importPreview, setImportPreview] = useState<Profile | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [importDone, setImportDone] = useState(false);

  useEffect(() => {
    if (_hasHydrated && appLockEnabled && !sessionUnlocked.current) setLockState("locked");
  }, [_hasHydrated, appLockEnabled]);

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setPlatformBioAvailable);
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIos(/iPhone|iPad|iPod/.test(ua) && !/Chrome/.test(ua));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setHasNativePrompt(true);
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

  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    window.addEventListener("ks:open-settings", handler);
    return () => window.removeEventListener("ks:open-settings", handler);
  }, []);

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
    if (parentName === null) {
      const duplicate = profiles.some(
        (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (duplicate) { setNameError("Er bestaat al een profiel met deze naam."); return; }
    }
    setNameError(null);
    const id = createProfile(name.trim(), role, experienceLevel, relationshipStatus || undefined);
    setName("");
    setRelationshipStatus("");
    setParentName(null);
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
    const duplicate = profiles.some(
      (p) => p.id !== editId && p.name.trim().toLowerCase() === editName.trim().toLowerCase()
    );
    if (duplicate) { setEditNameError("Er bestaat al een profiel met deze naam."); return; }
    setEditNameError(null);
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

  async function handleEnableBiometric() {
    setBioRegistering(true);
    setBioError(null);
    try {
      const credId = await registerBiometric();
      enableBiometric(credId);
    } catch (e) {
      setBioError(e instanceof Error ? e.message : "Biometrische registratie mislukt");
    } finally {
      setBioRegistering(false);
    }
  }

  function openPinFlow(startStep = 0) {
    setPinInput(""); setPinConfirm(""); setPinError(null);
    setPinFlowStep(startStep); setPinFlowOpen(true);
  }

  function closePinFlow() {
    setPinFlowOpen(false);
    setTimeout(() => { setPinInput(""); setPinConfirm(""); setPinError(null); setPinFlowStep(0); }, 300);
  }

  async function handleSavePin() {
    if (pinInput.length < 4) { setPinError("PIN moet minimaal 4 cijfers zijn."); return; }
    if (pinInput !== pinConfirm) { setPinError("PINs komen niet overeen."); return; }
    const { hashPin } = await import("@/lib/crypto");
    const hash = await hashPin(pinInput);
    setAppLockPin(hash);
    sessionStorage.removeItem("app_unlocked");
    sessionUnlocked.current = false;
    closePinFlow();
  }

  function handleRemovePin() {
    clearAppLockPin();
    sessionStorage.removeItem("app_unlocked");
    sessionUnlocked.current = false;
    closePinFlow();
  }

  function resetExportPwState() {
    setExportPwStep(0);
    setExportPw("");
    setExportPwConfirm("");
    setExportPwShow(false);
    setExportPwError(null);
    setExportPwLoading(false);
  }

  function exportProfiles() {
    resetExportPwState();
    setExportPwOpen(true);
  }

  async function handleExportEncrypted() {
    if (exportPw.length < 8) { setExportPwError("Wachtwoord moet minstens 8 tekens zijn."); return; }
    if (exportPw !== exportPwConfirm) { setExportPwError("Wachtwoorden komen niet overeen."); return; }
    setExportPwLoading(true);
    try {
      const plain = JSON.stringify({ version: 1, source: "backup", profiles, contracts });
      const { encryptBackup } = await import("@/lib/crypto");
      const encrypted = await encryptBackup(plain, exportPw);
      const blob = new Blob([JSON.stringify(encrypted)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kinksync-backup-${new Date().toISOString().slice(0, 10)}.enc.json`;
      a.click();
      URL.revokeObjectURL(url);
      resetExportPwState();
      setExportPwOpen(false);
    } finally {
      setExportPwLoading(false);
    }
  }

  function restoreFromParsed(parsed: Record<string, unknown>) {
    if (!parsed.profiles || !Array.isArray(parsed.profiles)) {
      setImportError("Ongeldig bestand — geen geldige profielen gevonden.");
      return;
    }
    const incoming = parsed.profiles as Profile[];
    const existing = new Set(profiles.map((p: Profile) => p.id));
    const isOwnBackup = parsed.source === "backup";
    const newOnes = isOwnBackup
      ? incoming
          .filter((p: Profile) => !existing.has(p.id))
          .map((p: Profile) => (p.origin === "shared" || p.isImported === true)
            ? { ...p, origin: "shared" as const, isImported: true }
            : { ...p, origin: "own" as const, isImported: false })
      : incoming
          .map((p: Profile) => existing.has(p.id) ? { ...p, id: crypto.randomUUID() } : p)
          .map((p: Profile) => ({ ...p, isImported: true as const, origin: "shared" as const, lockedAt: p.lockedAt ?? Date.now() }));
    const restoredContracts = Array.isArray(parsed.contracts) ? parsed.contracts as ContractSnapshot[] : [];
    if (!incoming.length && !restoredContracts.length) {
      setImportError("Ongeldig bestand — geen geldige profielen gevonden.");
      return;
    }
    if (newOnes.length) importProfiles(newOnes);
    if (restoredContracts.length) restoreContracts(restoredContracts);
    setImportSuccess(`${newOnes.length} profiel(en) en ${restoredContracts.length} contract(en) hersteld.`);
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
        if (parsed.encrypted === true) {
          setPendingEncrypted(parsed as EncryptedBackup);
          setImportPw("");
          setImportPwError(null);
          setImportPwOpen(true);
        } else {
          restoreFromParsed(parsed as Record<string, unknown>);
        }
      } catch {
        setImportError("Bestand kon niet worden gelezen.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleImportDecrypt() {
    if (!pendingEncrypted) return;
    setImportPwLoading(true);
    setImportPwError(null);
    try {
      const { decryptBackup } = await import("@/lib/crypto");
      const plain = await decryptBackup(pendingEncrypted, importPw);
      const parsed = JSON.parse(plain) as Record<string, unknown>;
      setImportPwOpen(false);
      setPendingEncrypted(null);
      restoreFromParsed(parsed);
    } catch {
      setImportPwError("Verkeerd wachtwoord — probeer opnieuw.");
    } finally {
      setImportPwLoading(false);
    }
  }

  if (!_hasHydrated) return <PageShell loading width="2xl" />;

  if (appLockEnabled && lockState === "locked") {
    return (
      <AppLock
        storedHash={appLockPin}
        biometricCredentialId={biometricEnabled ? biometricCredentialId : null}
        onUnlock={() => {
          sessionStorage.setItem("app_unlocked", "1");
          sessionUnlocked.current = true;
          setLockState("unlocked");
        }}
      />
    );
  }

  if (!onboardingComplete) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  const pinnedProfile = profiles.find((p) => p.id === pinnedProfileId);
  const parentCandidates = eligibleParentProfiles(profiles, pinnedProfileId);
  const compareProfiles = (pinnedProfile
    ? [pinnedProfile.id, profiles.find((p) => p.id !== pinnedProfileId)?.id]
    : profiles.slice(0, 2).map((p) => p.id)
  ).filter((id): id is string => Boolean(id));
  const canCompare = compareProfiles.length >= 2;
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
      <PageShell width="2xl">
        {/* Hero */}
        <div className="mb-10 pt-3 text-center">
          <h1 className="text-6xl">
            <Wordmark />
          </h1>
          <div className="ks-gradient-rule mx-auto my-4" />
          <p className="text-sm italic tracking-wide" style={{ color: "var(--text2)" }}>
            Verken grenzen. Samen.
          </p>
        </div>

        {/* Create profile form — always visible when no profiles, toggle otherwise */}
        {profiles.length > 0 && (
          <button
            onClick={() => setFormOpen(v => !v)}
            className="relative overflow-hidden focus-ring w-full rounded-xl p-4 mb-3 flex items-center gap-3 text-left"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <span className="flex-1 text-sm font-medium" style={{ color: "var(--text2)" }}>
              {formOpen ? "▲ Annuleer" : "+ Nieuw profiel"}
            </span>
          </button>
        )}
        {(profiles.length === 0 || formOpen) && (
        <form
          onSubmit={(e) => { handleCreate(e); setFormOpen(false); }}
          className="relative overflow-hidden rounded-xl p-5 mb-8"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          <h2 className="font-semibold text-xs uppercase tracking-widest mb-4" style={{ color: "var(--text2)" }}>
            Nieuw profiel
          </h2>

          {parentCandidates.length > 0 && (
            <div className="mb-4">
              <p className="text-xs uppercase tracking-widest mb-1 font-medium" style={{ color: "var(--text2)" }}>Subprofiel van</p>
              <p className="text-[11px] mb-2" style={{ color: "var(--text2)" }}>Maak een tweede rol onder dezelfde naam — bijv. Dominant naast Submissive.</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => { setParentName(null); setName(""); }}
                  aria-pressed={parentName === null}
                  className="focus-ring px-3 py-1 rounded-full text-xs font-medium transition-colors border"
                  style={
                    parentName === null
                      ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                      : { color: "var(--text2)", borderColor: "var(--border)" }
                  }
                >
                  Nieuw persoon
                </button>
                {parentCandidates.map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => { setParentName(candidate); setName(candidate); }}
                    aria-pressed={parentName === candidate}
                    className="focus-ring px-3 py-1 rounded-full text-xs font-medium transition-colors border"
                    style={
                      parentName === candidate
                        ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                        : { color: "var(--text2)", borderColor: "var(--border)" }
                    }
                  >
                    {candidate}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-3">
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(null); }}
              placeholder="Naam of alias…"
              className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none placeholder-[color:var(--text2)]"
              style={{ background: "var(--surface2)", border: `1px solid ${nameError ? "var(--hard-no)" : "var(--border)"}`, color: "var(--text)" }}
            />
            {nameError && (
              <p className="text-xs mt-1" style={{ color: "var(--hard-no)" }}>{nameError}</p>
            )}
            {parentName && (
              <p className="text-xs mt-1" style={{ color: "var(--text2)" }}>Wordt gegroepeerd onder &ldquo;{parentName}&rdquo;</p>
            )}
          </div>

          <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>Rol</p>
          <div className="flex flex-col gap-2 mb-4" role="group" aria-label="Rol">
            {ROLE_GROUPS.map((g) => (
              <div key={g.label}>
                <p className="text-[10px] uppercase tracking-widest mb-1 opacity-50" style={{ color: "var(--text2)" }}>{g.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.roles.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      aria-pressed={role === r}
                      className="focus-ring px-3 py-1 rounded-full text-xs font-medium transition-colors border"
                      style={
                        role === r
                          ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                          : { color: "var(--text2)", borderColor: "var(--border)" }
                      }
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

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
                    ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
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
                    ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                    : { color: "var(--text2)", borderColor: "var(--border)" }
                }
              >
                {s}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="focus-ring w-full py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Sla jezelf vast →
          </button>
        </form>
        )}

        {/* Scan QR button — verborgen terwijl import-sheet open is */}
        {!importPreview && <button
          onClick={() => setScanOpen(true)}
          className="relative overflow-hidden focus-ring w-full rounded-xl p-4 mb-3 flex items-center gap-3 text-left"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          <Camera size={18} aria-hidden="true" />
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
            <motion.div
              className="flex flex-col gap-3 mb-6"
              initial="hidden"
              animate="show"
              variants={STAGGER_CHILDREN}
            >
              {profileGroups.map((group) => {
                const groupName = group[0].name;
                const isMulti = group.length > 1;
                return (
                  <motion.div
                    key={groupName.toLowerCase().trim()}
                    variants={fadeUp(10)}
                  >
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
                            className="relative rounded-xl overflow-hidden"
                            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                          >
                            {editId === p.id ? (
                              <div className="p-4">
                                <div className="mb-3">
                                  <input
                                    value={editName}
                                    onChange={(e) => { setEditName(e.target.value); setEditNameError(null); }}
                                    className="focus-ring w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                                    style={{ background: "var(--surface2)", border: `1px solid ${editNameError ? "var(--hard-no)" : "var(--border)"}`, color: "var(--text)" }}
                                  />
                                  {editNameError && (
                                    <p className="text-xs mt-1" style={{ color: "var(--hard-no)" }}>{editNameError}</p>
                                  )}
                                </div>
                                <p className="text-xs mb-1.5" style={{ color: "var(--text2)" }}>Rol</p>
                                <div className="flex flex-col gap-2 mb-3" role="group" aria-label="Rol">
                                  {ROLE_GROUPS.map((g) => (
                                    <div key={g.label}>
                                      <p className="text-[10px] uppercase tracking-widest mb-1 opacity-50" style={{ color: "var(--text2)" }}>{g.label}</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {g.roles.map((r) => (
                                          <button
                                            key={r}
                                            type="button"
                                            onClick={() => setEditRole(r)}
                                            aria-pressed={editRole === r}
                                            className="focus-ring px-3 py-1 rounded-full text-xs font-medium transition-colors border"
                                            style={
                                              editRole === r
                                                ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                                                : { color: "var(--text2)", borderColor: "var(--border)" }
                                            }
                                          >
                                            {r}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
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
                                          ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
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
                                          ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
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
                                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}
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
                                <div className="flex gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                                  {(() => {
                                    const ep = profiles.find((pr) => pr.id === editId);
                                    if (!ep) return null;
                                    return (<>
                                      <button
                                        onClick={() => ep.id === pinnedProfileId ? unpinProfile() : pinProfile(ep.id)}
                                        className="focus-ring flex-1 py-2 rounded-lg text-xs border transition-colors flex items-center justify-center gap-1.5"
                                        style={ep.id === pinnedProfileId
                                          ? { borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)" }
                                          : { borderColor: "var(--border)", color: "var(--text2)" }}
                                      >
                                        {ep.id === pinnedProfileId ? <><PinOff size={12} /> Losmaken</> : <><Pin size={12} /> Mijn profiel</>}
                                      </button>
                                      <button
                                        onClick={() => { setEditId(null); promptDelete(ep.id); }}
                                        className="focus-ring px-4 py-2 rounded-lg text-xs border transition-colors"
                                        style={{ borderColor: "color-mix(in srgb, var(--hard-no) 40%, transparent)", color: "var(--hard-no)" }}
                                      >
                                        Verwijderen
                                      </button>
                                    </>);
                                  })()}
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Card header */}
                                <div className="flex items-center gap-3 px-3 pt-3 pb-2">
                                  {!isMulti && (
                                    <div className="relative flex-none">
                                      <div className="w-11 h-11 rounded-full overflow-hidden" aria-hidden="true">
                                        {p.avatarDataUrl ? (
                                          <img src={p.avatarDataUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-black" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}>
                                            {initial}
                                          </div>
                                        )}
                                      </div>
                                      {p.id === pinnedProfileId && (
                                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }} aria-label="Mijn profiel">
                                          <Pin size={9} color="#000" />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate leading-tight">
                                      {isMulti ? p.role : p.name}
                                    </p>
                                    {isMulti ? (
                                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--text2)" }}>
                                        {lvl?.label}
                                      </p>
                                    ) : (
                                      <div className="flex flex-wrap items-center gap-1 mt-1">
                                        <RolePill role={p.role} />
                                        {lvl && <span className="text-xs" style={{ color: "var(--text2)" }}>· {lvl.label}</span>}
                                        {(() => {
                                          const pt = getProfileType(p, pinnedProfileId);
                                          return (
                                            <span
                                              className="text-[10px] uppercase tracking-widest flex items-center gap-0.5"
                                              style={{ color: pt === "primair" ? "var(--accent)" : "var(--text2)" }}
                                            >
                                              {pt === "partner" && <Lock size={8} aria-hidden="true" />}
                                              {pt}
                                            </span>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 flex-none">
                                    <button
                                      onClick={() => startEdit(p)}
                                      aria-label={`Profiel ${p.name} bewerken`}
                                      className="focus-ring w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
                                      style={{ color: "var(--text2)" }}
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <Link
                                      href={`/profile/${p.id}`}
                                      className="focus-ring px-3 h-9 rounded-lg text-sm font-semibold transition-colors flex-none flex items-center"
                                      style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                                    >
                                      Open →
                                    </Link>
                                  </div>
                                </div>

                                {/* Status DNA bar */}
                                {rated > 0 ? (
                                  <div className="flex h-1.5 mx-3 mb-3 rounded-full overflow-hidden gap-px">
                                    {(["yes","willing","maybe","no","hard_no"] as const).map((s) => {
                                      const cnt = Object.values(p.entries).filter((e) => e.status === s).length;
                                      if (!cnt) return null;
                                      const pct = (cnt / maxKinks) * 100;
                                      const c = { yes: "var(--yes)", willing: "var(--willing)", maybe: "var(--maybe)", no: "var(--no)", hard_no: "var(--hard-no)" }[s];
                                      return <div key={s} style={{ width: `${pct}%`, background: c }} />;
                                    })}
                                    <div style={{ flex: 1, background: "var(--border)" }} />
                                  </div>
                                ) : (
                                  <div className="h-1.5 mx-3 mb-3 rounded-full" style={{ background: "var(--border)" }} />
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Compare CTA */}
            <div className="flex flex-col gap-3">
              {canCompare ? (
                <Link
                  href={`/compare?a=${compareProfiles[0]}&b=${compareProfiles[1]}`}
                  className="focus-ring block rounded-xl p-6 transition-opacity hover:opacity-90"
                  style={{
                    background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 8%, var(--surface)), var(--surface))",
                    border: "1px solid var(--border-accent)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5" style={{ color: "var(--accent)" }}>
                    <Zap size={18} aria-hidden="true" className="flex-none" />
                    <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 400, fontSize: "1.2rem", lineHeight: 1.2 }}>Vergelijk profielen</span>
                  </div>
                  <div className="text-sm" style={{ color: "var(--text2)" }}>
                    Zie waar jullie grenzen raken — en waar ze uitdagen.
                  </div>
                  {profiles.length > 2 && (
                    <div className="text-xs mt-1.5 opacity-50">{pinnedProfile ? `${pinnedProfile.name} + eerste andere` : "eerste twee profielen"}</div>
                  )}
                </Link>
              ) : (
                <div
                  className="rounded-xl p-6 opacity-40"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  role="button"
                  tabIndex={0}
                  aria-disabled="true"
                  aria-label="Vergelijk profielen — voeg een tweede profiel toe om te vergelijken"
                >
                  <div className="flex items-center gap-2 mb-1.5" style={{ color: "var(--text2)" }}>
                    <Zap size={18} aria-hidden="true" className="flex-none" />
                    <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 400, fontSize: "1.2rem", lineHeight: 1.2 }}>Vergelijk profielen</span>
                  </div>
                  <div className="text-sm" style={{ color: "var(--text2)" }}>
                    Voeg een tweede profiel toe om te vergelijken.
                  </div>
                </div>
              )}

              {profiles.length >= 2 ? (
                <Link
                  href={`/contract?a=${compareProfiles[0]}&b=${compareProfiles[1]}`}
                  className="focus-ring block rounded-xl p-5 transition-opacity hover:opacity-90"
                  style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
                >
                  <div className="flex items-center gap-2 text-base font-semibold mb-1" style={{ color: "var(--accent)" }}>
                    <FileText size={16} aria-hidden="true" />
                    Maak een contract
                  </div>
                  <div className="text-sm" style={{ color: "var(--text2)" }}>
                    Safewords, aftercare en grenzen — op papier en exporteerbaar.
                  </div>
                </Link>
              ) : (
                <div
                  className="rounded-xl p-5 opacity-40"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  role="button"
                  tabIndex={0}
                  aria-disabled="true"
                  aria-label="Maak een contract — voeg twee profielen toe om een contract te maken"
                >
                  <div className="flex items-center gap-2 text-base font-semibold mb-1" style={{ color: "var(--text2)" }}>
                    <FileText size={16} aria-hidden="true" />
                    Maak een contract
                  </div>
                  <div className="text-sm" style={{ color: "var(--text2)" }}>
                    Voeg twee profielen toe om een contract te maken.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/scene"
                  className="focus-ring block rounded-xl p-4 transition-opacity hover:opacity-90"
                  style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
                >
                  <div className="flex items-center gap-1.5 text-base font-semibold mb-1" style={{ color: "var(--accent)" }}>
                    <Clapperboard size={15} aria-hidden="true" />
                    Nieuwe scène
                  </div>
                  <div className="text-xs" style={{ color: "var(--text2)" }}>Schrijf de regels voordat het spel begint.</div>
                </Link>
                <Link
                  href="/scenes"
                  className="focus-ring block rounded-xl p-4 transition-opacity hover:opacity-90"
                  style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
                >
                  <div className="flex items-center gap-1.5 text-base font-semibold mb-1" style={{ color: "var(--accent)" }}>
                    <Clapperboard size={15} aria-hidden="true" />
                    Scènes
                  </div>
                  <div className="text-xs" style={{ color: "var(--text2)" }}>Alle scènes — gepland en voltooid.</div>
                </Link>
              </div>

              <Link
                href="/session"
                className="focus-ring block rounded-xl p-5 transition-opacity hover:opacity-90"
                style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
              >
                <div className="flex items-center gap-2 text-base font-semibold mb-1" style={{ color: "var(--accent)" }}>
                  <Anchor size={16} aria-hidden="true" />
                  Live sessie
                </div>
                <div className="text-sm" style={{ color: "var(--text2)" }}>
                  Vergelijk kinks live — elk op eigen toestel.
                </div>
              </Link>
            </div>
          </>
        )}
      </PageShell>

      {/* Settings bottom sheet */}
      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Instellingen" aria-label="Instellingen">
          <div className="overflow-y-auto" style={{ maxHeight: "60svh" }}>
          {/* Thema */}
          <section className="settings-card">
            <div className="flex items-center gap-3 mb-3">
              <Palette className="settings-card-icon" size={18} aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-tight">Thema</h3>
                <p className="text-xs truncate" style={{ color: "var(--text2)" }}>
                  {{ midnight: "Midnight", red: "Deep Red", forest: "Forest", mono: "Mono", ledger: "Ledger" }[theme] ?? "Midnight"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "midnight", label: "Midnight", color: "#c084fc" },
                  { value: "red",      label: "Deep Red",  color: "#ef4444" },
                  { value: "forest",   label: "Forest",    color: "#4ade80" },
                  { value: "mono",     label: "Mono",      color: "#e5e5e5" },
                  { value: "ledger",   label: "Ledger",    color: "#C73E2E" },
                ] as { value: "midnight" | "red" | "forest" | "mono" | "ledger"; label: string; color: string }[]
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
          </section>

          {/* Back-up & herstel */}
          <section className="settings-card">
            <div className="flex items-center gap-3 mb-3">
              <HardDrive className="settings-card-icon" size={18} aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-tight">Back-up &amp; herstel</h3>
                <p className="text-xs truncate" style={{ color: "var(--text2)" }}>Exporteer of herstel je kinklijst</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={exportProfiles}
                className="focus-ring py-3 rounded-xl text-sm font-medium border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                <Download size={14} className="inline align-middle mr-1" aria-hidden="true" />Maak backup
              </button>
              <label className="focus-ring relative py-3 rounded-xl text-sm font-medium border transition-colors text-center cursor-pointer"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                <Upload size={14} className="inline align-middle mr-1" aria-hidden="true" />Herstel
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="absolute w-px h-px overflow-hidden opacity-0 pointer-events-none"
                />
              </label>
            </div>
            {importError && (
              <p className="text-xs text-center mt-2" style={{ color: "var(--hard-no)" }}>{importError}</p>
            )}
            {importSuccess && (
              <p className="text-xs text-center mt-2" style={{ color: "var(--accent)" }}>{importSuccess}</p>
            )}
          </section>

          {/* Beveiliging */}
          <section className="settings-card">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="settings-card-icon" size={18} aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-tight">Beveiliging</h3>
                <p className="text-xs truncate" style={{ color: "var(--text2)" }}>
                  {appLockEnabled ? "PIN-vergrendeling actief" : "Geen vergrendeling ingesteld"}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {appLockEnabled ? (
                <>
                  <button onClick={() => openPinFlow(0)}
                    className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                    <Key size={14} className="inline align-middle mr-1" aria-hidden="true" />PIN wijzigen
                  </button>
                  {/* Face ID — alleen beschikbaar als PIN al ingesteld is */}
                  {platformBioAvailable && (
                    biometricEnabled ? (
                      <button onClick={() => disableBiometric()}
                        className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
                        style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
                        <Fingerprint size={14} className="inline align-middle mr-1" aria-hidden="true" />Face ID / vingerafdruk uitschakelen
                      </button>
                    ) : (
                      <button onClick={handleEnableBiometric} disabled={bioRegistering}
                        className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
                        style={{ borderColor: "var(--accent)", color: "var(--accent)", opacity: bioRegistering ? 0.6 : 1 }}>
                        {bioRegistering ? "Bezig…" : <><Fingerprint size={14} className="inline align-middle mr-1" aria-hidden="true" />Face ID / vingerafdruk inschakelen</>}
                      </button>
                    )
                  )}
                  {bioError && <p className="text-xs text-center" style={{ color: "var(--hard-no)" }}>{bioError}</p>}
                  <button onClick={() => openPinFlow(2)}
                    className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
                    style={{ borderColor: "var(--hard-no)", color: "var(--hard-no)" }}>
                    PIN verwijderen
                  </button>
                </>
              ) : (
                <button onClick={() => openPinFlow(0)}
                  className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                  <Lock size={14} className="inline align-middle mr-1" aria-hidden="true" />PIN-vergrendeling instellen
                </button>
              )}
            </div>
          </section>

          {/* Rondleiding */}
          <section className="settings-card">
            <div className="flex items-center gap-3 mb-3">
              <Compass className="settings-card-icon" size={18} aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-tight">Rondleiding</h3>
                <p className="text-xs truncate" style={{ color: "var(--text2)" }}>Bekijk de uitleg opnieuw</p>
              </div>
            </div>
            <button
              onClick={() => { resetProfileTour(); setSettingsOpen(false); }}
              className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              <RotateCcw size={14} className="inline align-middle mr-1" aria-hidden="true" />Rondleiding opnieuw starten
            </button>
          </section>

          {/* Gevarenzone */}
          <section className="settings-card settings-card-danger">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="settings-card-icon" size={18} aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-tight">Gevarenzone</h3>
                <p className="text-xs truncate" style={{ color: "var(--text2)" }}>Wis alles, permanent en onomkeerbaar</p>
              </div>
            </div>
            <button
              onClick={() => { setSettingsOpen(false); setDestroyPhrase(""); setDestroyOpen(true); }}
              className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
              style={{ borderColor: "var(--hard-no)", color: "var(--hard-no)" }}
            >
              Vernietig alle data
            </button>
          </section>
          </div>{/* end scroll */}
          <div className="pt-4">
            <button
              onClick={() => setSettingsOpen(false)}
              className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            >
              Sluit
            </button>
          </div>
      </Sheet>

      {/* Destroy-all bottom sheet */}
      <Sheet open={destroyOpen} onClose={() => setDestroyOpen(false)} title="Vernietig alle data" aria-label="Alle data verwijderen">
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
            style={{ background: "color-mix(in srgb, var(--hard-no) 25%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--hard-no)" }}
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
      </Sheet>

      {/* Delete bottom sheet */}
      <Sheet open={sheetOpen} onClose={cancelDelete} title="Profiel verwijderen?" aria-label="Profiel verwijderen">
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
            style={{ background: "color-mix(in srgb, var(--hard-no) 25%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--hard-no)" }}
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
      </Sheet>

      {scanOpen && (
        <QRScanner
          open={scanOpen}
          onResult={(p) => {
            try { setImportPreview(decodeAny(p)); } catch { /* ongeldige QR */ }
            setScanOpen(false);
          }}
          onClose={() => setScanOpen(false)}
        />
      )}

      {/* Import profile sheet */}
      <Sheet open={!!importPreview} onClose={() => setImportPreview(null)} title="Profiel importeren?" aria-label="Profiel importeren">
        {importPreview && (
          <div
            className="rounded-xl p-4 mb-5 flex items-center gap-3"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-none"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "var(--on-accent)" }}
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
                importProfiles([{ ...importPreview, isImported: true, origin: "shared", lockedAt: Date.now() }]);
                setImportDone(true);
                router.replace("/");
                setTimeout(() => {
                  setImportPreview(null);
                  setImportDone(false);
                }, 1500);
              }}
              className="focus-ring w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
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
      </Sheet>

      {/* Export password modal */}
      {exportPwOpen && (
        <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4" style={{ background: "var(--scrim)" }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <AnimatePresence mode="wait" initial={false}>
              {exportPwStep === 0 ? (
                <motion.div
                  key="warning"
                  initial={{ x: -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -40, opacity: 0 }}
                  transition={t.slide}
                  className="p-6 flex flex-col gap-4"
                >
                  <h2 className="text-base font-bold">Backup versleutelen</h2>
                  <div className="rounded-xl p-4 text-sm flex flex-col gap-3" style={{ background: "color-mix(in srgb, var(--hard-no) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--hard-no) 25%, transparent)", color: "var(--text)" }}>
                    <p><strong>Je staat op het punt gevoelige data te exporteren.</strong> Je kinklijst bevat je grenzen, verlangens en aantekeningen — informatie die niemand anders mag zien.</p>
                    <p>Met encryptie is het bestand waardeloos zonder jouw wachtwoord. Zonder encryptie kan iedereen die het bestand vindt alles lezen.</p>
                    <p className="font-semibold" style={{ color: "var(--hard-no)" }}>⚠ Als je dit wachtwoord vergeet, is je backup permanent onleesbaar. Er is geen hersteloptie.</p>
                  </div>
                  <button
                    onClick={() => setExportPwStep(1)}
                    className="w-full py-3 rounded-xl text-sm font-semibold"
                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                  >
                    Doorgaan
                  </button>
                  <button
                    onClick={() => { resetExportPwState(); setExportPwOpen(false); }}
                    className="w-full py-3 rounded-xl text-sm"
                    style={{ color: "var(--text2)" }}
                  >
                    ← Terug
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="fields"
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 40, opacity: 0 }}
                  transition={t.slide}
                  className="p-6 flex flex-col gap-4"
                >
                  <h2 className="text-base font-bold">Kies een wachtwoord</h2>
                  <div className="relative">
                    <input
                      type={exportPwShow ? "text" : "password"}
                      placeholder="Wachtwoord (min. 8 tekens)"
                      value={exportPw}
                      onChange={(e) => setExportPw(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setExportPwShow((v) => !v)}
                      aria-label={exportPwShow ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 focus-ring rounded p-0.5"
                      style={{ color: "var(--text2)" }}
                    >
                      {exportPwShow ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={exportPwShow ? "text" : "password"}
                      placeholder="Herhaal wachtwoord"
                      value={exportPwConfirm}
                      onChange={(e) => setExportPwConfirm(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleExportEncrypted(); }}
                      className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                    <button
                      type="button"
                      onClick={() => setExportPwShow((v) => !v)}
                      aria-label={exportPwShow ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 focus-ring rounded p-0.5"
                      style={{ color: "var(--text2)" }}
                    >
                      {exportPwShow ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {exportPwError && <p className="text-xs" style={{ color: "var(--hard-no)" }}>{exportPwError}</p>}
                  <button
                    onClick={handleExportEncrypted}
                    disabled={exportPwLoading}
                    className="w-full py-3 rounded-xl text-sm font-semibold"
                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                  >
                    {exportPwLoading ? "Versleutelen…" : "⬇ Versleuteld exporteren"}
                  </button>
                  <button
                    onClick={() => setExportPwStep(0)}
                    className="w-full py-3 rounded-xl text-sm"
                    style={{ color: "var(--text2)" }}
                  >
                    ← Terug
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Import password modal */}
      <AnimatePresence>
        {importPwOpen && (
          <motion.div
            key="import-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={t.fast}
            className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4"
            style={{ background: "var(--scrim)" }}
          >
            <motion.div
              key="import-card"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={t.fast}
              className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <h2 className="text-base font-bold">Versleutelde backup ontgrendelen</h2>
              <p className="text-xs" style={{ color: "var(--text2)" }}>Voer het wachtwoord in waarmee je deze backup hebt beveiligd.</p>
              <div className="relative">
                <input
                  type={importPwShow ? "text" : "password"}
                  placeholder="Wachtwoord"
                  value={importPw}
                  onChange={(e) => setImportPw(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleImportDecrypt(); }}
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setImportPwShow((v) => !v)}
                  aria-label={importPwShow ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 focus-ring rounded p-0.5"
                  style={{ color: "var(--text2)" }}
                >
                  {importPwShow ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {importPwError && <p className="text-xs" style={{ color: "var(--hard-no)" }}>{importPwError}</p>}
              <button
                onClick={handleImportDecrypt}
                disabled={importPwLoading}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                {importPwLoading ? "Ontsleutelen…" : "Backup herstellen"}
              </button>
              <button
                onClick={() => { setImportPwOpen(false); setPendingEncrypted(null); }}
                className="w-full py-3 rounded-xl text-sm"
                style={{ color: "var(--text2)" }}
              >
                Annuleer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA install guide */}
      {_hasHydrated && !installPromptDismissed && onboardingComplete && !isStandalone && (isIos || hasNativePrompt) && (
        <PwaInstallGuide
          isIos={isIos}
          onInstall={handleInstall}
          onDismiss={dismissInstallPrompt}
        />
      )}

      {/* PIN flow modal */}
      {pinFlowOpen && (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-4" style={{ background: "var(--scrim)" }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <AnimatePresence mode="wait" initial={false}>
              {pinFlowStep === 0 && (
                <motion.div key="pin-intro"
                  initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}
                  transition={t.slide}
                  className="p-6 flex flex-col gap-4"
                >
                  <h2 className="text-base font-bold">PIN-vergrendeling</h2>
                  <p className="text-sm" style={{ color: "var(--text2)" }}>
                    Stel een PIN in om de app te beveiligen. Je hebt deze nodig bij elke herstart.
                  </p>
                  <button onClick={() => setPinFlowStep(1)}
                    className="w-full py-3 rounded-xl text-sm font-semibold"
                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                    PIN instellen →
                  </button>
                  <button onClick={closePinFlow} className="w-full py-3 rounded-xl text-sm" style={{ color: "var(--text2)" }}>
                    Annuleer
                  </button>
                </motion.div>
              )}
              {pinFlowStep === 1 && (
                <motion.div key="pin-enter"
                  initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
                  transition={t.slide}
                  className="p-6 flex flex-col gap-4"
                >
                  <h2 className="text-base font-bold">Kies een PIN</h2>
                  <input
                    type="password" inputMode="numeric" pattern="[0-9]*" maxLength={8}
                    placeholder="Minimaal 4 cijfers"
                    value={pinInput} onChange={e => { setPinInput(e.target.value.replace(/\D/g, "")); setPinError(null); }}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none tracking-widest text-center"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "1.5rem" }}
                    autoFocus
                  />
                  <input
                    type="password" inputMode="numeric" pattern="[0-9]*" maxLength={8}
                    placeholder="Herhaal PIN"
                    value={pinConfirm} onChange={e => { setPinConfirm(e.target.value.replace(/\D/g, "")); setPinError(null); }}
                    onKeyDown={e => { if (e.key === "Enter") handleSavePin(); }}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none tracking-widest text-center"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "1.5rem" }}
                  />
                  {pinError && <p className="text-xs text-center" style={{ color: "var(--hard-no)" }}>{pinError}</p>}
                  <button onClick={handleSavePin}
                    className="w-full py-3 rounded-xl text-sm font-semibold"
                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                    PIN opslaan
                  </button>
                  <button onClick={() => setPinFlowStep(0)} className="w-full py-3 rounded-xl text-sm" style={{ color: "var(--text2)" }}>
                    ← Terug
                  </button>
                </motion.div>
              )}
              {pinFlowStep === 2 && (
                <motion.div key="pin-remove"
                  initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
                  transition={t.slide}
                  className="p-6 flex flex-col gap-4"
                >
                  <h2 className="text-base font-bold">PIN verwijderen</h2>
                  <p className="text-sm" style={{ color: "var(--text2)" }}>
                    De app wordt niet meer vergrendeld bij het herstarten.
                  </p>
                  <button onClick={handleRemovePin}
                    className="w-full py-3 rounded-xl text-sm font-semibold"
                    style={{ background: "var(--hard-no)", color: "#fff" }}>
                    Ja, verwijder PIN
                  </button>
                  <button onClick={closePinFlow} className="w-full py-3 rounded-xl text-sm" style={{ color: "var(--text2)" }}>
                    Annuleer
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
