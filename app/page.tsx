"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Camera, Sparkle, UserPlus, X } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import type { Profile } from "@/types";
import type { EncryptedBackup } from "@/lib/crypto";
import { useStore, useHasHydrated } from "@/lib/store";
import { decodeSharedProfileTransfer } from "@/lib/profileSwitchShare";
import { parseSharePaste } from "@/lib/parseSharePaste";
import { classifyProfileImport, getProfileVerificationCode } from "@/lib/profileVerification";
import { profileConsentAlias } from "@/lib/consentProof";
import Onboarding from "@/components/Onboarding";
import PageShell from "@/components/PageShell";
import ProfileList from "@/components/ProfileList";
import ProfileCreateSheet from "@/components/ProfileCreateSheet";
import SettingsSheet from "@/components/sheets/SettingsSheet";
import PinFlowSheet from "@/components/sheets/PinFlowSheet";
import DestroyAllSheet from "@/components/sheets/DestroyAllSheet";
import { EncryptedExportSheet, EncryptedImportSheet } from "@/components/sheets/EncryptedBackupSheets";
import { backupFileSizeAllowed } from "@/lib/importLimits";
import Sheet from "@/components/Sheet";

const QRScanner = dynamic(() => import("@/components/QRScanner"), { ssr: false });

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

  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [importTransfer, setImportTransfer] = useState<Profile[] | null>(null);
  const [importDone, setImportDone] = useState(false);
  const importPreview = importTransfer?.[0] ?? null;
  const importIdentities = importTransfer?.map((candidate) => classifyProfileImport(profiles, candidate)) ?? [];
  const importIdentity = (() => {
    const sourceConflict = importIdentities.find((identity) => identity.kind === "source-conflict");
    if (sourceConflict) return sourceConflict;
    if (importIdentities.length > 0 && importIdentities.every((identity) => identity.kind === "same-code")) {
      return importIdentities[0];
    }
    return importIdentities.find((identity) => identity.kind === "signed-update")
      ?? importIdentities.find((identity) => identity.kind === "same-name-role")
      ?? importIdentities.find((identity) => identity.kind === "new")
      ?? null;
  })();
  const isSwitchImport = importTransfer?.length === 2
    && !!importTransfer[0].switchShareProof
    && !!importTransfer[0].personGroupId
    && importTransfer.every((candidate) =>
      candidate.personGroupId === importTransfer[0].personGroupId);

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

  if (!hydrated) return <PageShell loading width="2xl" />;

  if (!onboardingComplete) return <Onboarding onComplete={completeOnboarding} />;

  const deleteTargetProfile = profiles.find((profile) => profile.id === deleteTarget);

  return (
    <>
      <PageShell width="2xl" className="lg:max-w-4xl">
        {profiles.length > 0 && <ProfileList onPromptDelete={promptDelete} />}

        {profiles.length > 0 ? (
          <div className={`grid ${importPreview ? "grid-cols-1" : "grid-cols-2"} gap-2 mt-5 mb-5`}>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="focus-ring min-h-[76px] rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left transition-colors"
              style={{
                background: "color-mix(in srgb, var(--action-primary) 7%, var(--surface2))",
                border: "1px solid var(--border-accent)",
              }}
            >
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center flex-none"
                style={{ background: "var(--action-primary)", color: "var(--on-accent)" }}
              >
                <UserPlus size={19} weight="bold" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block whitespace-nowrap text-sm font-semibold">Nieuw profiel</span>
                <span className="block text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                  Perspectief en startlijst
                </span>
              </span>
            </button>

            {!importPreview && (
              <button
                type="button"
                onClick={() => {
                  setScanError(null);
                  setScanOpen(true);
                }}
                className="focus-ring min-h-[76px] rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left transition-colors"
                style={{
                  background: "color-mix(in srgb, var(--identity-a) 5%, var(--surface2))",
                  border: "1px solid var(--identity-border)",
                }}
              >
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-none"
                  style={{
                    background: "color-mix(in srgb, var(--identity-a) 11%, var(--surface3))",
                    color: "var(--identity-a)",
                  }}
                >
                  <Camera size={19} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block whitespace-nowrap text-sm font-semibold">Scan profiel</span>
                  <span className="block text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                    Voeg je partner toe
                  </span>
                </span>
              </button>
            )}
          </div>
        ) : (
          <section
            className="mx-auto max-w-xl overflow-hidden rounded-[28px] px-4 pb-6 pt-4 sm:px-5 sm:pb-7 sm:pt-5"
            style={{
              background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 7%, var(--surface2)), color-mix(in srgb, var(--accent) 2%, var(--surface)))",
              border: "1px solid color-mix(in srgb, var(--border-accent) 72%, var(--border))",
              boxShadow: "0 18px 44px color-mix(in srgb, var(--accent) 7%, transparent)",
            }}
          >
            <div className="px-2 pb-8 pt-1 text-center">
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

            <div className="grid gap-3.5">
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="focus-ring flex min-h-[72px] w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-opacity hover:opacity-95"
                style={{
                  background: "color-mix(in srgb, var(--accent) 13%, var(--surface2))",
                  border: "1px solid color-mix(in srgb, var(--accent) 34%, var(--border))",
                }}
              >
                <span
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-full"
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
                  className="focus-ring flex min-h-[68px] w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left"
                  style={{
                    background: "color-mix(in srgb, var(--surface2) 82%, transparent)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-full"
                    style={{ background: "var(--surface3)", color: "var(--text2)" }}
                  >
                    <Camera size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Scan partnerprofiel</span>
                    <span className="mt-0.5 block text-xs leading-5" style={{ color: "var(--text2)" }}>
                      Bekijk wat je partner heeft gedeeld
                    </span>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" className="flex-none" style={{ color: "var(--text2)" }} />
                </button>
              )}
            </div>
          </section>
        )}
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
            className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-lg"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <Sheet
        open={!!importPreview}
        onClose={() => setImportTransfer(null)}
        title={isSwitchImport ? "Switch-profiel importeren?" : "Profiel importeren?"}
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
              <div className="text-xs mt-1" style={{ color: importPreview.consentProof ? "var(--yes)" : "var(--text2)" }}>
                {isSwitchImport ? "Switch-koppeling bevestigd" : `${importPreview.consentProof ? "Bron bevestigd" : "Niet ondertekend"} · ${profileConsentAlias(importPreview)}`}
              </div>
            </div>
          </div>
        )}

        {importIdentity?.kind === "same-code" && (
          <div className="rounded-xl px-3 py-2.5 mb-4 text-xs" style={{ background: "color-mix(in srgb, var(--accent) 10%, var(--surface2))", border: "1px solid var(--border-accent)", color: "var(--text2)" }}>
            Dezelfde profielcode staat al bij <strong style={{ color: "var(--text)" }}>{importIdentity.profile.name}</strong>. Dit is hetzelfde profiel, niet een nieuwe kopie.
          </div>
        )}
        {importIdentity?.kind === "signed-update" && (
          <div className="rounded-xl px-3 py-2.5 mb-4 text-xs" style={{ background: "color-mix(in srgb, var(--yes) 10%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--yes) 35%, var(--border))", color: "var(--text2)" }}>
            Geldige vervolgversie van <strong style={{ color: "var(--text)" }}>{importIdentity.profile.name}</strong>. De eerdere bevestigde versie blijft in bestaande sessies staan.
          </div>
        )}
        {importIdentity?.kind === "source-conflict" && (
          <div className="rounded-xl px-3 py-2.5 mb-4 text-xs" style={{ background: "color-mix(in srgb, var(--hard-no) 10%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--text2)" }}>
            Deze profielcode gebruikt een andere eigendomssleutel dan de eerder gekoppelde bron. De import is geblokkeerd.
          </div>
        )}
        {importIdentity?.kind === "same-name-role" && (
          <div className="rounded-xl px-3 py-2.5 mb-4 text-xs" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
            Zelfde naam en rol, maar een andere profielcode. Importeer dit alleen wanneer het bewust een apart profiel is.
          </div>
        )}

        <div className="flex flex-col gap-3">
          {importDone ? (
            <p className="text-sm text-center py-2 font-semibold" style={{ color: "var(--accent)" }}>
              {isSwitchImport ? "Switch-profiel geïmporteerd" : "Profiel geïmporteerd"}
            </p>
          ) : importIdentity?.kind === "same-code" || importIdentity?.kind === "source-conflict" ? (
            <button
              type="button"
              onClick={() => {
                setImportTransfer(null);
                router.push(`/profile/${importIdentity.profile.id}`);
              }}
              className="focus-ring w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
            >
              Open bestaand profiel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!importTransfer?.length) return;
                importProfiles(importTransfer.map((candidate) => ({
                  ...candidate,
                  verificationCode: getProfileVerificationCode(candidate),
                  isImported: true,
                  origin: "shared" as const,
                  lockedAt: Date.now(),
                })));
                setImportDone(true);
                router.replace("/");
                window.setTimeout(() => {
                  setImportTransfer(null);
                  setImportDone(false);
                }, 1500);
              }}
              className="focus-ring w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              {isSwitchImport
                ? importIdentity?.kind === "signed-update"
                  ? "Bevestigde Switch-update importeren"
                  : "Importeer Switch-profiel"
                : importIdentity?.kind === "signed-update"
                  ? "Bevestigde update importeren"
                  : importIdentity?.kind === "same-name-role"
                    ? "Importeer als apart profiel"
                    : "Importeer profiel"}
            </button>
          )}
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
