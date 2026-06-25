"use client";
import { useState, useEffect, useRef, Suspense } from "react";
<<<<<<< HEAD
import { Camera } from "lucide-react";
=======
import { Camera, Pin, PinOff, Pencil, Eye, EyeOff, Zap, FileText, Clapperboard, Anchor, Lock, Palette, HardDrive, Key, Fingerprint, Compass, RotateCcw, AlertTriangle, Download, Upload } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { STAGGER_CHILDREN, fadeUp, useMotionSafe } from "@/lib/motion";
>>>>>>> origin/dev
import Sheet from "@/components/ui/Sheet";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, useHasHydrated } from "@/lib/store";
import { ROLE_GROUPS, EXPERIENCE_LEVELS, RELATIONSHIP_STATUSES } from "@/lib/roles";
import type { ExperienceLevel, Profile, ContractSnapshot } from "@/types";
import Onboarding from "@/components/Onboarding";
import PwaInstallGuide from "@/components/PwaInstallGuide";
import AppLock from "@/components/AppLock";
import PageShell from "@/components/PageShell";
import Wordmark from "@/components/Wordmark";
import dynamic from "next/dynamic";
import { decodeAny } from "@/lib/shareProfile";
import { eligibleParentProfiles } from "@/lib/subprofile";
import ProfileList from "@/components/ProfileList";
import SettingsSheet from "@/components/sheets/SettingsSheet";
import PinFlowSheet from "@/components/sheets/PinFlowSheet";
import DestroyAllSheet from "@/components/sheets/DestroyAllSheet";
import { EncryptedExportSheet, EncryptedImportSheet } from "@/components/sheets/EncryptedBackupSheets";
import type { EncryptedBackup } from "@/lib/crypto";

const QRScanner = dynamic(() => import("@/components/QRScanner"), { ssr: false });

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    profiles,
    createProfile,
    deleteProfile,
    importProfiles,
    restoreContracts,
    onboardingComplete,
    completeOnboarding,
    installPromptDismissed,
    dismissInstallPrompt,
    pinnedProfileId,
    resetProfileTour,
    appLockEnabled,
    appLockPin,
    biometricEnabled,
    biometricCredentialId,
  } = useStore();
  const _hasHydrated = useHasHydrated();

  // PWA install
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // App lock
  const [lockState, setLockState] = useState<"locked" | "unlocked">("unlocked");
  const sessionUnlocked = useRef(
    typeof sessionStorage !== "undefined" && sessionStorage.getItem("app_unlocked") === "1"
  );

  // Profile create form
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [parentName, setParentName] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Sheet orchestration
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pinFlowOpen, setPinFlowOpen] = useState(false);
  const [pinFlowStep, setPinFlowStep] = useState(0);
  const [destroyOpen, setDestroyOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importPwOpen, setImportPwOpen] = useState(false);
  const [pendingEncrypted, setPendingEncrypted] = useState<EncryptedBackup | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // QR / share import
  const [scanOpen, setScanOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Profile | null>(null);
  const [importDone, setImportDone] = useState(false);

  useEffect(() => {
    if (_hasHydrated && appLockEnabled && !sessionUnlocked.current) setLockState("locked");
  }, [_hasHydrated, appLockEnabled]);

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
    try { setImportPreview(decodeAny(p)); } catch { /* ongeldige parameter */ }
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
    setName(""); setRelationshipStatus(""); setParentName(null);
    router.push(`/profile/${id}`);
  }

  function promptDelete(id: string) {
    setDeleteTarget(id);
    setDeleteSheetOpen(true);
  }

  function confirmDelete() {
    if (deleteTarget) deleteProfile(deleteTarget);
    setDeleteSheetOpen(false);
    setTimeout(() => setDeleteTarget(null), 300);
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

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
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

  if (!onboardingComplete) return <Onboarding onComplete={completeOnboarding} />;

  const parentCandidates = eligibleParentProfiles(profiles, pinnedProfileId);
  const deleteTargetProfile = profiles.find((p) => p.id === deleteTarget);

  return (
    <>
      <PageShell width="2xl">
        {/* Hero */}
        <div className="mb-10 pt-3 text-center">
          <h1 className="text-6xl"><Wordmark /></h1>
          <div className="ks-gradient-rule mx-auto my-4" />
          <p className="text-sm italic tracking-wide" style={{ color: "var(--text2)" }}>
            Verken grenzen. Samen.
          </p>
        </div>

        {/* Create profile form */}
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
                    style={parentName === null
                      ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                      : { color: "var(--text2)", borderColor: "var(--border)" }}
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
                      style={parentName === candidate
                        ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                        : { color: "var(--text2)", borderColor: "var(--border)" }}
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
              {nameError && <p className="text-xs mt-1" style={{ color: "var(--hard-no)" }}>{nameError}</p>}
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
                        style={role === r
                          ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                          : { color: "var(--text2)", borderColor: "var(--border)" }}
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
                  style={experienceLevel === l.value
                    ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                    : { color: "var(--text2)", borderColor: "var(--border)" }}
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
                  style={relationshipStatus === s
                    ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                    : { color: "var(--text2)", borderColor: "var(--border)" }}
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

        {/* Scan QR */}
        {!importPreview && (
          <button
            onClick={() => setScanOpen(true)}
            className="relative overflow-hidden focus-ring w-full rounded-xl p-4 mb-3 flex items-center gap-3 text-left"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <Camera size={18} aria-hidden="true" />
            <span className="flex-1 text-sm font-medium" style={{ color: "var(--text2)" }}>
              Scan QR — importeer profiel van partner
            </span>
          </button>
        )}

        {/* Profile list */}
        {profiles.length === 0 ? (
          <p className="text-center text-sm py-12" style={{ color: "var(--text2)" }}>
            Nog geen profielen. Wie ben jij in de speelkamer?
          </p>
        ) : (
          <ProfileList onPromptDelete={promptDelete} />
        )}
      </PageShell>

<<<<<<< HEAD
      {/* Settings sheet */}
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenPinFlow={(step = 0) => { setPinFlowStep(step); setPinFlowOpen(true); }}
        onOpenDestroy={() => setDestroyOpen(true)}
        onResetTour={resetProfileTour}
        onExportBackup={() => setExportOpen(true)}
        onImportFile={handleImportFile}
        importError={importError}
        importSuccess={importSuccess}
      />

      {/* PIN flow */}
      <PinFlowSheet
        open={pinFlowOpen}
        initialStep={pinFlowStep}
        onClose={() => setPinFlowOpen(false)}
      />

      {/* Destroy all */}
      <DestroyAllSheet
        open={destroyOpen}
        onClose={() => setDestroyOpen(false)}
      />

      {/* Encrypted export */}
      <EncryptedExportSheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />

      {/* Encrypted import */}
      <EncryptedImportSheet
        open={importPwOpen}
        data={pendingEncrypted}
        onClose={() => { setImportPwOpen(false); setPendingEncrypted(null); }}
        onSuccess={(msg) => setImportSuccess(msg)}
        onError={(msg) => setImportError(msg)}
      />
=======
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
>>>>>>> origin/dev

      {/* Delete profile sheet */}
      <Sheet
        open={deleteSheetOpen}
        onClose={() => { setDeleteSheetOpen(false); setTimeout(() => setDeleteTarget(null), 300); }}
        title="Profiel verwijderen?"
        aria-label="Profiel verwijderen"
      >
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
            onClick={() => { setDeleteSheetOpen(false); setTimeout(() => setDeleteTarget(null), 300); }}
            className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}
          >
            Annuleer
          </button>
        </div>
      </Sheet>

      {/* QR scanner */}
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
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}>
                  {importPreview.role}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)" }}>
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
                setTimeout(() => { setImportPreview(null); setImportDone(false); }, 1500);
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

      {/* PWA install guide */}
      {_hasHydrated && !installPromptDismissed && onboardingComplete && !isStandalone && (isIos || hasNativePrompt) && (
        <PwaInstallGuide
          isIos={isIos}
          onInstall={handleInstall}
          onDismiss={dismissInstallPrompt}
        />
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
