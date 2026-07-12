"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { Camera, PlusCircle, X } from "@phosphor-icons/react";
import Sheet from "@/components/ui/Sheet";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, useHasHydrated } from "@/lib/store";
import { EXPERIENCE_LEVELS, RELATIONSHIP_STATUSES } from "@/lib/roles";
import RolePicker from "@/components/RolePicker";
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
    // Read the flag live, never a mount-time snapshot — onboarding raises it
    // mid-session the moment a PIN is chosen, and a stale read here yanks the
    // wizard back to slide one (corrections.md 2026-07-11).
    if (_hasHydrated && appLockEnabled && sessionStorage.getItem("app_unlocked") !== "1") setLockState("locked");
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
          setLockState("unlocked");
        }}
      />
    );
  }

  if (!onboardingComplete) return <Onboarding onComplete={completeOnboarding} />;

  const parentCandidates = eligibleParentProfiles(profiles, pinnedProfileId);
  const deleteTargetProfile = profiles.find((p) => p.id === deleteTarget);

  // The hero speaks to the state of the house, not into the void.
  const tagline =
    profiles.length === 1 ? "Eén profiel staat klaar. Nodig je partner uit."
    : profiles.length === 2 ? "Twee profielen. Eén gesprek."
    : profiles.length > 2 ? "Alle stemmen aan tafel. Eén gesprek."
    : "Verken grenzen. Samen.";

  return (
    <>
      <PageShell width="2xl" className="lg:max-w-4xl">
        {/* Hero */}
        <div className="mb-6 pt-3 text-center">
          <h1 className="text-6xl"><Wordmark /></h1>
          <div className="ks-gradient-rule mx-auto my-4" />
          <p className="text-sm italic tracking-wide" style={{ color: "var(--text2)" }}>
            {tagline}
          </p>
        </div>

        {/* The salon: profiles take the stage first, admin waits by the door */}
        {profiles.length > 0 && <ProfileList onPromptDelete={promptDelete} />}

        {/* Quiet footer actions — the staff entrance */}
        {profiles.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-6 mb-4">
            <button
              onClick={() => setFormOpen((v) => !v)}
              className="focus-ring inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full text-sm font-medium transition-colors"
              style={{ color: formOpen ? "var(--text2)" : "var(--accent)" }}
            >
              {formOpen
                ? <X size={16} aria-hidden="true" />
                : <PlusCircle size={16} aria-hidden="true" />}
              {formOpen ? "Annuleer" : "Nieuw profiel"}
            </button>
            {!importPreview && (
              <>
                <span aria-hidden="true" style={{ color: "var(--text2)" }}>·</span>
                <button
                  onClick={() => setScanOpen(true)}
                  className="focus-ring inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full text-sm font-medium transition-colors"
                  style={{ color: "var(--text2)" }}
                >
                  <Camera size={16} aria-hidden="true" />
                  Scan QR
                </button>
              </>
            )}
          </div>
        )}

        {(profiles.length === 0 || formOpen) && (
          <form
            onSubmit={(e) => { handleCreate(e); setFormOpen(false); }}
            className="relative overflow-hidden rounded-xl p-5 mb-8"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            {/* The toggle above already announces "Nieuw profiel" — only title
                the form when it stands alone (first-run, no toggle). */}
            {profiles.length === 0 && (
              <h2 className="text-sm mb-4" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--text2)" }}>
                Nieuw profiel
              </h2>
            )}

            {parentCandidates.length > 0 && (
              <div className="mb-4">
                <p className="text-xs mb-1 font-medium" style={{ color: "var(--text2)" }}>Subprofiel van</p>
                <p className="text-xs mb-2" style={{ color: "var(--text2)" }}>Maak een tweede rol onder dezelfde naam — bijv. Dominant naast Submissive.</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setParentName(null); setName(""); }}
                    aria-pressed={parentName === null}
                    className="focus-ring px-3 min-h-9 rounded-full text-xs font-medium transition-colors border"
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
                      className="focus-ring px-3 min-h-9 rounded-full text-xs font-medium transition-colors border"
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
            <div className="mb-4">
              <RolePicker value={role} onChange={setRole} />
            </div>

            <fieldset className="mb-4 border-0 p-0 m-0">
            <legend className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>Ervaringsniveau</legend>
            <div className="grid grid-cols-4 gap-1.5">
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
                  <span className="text-xs opacity-70">{l.sub}</span>
                </button>
              ))}
            </div>
            </fieldset>

            <fieldset className="mb-4 border-0 p-0 m-0">
            <legend className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>Relatiestatus <span className="font-normal opacity-60">(optioneel)</span></legend>
            <div className="flex flex-wrap gap-1.5">
              {RELATIONSHIP_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRelationshipStatus((rs) => (rs === s ? "" : s))}
                  aria-pressed={relationshipStatus === s}
                  className="focus-ring px-3 min-h-9 rounded-full text-xs font-medium transition-colors border"
                  style={relationshipStatus === s
                    ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                    : { color: "var(--text2)", borderColor: "var(--border)" }}
                >
                  {s}
                </button>
              ))}
            </div>
            </fieldset>

            <button
              type="submit"
              className="focus-ring w-full py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Sla jezelf vast
            </button>
          </form>
        )}

        {/* First-run keeps the full-width invitation to scan */}
        {profiles.length === 0 && !importPreview && (
          <button
            onClick={() => setScanOpen(true)}
            className="relative overflow-hidden focus-ring w-full rounded-xl p-4 mb-3 flex items-center gap-3 text-left"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <Camera size={16} aria-hidden="true" style={{ color: "var(--accent)", flexShrink: 0 }} />
            <span className="flex-1 text-sm font-medium" style={{ color: "var(--text)" }}>
              Scan QR — importeer profiel van partner
            </span>
          </button>
        )}

        {profiles.length === 0 && (
          <p
            className="text-center py-12"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "1.25rem",
              lineHeight: 1.35,
              color: "var(--text2)",
            }}
          >
            Wie ben jij in de speelkamer?
          </p>
        )}
      </PageShell>

      {/* Settings sheet */}
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenPinFlow={(step = 0) => { setPinFlowStep(step); setPinFlowOpen(true); }}
        onOpenDestroy={() => setDestroyOpen(true)}
        onResetTour={resetProfileTour}
        onExportBackup={() => { setSettingsOpen(false); setExportOpen(true); }}
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
