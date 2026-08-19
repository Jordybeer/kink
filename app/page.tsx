"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Camera, UserPlus, X } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import type { Profile, ProfileIdentityAnchorMethod } from "@/types";
import type { EncryptedBackup } from "@/lib/crypto";
import { useStore, useHasHydrated } from "@/lib/store";
import { decodeSharedProfileTransfer } from "@/lib/profileSwitchShare";
import { parseSharePaste } from "@/lib/parseSharePaste";
import { classifyProfileImportWithIdentityAnchor, getProfileVerificationCode } from "@/lib/profileVerification";
import { profileConsentAlias, verifyProfileConsent } from "@/lib/consentProof";
import { createProfileIdentityAnchor } from "@/lib/profileIdentityTrust";
import {
  persistProfileIdentityAnchor,
  readProfileIdentityAnchorRegistry,
  removePersistedProfileIdentityAnchor,
} from "@/lib/storeSecurity";
import Onboarding from "@/components/Onboarding";
import PwaInstallGuide from "@/components/PwaInstallGuide";
import PageShell from "@/components/PageShell";
import Wordmark from "@/components/Wordmark";
import ProfileList from "@/components/ProfileList";
import ProfileCreateSheet from "@/components/ProfileCreateSheet";
import SettingsSheet from "@/components/sheets/SettingsSheet";
import PinFlowSheet from "@/components/sheets/PinFlowSheet";
import DestroyAllSheet from "@/components/sheets/DestroyAllSheet";
import { EncryptedExportSheet, EncryptedImportSheet } from "@/components/sheets/EncryptedBackupSheets";
import { backupFileSizeAllowed } from "@/lib/importLimits";
import Sheet from "@/components/ui/Sheet";

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
    deleteProfile,
    importProfiles,
    restoreBackupProfiles,
    restoreContracts,
    onboardingComplete,
    completeOnboarding,
    installPromptDismissed,
    dismissInstallPrompt,
  } = useStore();
  const hydrated = useHasHydrated();

  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
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

  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [importTransfer, setImportTransfer] = useState<Profile[] | null>(null);
  const [importDone, setImportDone] = useState(false);
  const [identityConfirmMethod, setIdentityConfirmMethod] = useState<ProfileIdentityAnchorMethod | null>(null);
  const [identityConfirmError, setIdentityConfirmError] = useState<string | null>(null);
  const [identityConfirming, setIdentityConfirming] = useState(false);
  const importPreview = importTransfer?.[0] ?? null;
  const persistedAnchors = importTransfer ? readProfileIdentityAnchorRegistry().anchors : [];
  const importIdentities = importTransfer?.map((candidate) =>
    classifyProfileImportWithIdentityAnchor(profiles, candidate, persistedAnchors)) ?? [];
  const importIdentity = (() => {
    const conflict = importIdentities.find((identity) => identity.kind === "identity-conflict");
    if (conflict) return conflict;
    if (importIdentities.length > 0 && importIdentities.every((identity) => identity.kind === "anchored-update")) {
      return importIdentities[0];
    }
    return importIdentities.find((identity) => identity.kind === "legacy-unverified")
      ?? importIdentities.find((identity) => identity.kind === "new-unanchored")
      ?? importIdentities.find((identity) => identity.kind === "anchored-update")
      ?? null;
  })();
  const hasIdentityConflict = importIdentities.some((identity) => identity.kind === "identity-conflict");
  const hasLegacyUnverified = importIdentities.some((identity) => identity.kind === "legacy-unverified");
  const needsIdentityConfirmation = importIdentities.some((identity) => identity.kind === "new-unanchored");
  const allAnchoredUpdates = importIdentities.length > 0
    && importIdentities.every((identity) => identity.kind === "anchored-update");
  const isSwitchImport = importTransfer?.length === 2
    && !!importTransfer[0].switchShareProof
    && !!importTransfer[0].personGroupId
    && importTransfer.every((candidate) =>
      candidate.personGroupId === importTransfer[0].personGroupId);

  useEffect(() => {
    setIdentityConfirmMethod(null);
    setIdentityConfirmError(null);
    setIdentityConfirming(false);
  }, [importTransfer]);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    setIsIos(/iPhone|iPad|iPod/.test(userAgent) && !/Chrome/.test(userAgent));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const handler = (event: Event) => {
      event.preventDefault();
      deferredPrompt.current = event as BeforeInstallPromptEvent;
      setHasNativePrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function readShareLocation() {
      const parsed = parseSharePaste(window.location.href);
      if (parsed.kind !== "profile") return;
      try {
        const decoded = await decodeSharedProfileTransfer(parsed.encoded);
        if (!cancelled) setImportTransfer(decoded.profiles);
      } catch {
        // Beschadigde of ongeldige deelcodes komen niet in de store.
      }
    }

    void readShareLocation();
    window.addEventListener("hashchange", readShareLocation);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", readShareLocation);
    };
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

  function promptDelete(id: string) {
    setDeleteTarget(id);
    setDeleteSheetOpen(true);
  }

  function closeDeleteSheet() {
    setDeleteSheetOpen(false);
    window.setTimeout(() => setDeleteTarget(null), 300);
  }

  function confirmDelete() {
    if (deleteTarget) deleteProfile(deleteTarget);
    closeDeleteSheet();
  }

  async function restoreFromParsed(parsed: Record<string, unknown>) {
    try {
      const { prepareBackupRestore } = await import("@/lib/backupRestore");
      const prepared = await prepareBackupRestore(parsed);
      if (!prepared.profiles.length && !prepared.contracts.length) {
        setImportError("Ongeldig bestand: geen geldige profielen gevonden.");
        return;
      }
      if (prepared.source === "backup") restoreBackupProfiles(prepared.profiles, prepared.ownerKeys);
      else importProfiles(prepared.profiles);
      if (prepared.contracts.length) restoreContracts(prepared.contracts);
      setImportSuccess(
        `${prepared.profiles.length} profiel(en), ${prepared.ownerKeys.length} eigendomssleutel(s) en ${prepared.contracts.length} contract(en) hersteld.`,
      );
    } catch {
      setImportError("Ongeldig bestand: geen geldige profielen gevonden.");
    }
  }

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null);
    setImportSuccess(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!backupFileSizeAllowed(file.size)) {
      setImportError("Backupbestand is te groot (max. 10 MB).");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      try {
        const parsed = JSON.parse(loadEvent.target?.result as string);
        if (parsed.encrypted === true) {
          setPendingEncrypted(parsed as EncryptedBackup);
          setImportPwOpen(true);
        } else {
          await restoreFromParsed(parsed as Record<string, unknown>);
        }
      } catch {
        setImportError("Bestand kon niet worden gelezen.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function finishProfileImport(): boolean {
    if (!importTransfer?.length) return false;
    const prepared = importTransfer.map((candidate) => ({
      ...candidate,
      verificationCode: getProfileVerificationCode(candidate),
      isImported: true,
      origin: "shared" as const,
      lockedAt: Date.now(),
    }));
    importProfiles(prepared);
    const stored = useStore.getState().profiles;
    const accepted = prepared.every((candidate) => stored.some((profile) =>
      profile.id === candidate.id
      && getProfileVerificationCode(profile) === getProfileVerificationCode(candidate)));
    if (!accepted) return false;

    setImportDone(true);
    router.replace("/");
    window.setTimeout(() => {
      setImportTransfer(null);
      setImportDone(false);
    }, 1500);
    return true;
  }

  async function confirmIdentityAndImport() {
    if (!importTransfer?.length || !identityConfirmMethod || hasIdentityConflict || hasLegacyUnverified) return;
    setIdentityConfirmError(null);
    setIdentityConfirming(true);
    const newlyPersistedProfileIds: string[] = [];

    try {
      const currentAnchors = readProfileIdentityAnchorRegistry().anchors;
      for (let index = 0; index < importTransfer.length; index += 1) {
        const candidate = importTransfer[index];
        const identity = importIdentities[index];
        if (identity?.kind === "anchored-update") continue;
        if (identity?.kind !== "new-unanchored") {
          throw new Error("Deze import kan niet als nieuw contact worden bevestigd.");
        }

        const verification = await verifyProfileConsent(candidate);
        if (verification.status !== "valid" || !candidate.consentProof) {
          throw new Error("De digitale handtekening is niet geldig. Identiteitsbevestiging is geblokkeerd.");
        }

        const existed = currentAnchors.some((anchor) => anchor.profileId === candidate.id);
        const anchor = createProfileIdentityAnchor(
          candidate,
          candidate.consentProof,
          Date.now(),
          identityConfirmMethod,
        );
        if (!persistProfileIdentityAnchor(anchor)) {
          throw new Error("De onafhankelijke identiteitsbevestiging kon niet veilig worden opgeslagen.");
        }
        if (!existed) newlyPersistedProfileIds.push(candidate.id);
      }

      if (!finishProfileImport()) {
        throw new Error("Het profiel kon niet veilig worden geïmporteerd; de identiteitsbevestiging is teruggedraaid.");
      }
    } catch (error) {
      for (const profileId of newlyPersistedProfileIds) removePersistedProfileIdentityAnchor(profileId);
      setIdentityConfirmError(error instanceof Error ? error.message : "Identiteitsbevestiging is mislukt.");
    } finally {
      setIdentityConfirming(false);
    }
  }

  if (!hydrated) return <PageShell loading width="2xl" />;

  if (!onboardingComplete) return <Onboarding onComplete={completeOnboarding} />;

  const deleteTargetProfile = profiles.find((profile) => profile.id === deleteTarget);

  return (
    <>
      <PageShell width="2xl" className="lg:max-w-4xl">
        <div className="mb-6 pt-3 text-center">
          <h1 className="text-6xl"><Wordmark /></h1>
          <div className="ks-gradient-rule mx-auto my-4" />
          <p className="text-sm italic tracking-wide" style={{ color: "var(--text2)" }}>
            Verken grenzen. Samen.
          </p>
        </div>

        {profiles.length > 0 && <ProfileList onPromptDelete={promptDelete} />}

        {profiles.length > 0 ? (
          <div className={`grid ${importPreview ? "grid-cols-1" : "grid-cols-2"} gap-2 mt-6 mb-5`}>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="focus-ring min-h-[76px] rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left transition-colors"
              style={{
                background: "color-mix(in srgb, var(--accent) 7%, var(--surface2))",
                border: "1px solid var(--border-accent)",
              }}
            >
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center flex-none"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                <UserPlus size={19} weight="bold" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Nieuw profiel</span>
                <span className="block text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                  Perspectief en startlijst
                </span>
              </span>
              <ArrowRight size={15} aria-hidden="true" className="flex-none" style={{ color: "var(--accent)" }} />
            </button>

            {!importPreview && (
              <button
                type="button"
                onClick={() => {
                  setScanError(null);
                  setScanOpen(true);
                }}
                className="focus-ring min-h-[76px] rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left transition-colors"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
              >
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-none"
                  style={{ background: "var(--surface3)", color: "var(--text2)" }}
                >
                  <Camera size={19} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Scan profiel</span>
                  <span className="block text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                    Voeg je partner toe
                  </span>
                </span>
                <ArrowRight size={15} aria-hidden="true" className="flex-none" style={{ color: "var(--text2)" }} />
              </button>
            )}
          </div>
        ) : (
          <section
            className="relative overflow-hidden rounded-[26px] p-5 mb-5"
            style={{
              background: "color-mix(in srgb, var(--accent) 7%, var(--surface2))",
              border: "1px solid var(--border-accent)",
              boxShadow: "0 18px 60px color-mix(in srgb, var(--accent) 10%, transparent)",
            }}
          >
            <div
              className="absolute -right-14 -top-14 w-36 h-36 rounded-full blur-3xl pointer-events-none"
              style={{ background: "color-mix(in srgb, var(--accent) 24%, transparent)" }}
              aria-hidden="true"
            />
            <div className="relative">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                <UserPlus size={23} weight="duotone" aria-hidden="true" />
              </div>
              <p className="text-xs uppercase tracking-[0.2em] mb-1.5" style={{ color: "var(--accent)" }}>
                Jouw startpunt
              </p>
              <h2
                className="text-3xl leading-tight mb-2"
                style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600 }}
              >
                Maak je eerste profiel
              </h2>
              <p className="text-sm leading-relaxed mb-5 max-w-md" style={{ color: "var(--text2)" }}>
                Kies je naam, perspectief, interesses en gewenste lijstomvang. Je antwoorden en foto volgen daarna in je eigen tempo.
              </p>

              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="focus-ring w-full min-h-12 rounded-xl px-4 flex items-center justify-center gap-2 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
              >
                Begin met jouw profiel
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </button>

              {!importPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setScanError(null);
                    setScanOpen(true);
                  }}
                  className="focus-ring w-full min-h-11 mt-2 rounded-xl px-4 flex items-center justify-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--text2)", border: "1px solid var(--border)", background: "var(--surface)" }}
                >
                  <Camera size={16} aria-hidden="true" />
                  Scan het profiel van je partner
                </button>
              )}
            </div>
          </section>
        )}

        {profiles.length === 0 && (
          <p className="text-xs text-center px-4" style={{ color: "var(--text2)" }}>
            Je kunt later altijd een extra perspectief of partnerprofiel toevoegen.
          </p>
        )}

        <footer
          className="mx-auto mt-9 max-w-sm border-t px-4 pt-7 text-center"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-sm font-semibold tracking-[0.04em]" style={{ color: "var(--text)" }}>
            For adults. By adults.
          </p>
          <p className="mt-2 text-xs leading-5" style={{ color: "var(--text2)" }}>
            Vragen of suggesties?
          </p>
          <div className="mt-1.5 flex items-center justify-center gap-2 text-xs font-semibold">
            <a
              href="https://fetlife.com/zwoelebeer"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex min-h-11 items-center rounded-md px-2.5"
              style={{ color: "var(--accent-text)" }}
            >
              FetLife
            </a>
            <span aria-hidden="true" style={{ color: "var(--text2)" }}>·</span>
            <a
              href="mailto:info@jordy.beer"
              className="focus-ring inline-flex min-h-11 items-center rounded-md px-2.5"
              style={{ color: "var(--accent-text)" }}
            >
              E-mail
            </a>
          </div>
        </footer>
      </PageShell>

      <ProfileCreateSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenPinFlow={(step = 0) => {
          setPinFlowStep(step);
          setPinFlowOpen(true);
        }}
        onOpenDestroy={() => setDestroyOpen(true)}
        onExportBackup={() => {
          setSettingsOpen(false);
          setExportOpen(true);
        }}
        onImportFile={handleImportFile}
        importError={importError}
        importSuccess={importSuccess}
      />

      <PinFlowSheet
        open={pinFlowOpen}
        initialStep={pinFlowStep}
        onClose={() => setPinFlowOpen(false)}
      />

      <DestroyAllSheet
        open={destroyOpen}
        onClose={() => setDestroyOpen(false)}
      />

      <EncryptedExportSheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />

      <EncryptedImportSheet
        open={importPwOpen}
        data={pendingEncrypted}
        onClose={() => {
          setImportPwOpen(false);
          setPendingEncrypted(null);
        }}
        onSuccess={(message) => setImportSuccess(message)}
        onError={(message) => setImportError(message)}
      />

      <Sheet
        open={deleteSheetOpen}
        onClose={closeDeleteSheet}
        title="Profiel verwijderen?"
        aria-label="Profiel verwijderen"
      >
        {deleteTargetProfile && (
          <p className="text-center text-sm mb-6" style={{ color: "var(--text2)" }}>
            <span style={{ color: "var(--text)" }}>{deleteTargetProfile.name}</span> wordt permanent gewist. Dit kan niet ongedaan worden gemaakt.
          </p>
        )}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={confirmDelete}
            className="focus-ring w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: "color-mix(in srgb, var(--hard-no) 25%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--hard-no)" }}
          >
            Verwijder voor altijd
          </button>
          <button
            type="button"
            onClick={closeDeleteSheet}
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
          onResult={async (payload) => {
            try {
              setImportTransfer((await decodeSharedProfileTransfer(payload)).profiles);
              setScanError(null);
            } catch {
              setScanError("Profielcode is ongeldig of beschadigd.");
            }
            setScanOpen(false);
          }}
          onClose={() => setScanOpen(false)}
        />
      )}

      {scanError && (
        <div
          role="alert"
          className="fixed top-[calc(var(--nav-h)+12px)] left-4 right-4 z-[300] mx-auto max-w-md rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg ks-fade-in"
          style={{ background: "var(--surface)", border: "1px solid var(--hard-no)", color: "var(--hard-no)" }}
        >
          <span className="text-sm flex-1">{scanError}</span>
          <button
            type="button"
            onClick={() => setScanError(null)}
            aria-label="Sluit foutmelding"
            className="focus-ring p-1 rounded-lg flex-none"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <Sheet
        open={!!importPreview}
        onClose={() => setImportTransfer(null)}
        title={needsIdentityConfirmation ? "Identiteit onafhankelijk vergelijken" : isSwitchImport ? "Switch-profiel importeren?" : "Profiel importeren?"}
        aria-label="Profiel importeren"
      >
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
                  {isSwitchImport ? "Switch" : importPreview.role}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                  {importPreview.experienceLevel}
                </span>
              </div>
              <div className="text-xs mt-0.5 tabular-nums" style={{ color: "var(--text2)" }}>
                {(importTransfer ?? [importPreview]).reduce((total, candidate) => total + Object.values(candidate.entries).filter((entry) => entry.status).length, 0)} kinks beoordeeld{isSwitchImport ? " · 2 perspectieven" : ""}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text2)" }}>
                {isSwitchImport
                  ? "Switch-koppeling cryptografisch geldig · identiteit nog niet bevestigd"
                  : `${importPreview.consentProof ? "Digitale handtekening aanwezig" : "Niet ondertekend"} · ${profileConsentAlias(importPreview)}`}
              </div>
            </div>
          </div>
        )}

        {hasIdentityConflict && importIdentity?.kind === "identity-conflict" && (
          <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--hard-no) 10%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--text2)" }}>
            <strong style={{ color: "var(--hard-no)" }}>Identiteitsconflict — import geblokkeerd.</strong> Deze profielbron wijkt af van het lokaal verankerde contact ({importIdentity.reason}). Je kunt deze sleutel hier niet alsnog vertrouwen of importeren.
          </div>
        )}

        {allAnchoredUpdates && importIdentity?.kind === "anchored-update" && (
          <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--yes) 10%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--yes) 35%, var(--border))", color: "var(--text2)" }}>
            <strong style={{ color: "var(--yes)" }}>Verankerde identiteit herkend.</strong> Dit is een geldige nieuwere profielversie onder dezelfde onafhankelijk bevestigde sleutel.
          </div>
        )}

        {hasLegacyUnverified && !hasIdentityConflict && (
          <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
            <strong style={{ color: "var(--text)" }}>Legacy profiel · identiteit niet bevestigd.</strong> Zonder geldige digitale handtekening kan KinkSync geen identity anchor maken. Dit profiel kan alleen als legacy-onbevestigd worden opgeslagen; laat het later opnieuw delen vanaf het eigen toestel om de identiteit te kunnen verankeren.
          </div>
        )}

        {needsIdentityConfirmation && !hasIdentityConflict && !hasLegacyUnverified && (
          <div className="mb-4 space-y-4">
            <div className="rounded-xl px-3 py-3 text-sm" style={{ background: "color-mix(in srgb, var(--accent) 7%, var(--surface2))", border: "1px solid var(--border-accent)", color: "var(--text2)" }}>
              <strong style={{ color: "var(--text)" }}>Digitale handtekening geldig is niet hetzelfde als identiteit bevestigd.</strong> Vergelijk onderstaande waarden rechtstreeks op het toestel van deze persoon of via een echt apart kanaal. Vergelijk ze niet met dezelfde QR of link die je net hebt ontvangen.
            </div>

            {(importTransfer ?? []).map((candidate) => (
              <div key={candidate.id} className="rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{candidate.name} · {candidate.role}</p>
                <p className="mt-2 text-xs" style={{ color: "var(--text2)" }}>Leesbare broncode</p>
                <p className="mt-0.5 break-words text-sm font-semibold" data-testid={`identity-fingerprint-${candidate.id}`}>{profileConsentAlias(candidate)}</p>
                <p className="mt-2 text-xs" style={{ color: "var(--text2)" }}>Technische profielcode</p>
                <p className="mt-0.5 break-all font-mono text-xs" data-testid={`identity-code-${candidate.id}`}>{getProfileVerificationCode(candidate)}</p>
              </div>
            ))}

            <fieldset>
              <legend className="mb-2 text-xs font-semibold" style={{ color: "var(--text2)" }}>Hoe heb je onafhankelijk vergeleken?</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={identityConfirmMethod === "source-device-fingerprint"}
                  onClick={() => setIdentityConfirmMethod("source-device-fingerprint")}
                  className="focus-ring min-h-11 rounded-xl border px-3 py-2 text-left text-sm"
                  style={{ borderColor: identityConfirmMethod === "source-device-fingerprint" ? "var(--accent)" : "var(--border)", background: "var(--surface2)" }}
                >
                  Rechtstreeks op hun toestel
                </button>
                <button
                  type="button"
                  aria-pressed={identityConfirmMethod === "independent-channel-fingerprint"}
                  onClick={() => setIdentityConfirmMethod("independent-channel-fingerprint")}
                  className="focus-ring min-h-11 rounded-xl border px-3 py-2 text-left text-sm"
                  style={{ borderColor: identityConfirmMethod === "independent-channel-fingerprint" ? "var(--accent)" : "var(--border)", background: "var(--surface2)" }}
                >
                  Via een apart kanaal
                </button>
              </div>
            </fieldset>
          </div>
        )}

        {identityConfirmError && (
          <div role="alert" className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--hard-no) 10%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--hard-no)" }}>
            {identityConfirmError}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {importDone ? (
            <p className="text-sm text-center py-2 font-semibold" style={{ color: "var(--accent)" }}>
              {isSwitchImport ? "Switch-profiel geïmporteerd" : "Profiel geïmporteerd"}
            </p>
          ) : hasIdentityConflict ? (
            importIdentity?.kind === "identity-conflict" && importIdentity.profile ? (
              <button
                type="button"
                onClick={() => {
                  setImportTransfer(null);
                  router.push(`/profile/${importIdentity.profile!.id}`);
                }}
                className="focus-ring w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
              >
                Open bestaand profiel
              </button>
            ) : null
          ) : needsIdentityConfirmation && !hasLegacyUnverified ? (
            <button
              type="button"
              disabled={!identityConfirmMethod || identityConfirming}
              onClick={() => void confirmIdentityAndImport()}
              className="focus-ring w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              {identityConfirming ? "Bevestiging opslaan…" : "Codes onafhankelijk vergeleken — bevestig en importeer"}
            </button>
          ) : hasLegacyUnverified ? (
            <button
              type="button"
              onClick={() => {
                if (!finishProfileImport()) setIdentityConfirmError("Het legacy-profiel kon niet veilig worden geïmporteerd.");
              }}
              className="focus-ring w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}
            >
              Importeer als legacy-onbevestigd
            </button>
          ) : allAnchoredUpdates ? (
            <button
              type="button"
              onClick={() => {
                if (!finishProfileImport()) setIdentityConfirmError("De verankerde update kon niet veilig worden geïmporteerd.");
              }}
              className="focus-ring w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Verankerde update importeren
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setImportTransfer(null);
              router.replace("/");
            }}
            className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}
          >
            Niet nu
          </button>
        </div>
      </Sheet>

      {hydrated && !installPromptDismissed && onboardingComplete && !isStandalone && (isIos || hasNativePrompt) && (
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
