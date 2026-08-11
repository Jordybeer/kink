"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CaretRight,
  Database,
  DeviceMobile,
  DownloadSimple,
  Fingerprint,
  Key,
  LockKey,
  ShieldCheck,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import Sheet from "@/components/ui/Sheet";
import PwaInstallGuide from "@/components/PwaInstallGuide";
import { useStore } from "@/lib/store";
import { registerBiometric, isPlatformAuthenticatorAvailable } from "@/lib/webauthn";
import { detectIosInstallBrowser, getInstallPrompt } from "@/lib/installPrompt";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenPinFlow: (step?: number) => void;
  onOpenDestroy: () => void;
  onExportBackup: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importError: string | null;
  importSuccess: string | null;
}

export default function SettingsSheet({
  open,
  onClose,
  onOpenPinFlow,
  onOpenDestroy,
  onExportBackup,
  onImportFile,
  importError,
  importSuccess,
}: SettingsSheetProps) {
  const { appLockEnabled, biometricEnabled, disableBiometric, enableBiometric } = useStore();
  const [platformBioAvailable, setPlatformBioAvailable] = useState(false);
  const [bioRegistering, setBioRegistering] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const installTimerRef = useRef<number | null>(null);

  useEffect(() => {
    isPlatformAuthenticatorAvailable()
      .then(setPlatformBioAvailable)
      .catch(() => setPlatformBioAvailable(false));
  }, []);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const ios = detectIosInstallBrowser(
      navigator.userAgent,
      navigator.platform,
      navigator.maxTouchPoints,
    ) !== null;
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || navigatorWithStandalone.standalone === true;

    setIsIos(ios);

    const refreshInstallAvailability = () => {
      setInstallAvailable(!standalone && (ios || getInstallPrompt() !== null));
    };

    refreshInstallAvailability();
    window.addEventListener("beforeinstallprompt", refreshInstallAvailability);
    window.addEventListener("appinstalled", refreshInstallAvailability);
    return () => {
      window.removeEventListener("beforeinstallprompt", refreshInstallAvailability);
      window.removeEventListener("appinstalled", refreshInstallAvailability);
    };
  }, []);

  useEffect(() => () => {
    if (installTimerRef.current !== null) window.clearTimeout(installTimerRef.current);
  }, []);

  async function handleEnableBiometric() {
    setBioRegistering(true);
    setBioError(null);
    try {
      const credId = await registerBiometric();
      enableBiometric(credId);
    } catch (error) {
      setBioError(error instanceof Error ? error.message : "Biometrische registratie mislukt");
    } finally {
      setBioRegistering(false);
    }
  }

  function handleOpenInstallGuide() {
    onClose();
    if (installTimerRef.current !== null) window.clearTimeout(installTimerRef.current);
    installTimerRef.current = window.setTimeout(() => {
      setInstallGuideOpen(true);
      installTimerRef.current = null;
    }, 280);
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Instellingen" aria-label="Instellingen">
        <div className="grid gap-3">
          <section
            className="rounded-2xl p-3.5"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-none"
                style={{ background: "var(--surface3)", color: "var(--accent)" }}
              >
                <Database size={20} weight="duotone" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">Back-up &amp; herstel</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                  Bewaar of herstel je lokale gegevens.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onExportBackup}
                className="focus-ring min-h-11 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <DownloadSimple size={16} aria-hidden="true" />
                Back-up
              </button>
              <label
                className="relative min-h-11 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)]"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <UploadSimple size={16} aria-hidden="true" />
                Herstel
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportFile}
                  className="sr-only"
                />
              </label>
            </div>
            {importError && (
              <p className="text-xs mt-2" role="alert" style={{ color: "var(--hard-no)" }}>{importError}</p>
            )}
            {importSuccess && (
              <p className="text-xs mt-2" role="status" style={{ color: "var(--willing)" }}>{importSuccess}</p>
            )}
          </section>

          <section
            className="rounded-2xl p-3.5"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-none"
                style={{ background: "var(--surface3)", color: "var(--accent)" }}
              >
                <LockKey size={20} weight="duotone" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">Appvergrendeling</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                  {appLockEnabled ? "PIN-vergrendeling actief" : "Nog geen vergrendeling ingesteld"}
                </p>
              </div>
            </div>

            {!appLockEnabled ? (
              <button
                type="button"
                onClick={() => onOpenPinFlow(0)}
                className="focus-ring w-full min-h-11 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                <Key size={16} aria-hidden="true" />
                PIN instellen
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onOpenPinFlow(0)}
                  className="focus-ring min-h-11 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  <Key size={15} aria-hidden="true" />
                  PIN wijzigen
                </button>

                {platformBioAvailable ? (
                  biometricEnabled ? (
                    <button
                      type="button"
                      onClick={() => disableBiometric()}
                      className="focus-ring min-h-11 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}
                    >
                      <Fingerprint size={16} aria-hidden="true" />
                      Biometrie uit
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEnableBiometric}
                      disabled={bioRegistering}
                      className="focus-ring min-h-11 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: "var(--surface)", border: "1px solid var(--border-accent)", color: "var(--accent)" }}
                    >
                      <Fingerprint size={16} aria-hidden="true" />
                      {bioRegistering ? "Bezig…" : "Biometrie aan"}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenPinFlow(2)}
                    className="focus-ring min-h-11 rounded-xl text-xs font-semibold"
                    style={{ background: "var(--surface)", border: "1px solid var(--hard-no)", color: "var(--hard-no)" }}
                  >
                    PIN verwijderen
                  </button>
                )}

                {platformBioAvailable && (
                  <button
                    type="button"
                    onClick={() => onOpenPinFlow(2)}
                    className="focus-ring col-span-2 min-h-10 rounded-xl text-xs font-semibold"
                    style={{ color: "var(--hard-no)", border: "1px solid color-mix(in srgb, var(--hard-no) 45%, var(--border))" }}
                  >
                    PIN-vergrendeling verwijderen
                  </button>
                )}
              </div>
            )}
            {bioError && <p className="text-xs mt-2" role="alert" style={{ color: "var(--hard-no)" }}>{bioError}</p>}
          </section>

          {installAvailable && (
            <button
              type="button"
              onClick={handleOpenInstallGuide}
              className="focus-ring min-h-12 rounded-2xl px-3.5 flex items-center gap-3 text-left"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            >
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-none"
                style={{ background: "var(--surface3)", color: "var(--accent)" }}
              >
                <DeviceMobile size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">App installeren</span>
                <span className="block text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                  Open de installatiestappen wanneer jij wilt
                </span>
              </span>
              <CaretRight size={14} aria-hidden="true" style={{ color: "var(--text2)" }} />
            </button>
          )}

          <Link
            href="/about"
            onClick={onClose}
            className="focus-ring min-h-12 rounded-2xl px-3.5 flex items-center gap-3 text-left"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-none"
              style={{ background: "var(--surface3)", color: "var(--accent)" }}
            >
              <ShieldCheck size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Hoe KinkSync werkt</span>
              <span className="block text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                Privacy, verificatie en lokale opslag
              </span>
            </span>
            <CaretRight size={14} aria-hidden="true" style={{ color: "var(--text2)" }} />
          </Link>

          <button
            type="button"
            onClick={() => { onClose(); onOpenDestroy(); }}
            className="focus-ring min-h-12 rounded-2xl px-3.5 flex items-center gap-3 text-left"
            style={{ background: "color-mix(in srgb, var(--hard-no) 5%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--hard-no) 45%, var(--border))" }}
          >
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-none"
              style={{ background: "color-mix(in srgb, var(--hard-no) 12%, transparent)", color: "var(--hard-no)" }}
            >
              <Trash size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold" style={{ color: "var(--hard-no)" }}>Alle data verwijderen</span>
              <span className="block text-xs mt-0.5" style={{ color: "var(--text2)" }}>Permanent en onomkeerbaar</span>
            </span>
          </button>
        </div>

        <div className="pt-3">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring w-full min-h-12 rounded-xl text-sm font-semibold"
            style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
          >
            Sluit
          </button>
        </div>
      </Sheet>

      {installGuideOpen && (
        <PwaInstallGuide
          isIos={isIos}
          manual
          onDismiss={() => setInstallGuideOpen(false)}
        />
      )}
    </>
  );
}
