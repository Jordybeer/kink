"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Camera, Sparkle, UploadSimple, UserPlus, X } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Profile, ProfileIdentityAnchorMethod } from "@/types";
import type { EncryptedBackup } from "@/lib/crypto";
import { useStore, useHasHydrated } from "@/lib/store";
import { decodeSharedProfileTransfer } from "@/lib/profileSwitchShare";
import { parseSharePaste } from "@/lib/parseSharePaste";
import { classifyProfileImportWithIdentityAnchor, getProfileVerificationCode } from "@/lib/profileVerification";
import { canonicalJson, profileConsentAlias, verifyProfileConsent } from "@/lib/consentProof";
import { createProfileIdentityAnchor } from "@/lib/profileIdentityTrust";
import {
  createImportOperationGuard,
  ImportOperationCancelledError,
  type ImportOperationGuard,
} from "@/lib/importOperationGuard";
import {
  commitProfileImportPlan,
  persistProfileIdentityAnchor,
  planSafeProfileImport,
  readProfileIdentityAnchorRegistry,
  removePersistedProfileIdentityAnchorIfMatches,
} from "@/lib/storeSecurity";
import FirstRunBackupRestore from "@/components/FirstRunBackupRestore";
import Onboarding from "@/components/Onboarding";
import PageShell from "@/components/PageShell";
import ProfileList from "@/components/ProfileList";
import ProfileCreateSheet from "@/components/ProfileCreateSheet";
import SettingsSheet from "@/components/sheets/SettingsSheet";
import PinFlowSheet from "@/components/sheets/PinFlowSheet";
import DestroyAllSheet from "@/components/sheets/DestroyAllSheet";
import { EncryptedExportSheet, EncryptedImportSheet } from "@/components/sheets/EncryptedBackupSheets";
import { backupFileSizeAllowed } from "@/lib/importLimits";
import { experienceLevelLabel } from "@/lib/roles";
import Sheet from "@/components/Sheet";

const QRScanner = dynamic(() => import("@/components/QRScanner"), { ssr: false });

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    profiles,
    deleteProfile,
    onboardingComplete,
    completeOnboarding,
  } = useStore();
  const hydrated = useHasHydrated();

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
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const importOperation = useRef<AbortController | null>(null);
  const [importReading, setImportReading] = useState(false);
  const [firstRunRestore, setFirstRunRestore] = useState(false);

  useEffect(() => () => importOperation.current?.abort(), []);

  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [importTransfer, setImportTransfer] = useState<Profile[] | null>(null);
  const [importDone, setImportDone] = useState(false);
  const [identityConfirmMethod, setIdentityConfirmMethod] = useState<ProfileIdentityAnchorMethod | null>(null);
  const [identityConfirmError, setIdentityConfirmError] = useState<string | null>(null);
  const [identityConfirming, setIdentityConfirming] = useState(false);
  const importTransferRef = useRef<Profile[] | null>(null);
  const identityConfirmMethodRef = useRef<ProfileIdentityAnchorMethod | null>(null);
  const importOperationGuardRef = useRef<ImportOperationGuard | null>(null);
  if (!importOperationGuardRef.current) importOperationGuardRef.current = createImportOperationGuard();
  const importOperationGuard = importOperationGuardRef.current;
  useEffect(() => () => importOperationGuard.invalidate(), [importOperationGuard]);
  const importPreview = importTransfer?.[0] ?? null;
  const persistedAnchors = importTransfer ? readProfileIdentityAnchorRegistry().anchors : [];
  const importIdentities = importTransfer?.map((candidate) =>
    classifyProfileImportWithIdentityAnchor(profiles, candidate, persistedAnchors)) ?? [];
  const importIdentity = (() => {
    const conflict = importIdentities.find((identity) => identity.kind === "identity-conflict");
    if (conflict) return conflict;
    if (importIdentities.length > 0 && importIdentities.every((identity) => (identity.kind === "anchored-update" || identity.kind === "anchored-existing" || identity.kind === "anchored-restore"))) {
      return importIdentities[0];
    }
    return importIdentities.find((identity) => identity.kind === "legacy-unverified")
      ?? importIdentities.find((identity) => identity.kind === "new-unanchored")
      ?? importIdentities.find((identity) => (identity.kind === "anchored-update" || identity.kind === "anchored-existing" || identity.kind === "anchored-restore"))
      ?? null;
  })();
  const hasIdentityConflict = importIdentities.some((identity) => identity.kind === "identity-conflict");
  const hasLegacyUnverified = importIdentities.some((identity) => identity.kind === "legacy-unverified");
  const needsIdentityConfirmation = importIdentities.some((identity) => identity.kind === "new-unanchored");
  const allAnchoredImports = importIdentities.length > 0
    && importIdentities.every((identity) => (identity.kind === "anchored-update" || identity.kind === "anchored-existing" || identity.kind === "anchored-restore"));
  const hasAnchoredRestore = importIdentities.some((identity) => identity.kind === "anchored-restore");
  const isSwitchImport = importTransfer?.length === 2
    && !!importTransfer[0].switchShareProof
    && !!importTransfer[0].personGroupId
    && importTransfer.every((candidate) =>
      candidate.personGroupId === importTransfer[0].personGroupId);

  const replaceImportTransfer = useCallback((next: Profile[] | null) => {
    importOperationGuard.invalidate();
    importTransferRef.current = next;
    identityConfirmMethodRef.current = null;
    setImportTransfer(next);
    setIdentityConfirmMethod(null);
    setIdentityConfirmError(null);
    setIdentityConfirming(false);
    setImportDone(false);
  }, [importOperationGuard]);

  function changeIdentityConfirmMethod(next: ProfileIdentityAnchorMethod) {
    importOperationGuard.invalidate();
    identityConfirmMethodRef.current = next;
    setIdentityConfirmMethod(next);
    setIdentityConfirmError(null);
    setIdentityConfirming(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function readShareLocation() {
      const decodeToken = importOperationGuard.begin();
      const parsed = parseSharePaste(window.location.href);
      if (parsed.kind !== "profile") return;
      try {
        const decoded = await decodeSharedProfileTransfer(parsed.encoded);
        if (!cancelled) {
          importOperationGuard.applyIfCurrent(decodeToken, () => replaceImportTransfer(decoded.profiles));
        }
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
  }, [searchParams, importOperationGuard, replaceImportTransfer]);

  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    window.addEventListener("ks:open-settings", handler);
    return () => window.removeEventListener("ks:open-settings", handler);
  }, []);

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

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || importOperation.current) return;
    const controller = new AbortController();
    importOperation.current = controller;
    setImportError(null);
    setImportSuccess(null);
    setImportReading(true);
    try {
      if (!backupFileSizeAllowed(file.size)) {
        setImportError("Backupbestand is te groot (max. 10 MB).");
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        if (!controller.signal.aborted) setImportError("Bestand kon niet worden gelezen.");
        return;
      }
      controller.signal.throwIfAborted();
      if (parsed && typeof parsed === "object" && "encrypted" in parsed && parsed.encrypted === true) {
        setPendingEncrypted(parsed as EncryptedBackup);
        setImportPwOpen(true);
      } else {
        const { restoreLocalBackup } = await import("@/lib/restoreLocalBackup");
        setImportSuccess(await restoreLocalBackup(parsed, controller.signal));
      }
    } catch {
      if (!controller.signal.aborted) setImportError("Ongeldig bestand: geen geldige KinkSync-backup gevonden.");
    } finally {
      if (importOperation.current === controller) {
        importOperation.current = null;
        setImportReading(false);
      }
    }
  }

  const encryptedImportSheet = (
    <EncryptedImportSheet
      open={importPwOpen}
      data={pendingEncrypted}
      onClose={() => { setImportPwOpen(false); setPendingEncrypted(null); }}
      onSuccess={setImportSuccess}
    />
  );
  function prepareProfileImport(transfer: readonly Profile[], lockedAt = Date.now()): Profile[] {
    return transfer.map((candidate) => ({
      ...candidate,
      verificationCode: getProfileVerificationCode(candidate),
      isImported: true,
      origin: "shared" as const,
      lockedAt,
    }));
  }

  function completeProfileImport(operationToken?: number) {
    setImportDone(true);
    router.replace("/");
    window.setTimeout(() => {
      if (operationToken !== undefined && !importOperationGuard.isCurrent(operationToken)) return;
      replaceImportTransfer(null);
    }, 1500);
  }

  function finishProfileImport(
    transfer: Profile[] | null = importTransferRef.current,
    operationToken?: number,
  ): boolean {
    if (!transfer?.length) return false;
    if (operationToken !== undefined) importOperationGuard.assertCurrent(operationToken);
    const previousProfiles = useStore.getState().profiles;
    const prepared = prepareProfileImport(transfer);
    if (allAnchoredImports) {
      const freshAnchors = readProfileIdentityAnchorRegistry().anchors;
      if (prepared.some((candidate) => {
        const identity = classifyProfileImportWithIdentityAnchor(previousProfiles, candidate, freshAnchors);
        return identity.kind !== "anchored-update" && identity.kind !== "anchored-existing" && identity.kind !== "anchored-restore";
      })) return false;
    }
    const plan = planSafeProfileImport(previousProfiles, prepared);
    if (plan.acceptedCount !== prepared.length) return false;

    if (operationToken !== undefined) importOperationGuard.assertCurrent(operationToken);
    if (!commitProfileImportPlan(useStore, plan)) return false;

    completeProfileImport(operationToken);
    return true;
  }

  async function confirmIdentityAndImport() {
    const transfer = importTransferRef.current;
    const method = identityConfirmMethodRef.current;
    if (!transfer?.length || !method || hasIdentityConflict || hasLegacyUnverified) return;
    const operationToken = importOperationGuard.begin();
    setIdentityConfirmError(null);
    setIdentityConfirming(true);
    const newlyPersistedAnchors: ReturnType<typeof createProfileIdentityAnchor>[] = [];
    let previousProfiles: Profile[] | null = null;

    try {
      for (const candidate of transfer) {
        importOperationGuard.assertCurrent(operationToken);
        const verification = await verifyProfileConsent(candidate);
        importOperationGuard.assertCurrent(operationToken);
        if (verification.status !== "valid" || !candidate.consentProof) {
          throw new Error("De digitale handtekening is niet geldig. Identiteitsbevestiging is geblokkeerd.");
        }
      }

      importOperationGuard.assertCurrent(operationToken);
      previousProfiles = useStore.getState().profiles;
      const initialAnchors = readProfileIdentityAnchorRegistry().anchors;
      const anchorsToCreate: ReturnType<typeof createProfileIdentityAnchor>[] = [];
      for (const candidate of transfer) {
        const identity = classifyProfileImportWithIdentityAnchor(previousProfiles, candidate, initialAnchors);
        if (identity.kind === "anchored-update" || identity.kind === "anchored-existing" || identity.kind === "anchored-restore") continue;
        if (identity.kind !== "new-unanchored" || !candidate.consentProof) {
          throw new Error("Deze import kan niet als nieuw contact worden bevestigd.");
        }
        anchorsToCreate.push(createProfileIdentityAnchor(
          candidate,
          candidate.consentProof,
          Date.now(),
          method,
        ));
      }

      const prepared = prepareProfileImport(transfer);
      const importPlan = planSafeProfileImport(previousProfiles, prepared);
      if (importPlan.acceptedCount !== prepared.length) {
        throw new Error("Het profiel kan niet veilig worden geïmporteerd zonder de ondertekende identiteit te wijzigen.");
      }

      for (const anchor of anchorsToCreate) {
        importOperationGuard.assertCurrent(operationToken);
        const freshProfiles = useStore.getState().profiles;
        const freshAnchors = readProfileIdentityAnchorRegistry().anchors;
        const candidate = transfer.find((profile) => profile.id === anchor.profileId);
        if (!candidate
          || canonicalJson(freshProfiles) !== canonicalJson(previousProfiles)
          || classifyProfileImportWithIdentityAnchor(freshProfiles, candidate, freshAnchors).kind !== "new-unanchored") {
          throw new Error("De importstatus veranderde vóór de identity anchor kon worden opgeslagen.");
        }
        const persisted = await persistProfileIdentityAnchor(anchor);
        if (persisted) newlyPersistedAnchors.push(anchor);
        importOperationGuard.assertCurrent(operationToken);
        if (!persisted) {
          throw new Error("De onafhankelijke identiteitsbevestiging kon niet veilig worden opgeslagen.");
        }
      }

      importOperationGuard.assertCurrent(operationToken);
      const finalProfiles = useStore.getState().profiles;
      const finalAnchors = readProfileIdentityAnchorRegistry().anchors;
      const createdAnchorById = new Map(
        newlyPersistedAnchors.map((anchor) => [anchor.profileId, anchor]),
      );
      const anchorsBeforeThisOperation = finalAnchors.filter(
        (anchor) => !createdAnchorById.has(anchor.profileId),
      );
      if (canonicalJson(finalProfiles) !== canonicalJson(previousProfiles)) {
        throw new Error("De profielopslag veranderde tijdens de import. Import is geblokkeerd.");
      }
      for (const candidate of transfer) {
        const refreshed = classifyProfileImportWithIdentityAnchor(
          finalProfiles,
          candidate,
          anchorsBeforeThisOperation,
        );
        const createdAnchor = createdAnchorById.get(candidate.id);
        if (createdAnchor) {
          const persisted = finalAnchors.find((anchor) => anchor.profileId === candidate.id);
          if (refreshed.kind !== "new-unanchored"
            || !persisted
            || canonicalJson(persisted) !== canonicalJson(createdAnchor)) {
            throw new Error("De identity anchor veranderde tijdens de import. Import is geblokkeerd.");
          }
        } else if (refreshed.kind !== "anchored-update" && refreshed.kind !== "anchored-existing" && refreshed.kind !== "anchored-restore") {
          throw new Error("De identity anchor veranderde tijdens de import. Import is geblokkeerd.");
        }
      }

      importOperationGuard.assertCurrent(operationToken);
      if (!commitProfileImportPlan(useStore, importPlan)) {
        throw new Error("Het profiel kon niet exact volgens het vooraf gecontroleerde importplan worden opgeslagen.");
      }
      completeProfileImport(operationToken);
    } catch (error) {
      let anchorsRolledBack = true;
      for (const anchor of [...newlyPersistedAnchors].reverse()) {
        if (!await removePersistedProfileIdentityAnchorIfMatches(anchor)) anchorsRolledBack = false;
      }
      if (!(error instanceof ImportOperationCancelledError)) {
        const message = error instanceof Error ? error.message : "Identiteitsbevestiging is mislukt.";
        setIdentityConfirmError(anchorsRolledBack
          ? message
          : `${message} Een gelijktijdig gewijzigde identity anchor is niet verwijderd.`);
      }
    } finally {
      if (importOperationGuard.isCurrent(operationToken)) setIdentityConfirming(false);
    }
  }

  if (!hydrated) return <PageShell loading width="2xl" />;

  if (!onboardingComplete) {
    if (!firstRunRestore) return <Onboarding onComplete={completeOnboarding} onRestore={() => setFirstRunRestore(true)} />;
    return (
      <>
        <FirstRunBackupRestore
          onImportFile={handleImportFile}
          busy={importReading}
          obscured={importPwOpen}
          error={importError}
          success={importSuccess}
          onComplete={completeOnboarding}
          onBack={() => {
            importOperation.current?.abort();
            importOperation.current = null;
            setImportReading(false);
            setImportError(null);
            setImportSuccess(null);
            setFirstRunRestore(false);
          }}
        />
        {encryptedImportSheet}
      </>
    );
  }

  const deleteTargetProfile = profiles.find((profile) => profile.id === deleteTarget);
  const emptyHome = profiles.length === 0;

  return (
    <>
      <PageShell
        width="2xl"
        flush={emptyHome}
        className={emptyHome
          ? "lg:max-w-4xl [--page-bottom-clearance:0px] pb-2 flex min-h-[calc(100svh_-_env(safe-area-inset-top)_-_6.5rem)] flex-col justify-center"
          : "lg:max-w-4xl"}
      >
        {profiles.length > 0 && <ProfileList onPromptDelete={promptDelete} />}

        {profiles.length > 0 ? (
          <div
            data-home-profile-actions
            className="mb-5 flex flex-col"
            style={{
              borderBottom: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
            }}
          >
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="ks-motion-choice focus-ring flex min-h-12 w-full items-center gap-3 px-1 text-left"
            >
              <UserPlus size={18} weight="bold" aria-hidden="true" style={{ color: "var(--action-primary)" }} />
              <span className="flex-1 text-sm font-semibold">Nieuw profiel</span>
              <ArrowRight size={15} aria-hidden="true" style={{ color: "var(--text2)" }} />
            </button>

            {!importPreview && (
              <button
                type="button"
                onClick={() => {
                  setScanError(null);
                  setScanOpen(true);
                }}
                className="ks-motion-choice focus-ring flex min-h-12 w-full items-center gap-3 px-1 text-left"
                style={{ borderTop: "1px solid color-mix(in srgb, var(--border) 58%, transparent)" }}
              >
                <Camera size={18} aria-hidden="true" style={{ color: "var(--identity-a)" }} />
                <span className="flex-1 text-sm font-medium">Scan gedeeld profiel</span>
                <ArrowRight size={15} aria-hidden="true" style={{ color: "var(--text2)" }} />
              </button>
            )}
          </div>
        ) : (
          <section
            data-home-empty-card
            className="mx-auto w-full max-w-xl [overflow-wrap:anywhere] rounded-[28px] px-[16px] pb-6 pt-4 max-[321px]:pb-4 max-[321px]:pt-3 sm:px-[20px] sm:pb-7 sm:pt-5"
            style={{
              background: "linear-gradient(145deg, color-mix(in srgb, var(--identity-a) 8%, var(--surface2)), color-mix(in srgb, var(--identity-b) 6%, var(--surface)))",
              border: "1px solid color-mix(in srgb, var(--border-accent) 62%, var(--identity-border))",
              boxShadow: "0 18px 44px color-mix(in srgb, var(--identity-a) 7%, transparent)",
            }}
          >
            <div className="px-2 pb-6 pt-1 max-[321px]:pb-5 text-center">
              <span
                className="mx-auto flex h-9 w-9 items-center justify-center rounded-full"
                style={{
                  background: "color-mix(in srgb, var(--accent) 11%, var(--surface2))",
                  border: "1px solid var(--border-accent)",
                  color: "var(--accent)",
                }}
              >
                <Sparkle size={17} weight="duotone" aria-hidden="true" />
              </span>
              <h2
                className="mt-3 text-[1.9rem] leading-[1.08] sm:text-[2.05rem]"
                style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600 }}
              >
                Maak je eerste profiel
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                Begin met wat nieuwsgierig maakt.<br />
                De rest mag later komen.
              </p>
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="ks-motion-choice focus-ring flex min-h-[72px] w-full items-center gap-[12px] rounded-2xl px-[14px] py-3 text-left hover:opacity-95"
                style={{
                  background: "color-mix(in srgb, var(--accent) 13%, var(--surface2))",
                  border: "1px solid color-mix(in srgb, var(--accent) 34%, var(--border))",
                }}
              >
                <span
                  className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full"
                  style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                >
                  <UserPlus size={20} weight="duotone" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Maak mijn profiel</span>
                  <span className="mt-0.5 block text-xs leading-5" style={{ color: "var(--text2)" }}>
                    Kies wat bij jou past
                  </span>
                </span>
                <ArrowRight size={17} weight="bold" aria-hidden="true" className="flex-none" style={{ color: "var(--accent)" }} />
              </button>

              {!importPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setScanError(null);
                    setScanOpen(true);
                  }}
                  className="ks-motion-choice focus-ring flex min-h-[68px] w-full items-center gap-[12px] px-[14px] py-3 text-left hover:opacity-90 active:opacity-75"
                >
                  <span
                    className="flex h-[40px] w-[40px] flex-none items-center justify-center rounded-full"
                    style={{ color: "var(--text2)" }}
                  >
                    <Camera size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Scan gedeeld profiel</span>
                    <span className="mt-0.5 block text-xs leading-5" style={{ color: "var(--text2)" }}>
                      Bekijk wat iemand met je heeft gedeeld
                    </span>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" className="flex-none" style={{ color: "var(--text2)" }} />
                </button>
              )}

              <div data-home-backup className="text-center" style={{ color: "var(--text2)" }}>
                <p className="text-xs leading-4">Heb je al een back-up?</p>
                <button
                  type="button"
                  onClick={() => backupInputRef.current?.click()}
                  disabled={importReading}
                  className="ks-motion-choice focus-ring inline-flex min-h-[44px] items-center justify-center gap-2 px-2 text-sm font-medium underline underline-offset-4 hover:opacity-90 disabled:opacity-60"
                >
                  <UploadSimple size={17} aria-hidden="true" className="flex-none" />
                  Importeer back-up
                </button>
                <p role={importReading ? "status" : undefined} aria-live="polite" className={importReading ? "text-xs leading-5" : "sr-only"}>
                  {importReading ? "Back-up lezen…" : ""}
                </p>
              </div>
              <input
                ref={backupInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                disabled={importReading}
                aria-label="Kies een backupbestand"
                tabIndex={-1}
                className="sr-only"
              />
              {importError && (
                <p className="px-1 text-xs leading-relaxed" role="alert" style={{ color: "var(--hard-no)" }}>
                  {importError}
                </p>
              )}
              {importSuccess && (
                <p className="px-1 text-xs leading-relaxed" role="status" style={{ color: "var(--willing)" }}>
                  {importSuccess}
                </p>
              )}
            </div>
            <HomeHelpLinks />
          </section>
        )}
        {!emptyHome && <HomeHelpLinks />}
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
        importReading={importReading}
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

      {encryptedImportSheet}

      <Sheet
        open={deleteSheetOpen}
        onClose={closeDeleteSheet}
        title="Profiel verwijderen?"
        aria-label="Profiel verwijderen"
      >
        {deleteTargetProfile && (
          <p className="text-center text-sm mb-6" style={{ color: "var(--text2)" }}>
            <span style={{ color: "var(--text)" }}>{deleteTargetProfile.name}</span>{" "}
            {deleteTargetProfile.origin === "shared" || deleteTargetProfile.isImported
              ? "wordt van dit toestel verwijderd. Bestaande contracten en scènes blijven bestaan. Dit kan niet ongedaan worden gemaakt."
              : "wordt permanent gewist. Dit kan niet ongedaan worden gemaakt."}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={confirmDelete}
            className="ks-motion-choice focus-ring w-full py-3 rounded-xl text-sm font-bold hover:opacity-90"
            style={{ background: "color-mix(in srgb, var(--hard-no) 25%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--hard-no)" }}
          >
            Verwijder voor altijd
          </button>
          <button
            type="button"
            onClick={closeDeleteSheet}
            className="ks-motion-choice focus-ring w-full py-3 rounded-xl text-sm font-medium border"
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
            const decodeToken = importOperationGuard.begin();
            try {
              const decoded = await decodeSharedProfileTransfer(payload);
              const accepted = importOperationGuard.applyIfCurrent(decodeToken, () => {
                replaceImportTransfer(decoded.profiles);
                setScanError(null);
              });
              if (accepted) setScanOpen(false);
            } catch {
              importOperationGuard.applyIfCurrent(decodeToken, () => {
                setScanError("Profielcode is ongeldig of beschadigd.");
                setScanOpen(false);
              });
            }
          }}
          onClose={() => {
            importOperationGuard.invalidate();
            setScanOpen(false);
          }}
        />
      )}

      {scanError && (
        <div
          role="alert"
          className="fixed top-[calc(var(--nav-h)+12px)] left-4 right-4 z-[300] mx-auto max-w-md rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg ks-fade-in"
          style={{ background: "var(--surface)", border: "1px solid var(--hard-no)", color: "var(--hard-no)" }}
        >
          <div className="min-w-0 flex-1 text-sm">
            <p>{scanError}</p>
            <p className="mt-1" style={{ color: "var(--text2)" }}>Vraag een nieuwe code aan de persoon die het profiel deelt.</p>
            <button
              type="button"
              onClick={() => { setScanError(null); setScanOpen(true); }}
              className="ks-motion-choice focus-ring mt-1 min-h-[44px] py-2 font-semibold underline underline-offset-4"
            >
              Opnieuw scannen
            </button>
          </div>
          <button
            type="button"
            onClick={() => setScanError(null)}
            aria-label="Sluit foutmelding"
            className="ks-motion-choice focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-lg"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <Sheet
        open={!!importPreview}
        onClose={() => replaceImportTransfer(null)}
        title={needsIdentityConfirmation ? "Identiteit onafhankelijk vergelijken" : hasAnchoredRestore ? "Gedeeld profiel herstellen?" : isSwitchImport ? "Switch-profiel importeren?" : "Profiel importeren?"}
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
                  {experienceLevelLabel(importPreview.experienceLevel)}
                </span>
              </div>
              <div className="text-xs mt-0.5 tabular-nums" style={{ color: "var(--text2)" }}>
                {(importTransfer ?? [importPreview]).reduce((total, candidate) => total + Object.values(candidate.entries).filter((entry) => entry.status).length, 0)} kinks beoordeeld{isSwitchImport ? " · 2 perspectieven" : ""}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text2)" }}>
                {isSwitchImport
                  ? allAnchoredImports
                    ? "Switch-koppeling cryptografisch geldig · bewaarde identiteit herkend"
                    : "Switch-koppeling cryptografisch geldig · identiteit nog niet bevestigd"
                  : `${importPreview.consentProof ? "Digitale handtekening aanwezig" : "Niet ondertekend"} · ${profileConsentAlias(importPreview)}`}
              </div>
            </div>
          </div>
        )}

        {hasIdentityConflict && importIdentity?.kind === "identity-conflict" && (
          <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--hard-no) 10%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--text2)" }}>
            <strong style={{ color: "var(--hard-no)" }}>Identiteitsconflict. Import geblokkeerd.</strong> Deze profielbron wijkt af van het lokaal verankerde contact ({importIdentity.reason}). Je kunt deze sleutel hier niet alsnog vertrouwen of importeren.
          </div>
        )}

        {hasAnchoredRestore && !hasIdentityConflict && (
          <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--yes) 10%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--yes) 35%, var(--border))", color: "var(--text2)" }}>
            <strong style={{ color: "var(--text)" }}>Gedeeld profiel herstellen.</strong> Deze versie past bij de bewaarde identiteit. Je herstelt de ontvangen inhoud. De identiteit bewijst niet hoe recent deze versie is. Controleer de inhoud opnieuw met deze persoon.
          </div>
        )}

        {allAnchoredImports && !hasAnchoredRestore && (importIdentity?.kind === "anchored-update" || importIdentity?.kind === "anchored-existing") && (
          <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--yes) 10%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--yes) 35%, var(--border))", color: "var(--text2)" }}>
            <strong style={{ color: "var(--yes)" }}>Verankerde identiteit herkend.</strong> Deze profielversie past bij dezelfde onafhankelijk bevestigde sleutel.
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
                  onClick={() => changeIdentityConfirmMethod("source-device-fingerprint")}
                  className="focus-ring min-h-11 rounded-xl border px-3 py-2 text-left text-sm"
                  style={{ borderColor: identityConfirmMethod === "source-device-fingerprint" ? "var(--accent)" : "var(--border)", background: "var(--surface2)" }}
                >
                  Rechtstreeks op hun toestel
                </button>
                <button
                  type="button"
                  aria-pressed={identityConfirmMethod === "independent-channel-fingerprint"}
                  onClick={() => changeIdentityConfirmMethod("independent-channel-fingerprint")}
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
                  replaceImportTransfer(null);
                  router.push(`/profile/${importIdentity.profile!.id}`);
                }}
                className="ks-motion-choice focus-ring w-full py-3 rounded-xl text-sm font-semibold hover:opacity-90"
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
              className="ks-motion-choice focus-ring w-full py-3 rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              {identityConfirming ? "Bevestiging opslaan…" : "Codes onafhankelijk vergeleken. Bevestig en importeer"}
            </button>
          ) : hasLegacyUnverified ? (
            <button
              type="button"
              onClick={() => {
                if (!finishProfileImport()) setIdentityConfirmError("Het legacy-profiel kon niet veilig worden geïmporteerd.");
              }}
              className="ks-motion-choice focus-ring w-full py-3 rounded-xl text-sm font-semibold hover:opacity-90"
              style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}
            >
              Importeer als legacy-onbevestigd
            </button>
          ) : allAnchoredImports ? (
            <button
              type="button"
              onClick={() => {
                if (!finishProfileImport()) setIdentityConfirmError(hasAnchoredRestore
                  ? "Het gedeelde profiel kon niet veilig worden hersteld."
                  : "De verankerde update kon niet veilig worden geïmporteerd.");
              }}
              className="ks-motion-choice focus-ring w-full py-3 rounded-xl text-sm font-semibold hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              {hasAnchoredRestore ? "Herstel gedeeld profiel" : "Verankerde update importeren"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              replaceImportTransfer(null);
              router.replace("/");
            }}
            className="ks-motion-choice focus-ring w-full py-3 rounded-xl text-sm font-medium border"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}
          >
            Niet nu
          </button>
        </div>
      </Sheet>
    </>
  );
}

function HomeHelpLinks() {
  return (
    <nav aria-label="Hulp bij KinkSync" className="mt-2 flex flex-wrap justify-center gap-x-[16px]" style={{ color: "var(--text2)" }}>
      <Link href="/about" className="ks-motion-choice focus-ring inline-flex min-h-[44px] items-center text-xs underline underline-offset-4 hover:opacity-90">Over KinkSync</Link>
      <Link href="/security" className="ks-motion-choice focus-ring inline-flex min-h-[44px] items-center text-xs underline underline-offset-4 hover:opacity-90">Privacy &amp; veiligheid</Link>
    </nav>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
