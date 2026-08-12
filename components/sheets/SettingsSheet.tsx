"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BellSimple,
  CaretRight,
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
import Switch from "@/components/ui/Switch";
import PwaInstallGuide from "@/components/PwaInstallGuide";
import { useStore } from "@/lib/store";
import { useInstallPromptPolicyStore } from "@/lib/installPromptPolicyStore";
import { registerBiometric, isPlatformAuthenticatorAvailable } from "@/lib/webauthn";
import {
  clearInstallPrompt,
  detectIosInstallBrowser,
  getInstallPrompt,
  INSTALL_PROMPT_CHANGE_EVENT,
} from "@/lib/installPrompt";

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

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3
      className="mb-2 px-1 font-serif text-sm italic"
      style={{ color: "var(--text2)" }}
    >
      {children}
    </h3>
  );
}

function SettingsGroup({ children }: { children: ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
    >
      {children}
    </div>
  );
}

function RowContent({
  icon,
  title,
  description,
  trailing,
  danger = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  trailing?: ReactNode;
  danger?: boolean;
}) {
  return (
    <>
      <span
        className="flex w-7 flex-none items-center justify-center"
        style={{ color: danger ? "var(--hard-no)" : "var(--text2)" }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block text-sm font-semibold"
          style={{ color: danger ? "var(--hard-no)" : "var(--text)" }}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-5" style={{ color: "var(--text2)" }}>
          {description}
        </span>
      </span>
      {trailing && <span className="flex-none">{trailing}</span>}
    </>
  );
}

const DIVIDER_STYLE = { borderTop: "1px solid var(--border)" } as const;

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
  const appLockEnabled = useStore((state) => state.appLockEnabled);
  const biometricEnabled = useStore((state) => state.biometricEnabled);
  const disableBiometric = useStore((state) => state.disableBiometric);
  const enableBiometric = useStore((state) => state.enableBiometric);
  const installPromptDismissed = useStore((state) => state.installPromptDismissed);
  const dismissInstallPrompt = useStore((state) => state.dismissInstallPrompt);

  const promptDismissals = useInstallPromptPolicyStore((state) => state.dismissals);
  const promptNeverAsk = useInstallPromptPolicyStore((state) => state.neverAsk);
  const enableAutomaticPrompt = useInstallPromptPolicyStore((state) => state.enableAutomaticPrompt);
  const disableAutomaticPrompt = useInstallPromptPolicyStore((state) => state.disableAutomaticPrompt);

  const [platformBioAvailable, setPlatformBioAvailable] = useState(false);
  const [bioRegistering, setBioRegistering] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const installTimerRef = useRef<number | null>(null);

  const automaticInstallPromptsEnabled = !promptNeverAsk && promptDismissals < 2;

  useEffect(() => {
    if (installPromptDismissed && automaticInstallPromptsEnabled) {
      // `installPromptDismissed` predates the dedicated prompt policy. Existing
      // dev data may still carry that flag even though the new policy allows
      // prompts, so keep the legacy parent gate in sync until it is retired.
      useStore.setState({ installPromptDismissed: false });
    }
  }, [automaticInstallPromptsEnabled, installPromptDismissed]);

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
    const handleAppInstalled = () => {
      clearInstallPrompt();
      setInstallAvailable(false);
    };

    refreshInstallAvailability();
    window.addEventListener("beforeinstallprompt", refreshInstallAvailability);
    window.addEventListener(INSTALL_PROMPT_CHANGE_EVENT, refreshInstallAvailability);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", refreshInstallAvailability);
      window.removeEventListener(INSTALL_PROMPT_CHANGE_EVENT, refreshInstallAvailability);
      window.removeEventListener("appinstalled", handleAppInstalled);
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

  function handleAutomaticPromptChange(enabled: boolean) {
    if (enabled) {
      enableAutomaticPrompt();
      useStore.setState({ installPromptDismissed: false });
      return;
    }
    disableAutomaticPrompt();
    dismissInstallPrompt();
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Instellingen" scrollable aria-label="Instellingen">
        <div className="grid gap-6 pb-1">
          <section>
            <SectionTitle>Gegevens</SectionTitle>
            <SettingsGroup>
              <button
                type="button"
                onClick={onExportBackup}
                className="focus-ring flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
              >
                <RowContent
                  icon={<DownloadSimple size={19} aria-hidden="true" />}
                  title="Back-up maken"
                  description="Bewaar een kopie van je lokale gegevens"
                  trailing={<CaretRight size={15} aria-hidden="true" style={{ color: "var(--text2)" }} />}
                />
              </button>

              <label
                className="focus-within:outline focus-within:outline-2 focus-within:outline-[var(--accent)] flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
                style={DIVIDER_STYLE}
              >
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportFile}
                  className="sr-only"
                />
                <RowContent
                  icon={<UploadSimple size={19} aria-hidden="true" />}
                  title="Back-up herstellen"
                  description="Zet eerder bewaarde gegevens terug"
                  trailing={<CaretRight size={15} aria-hidden="true" style={{ color: "var(--text2)" }} />}
                />
              </label>
            </SettingsGroup>
            {importError && (
              <p className="mt-2 px-1 text-xs" role="alert" style={{ color: "var(--hard-no)" }}>
                {importError}
              </p>
            )}
            {importSuccess && (
              <p className="mt-2 px-1 text-xs" role="status" style={{ color: "var(--willing)" }}>
                {importSuccess}
              </p>
            )}
          </section>

          <section>
            <SectionTitle>Beveiliging</SectionTitle>
            <SettingsGroup>
              <button
                type="button"
                onClick={() => onOpenPinFlow(0)}
                className="focus-ring flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
              >
                <RowContent
                  icon={<LockKey size={19} aria-hidden="true" />}
                  title="Appvergrendeling"
                  description={appLockEnabled ? "PIN-vergrendeling actief" : "Bescherm KinkSync met een PIN"}
                  trailing={<CaretRight size={15} aria-hidden="true" style={{ color: "var(--text2)" }} />}
                />
              </button>

              {appLockEnabled && platformBioAvailable && (
                <div
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5"
                  style={DIVIDER_STYLE}
                >
                  <RowContent
                    icon={<Fingerprint size={19} aria-hidden="true" />}
                    title="Biometrie"
                    description="Ontgrendel met de beveiliging van je toestel"
                    trailing={
                      <Switch
                        checked={biometricEnabled}
                        disabled={bioRegistering}
                        onCheckedChange={(checked) => {
                          if (checked) void handleEnableBiometric();
                          else disableBiometric();
                        }}
                        label="Biometrische ontgrendeling"
                      />
                    }
                  />
                </div>
              )}

              {appLockEnabled && (
                <button
                  type="button"
                  onClick={() => onOpenPinFlow(2)}
                  className="focus-ring flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
                  style={DIVIDER_STYLE}
                >
                  <RowContent
                    icon={<Key size={19} aria-hidden="true" />}
                    title="PIN-vergrendeling verwijderen"
                    description="Laat je lokale gegevens staan"
                    danger
                    trailing={<CaretRight size={15} aria-hidden="true" style={{ color: "var(--hard-no)" }} />}
                  />
                </button>
              )}
            </SettingsGroup>
            {bioError && (
              <p className="mt-2 px-1 text-xs" role="alert" style={{ color: "var(--hard-no)" }}>
                {bioError}
              </p>
            )}
          </section>

          <section>
            <SectionTitle>App</SectionTitle>
            <SettingsGroup>
              {installAvailable && (
                <button
                  type="button"
                  onClick={handleOpenInstallGuide}
                  className="focus-ring flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <RowContent
                    icon={<DeviceMobile size={19} aria-hidden="true" />}
                    title="KinkSync installeren"
                    description="Open de installatiestappen voor dit toestel"
                    trailing={<CaretRight size={15} aria-hidden="true" style={{ color: "var(--text2)" }} />}
                  />
                </button>
              )}

              {installAvailable && (
                <div
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5"
                  style={DIVIDER_STYLE}
                >
                  <RowContent
                    icon={<BellSimple size={19} aria-hidden="true" />}
                    title="Installatievragen"
                    description={
                      automaticInstallPromptsEnabled
                        ? "Mag na gebruik een rustige installatiehint tonen"
                        : "Alleen nog handmatig via Instellingen"
                    }
                    trailing={
                      <Switch
                        checked={automaticInstallPromptsEnabled}
                        onCheckedChange={handleAutomaticPromptChange}
                        label="Automatische installatievragen"
                      />
                    }
                  />
                </div>
              )}

              <Link
                href="/about"
                onClick={onClose}
                className="focus-ring flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
                style={installAvailable ? DIVIDER_STYLE : undefined}
              >
                <RowContent
                  icon={<ShieldCheck size={19} aria-hidden="true" />}
                  title="Over KinkSync"
                  description="Privacy, verificatie en lokale opslag"
                  trailing={<CaretRight size={15} aria-hidden="true" style={{ color: "var(--text2)" }} />}
                />
              </Link>
            </SettingsGroup>
          </section>

          <section>
            <SectionTitle>Geavanceerd</SectionTitle>
            <SettingsGroup>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDestroy();
                }}
                className="focus-ring flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
              >
                <RowContent
                  icon={<Trash size={19} aria-hidden="true" />}
                  title="Alle data verwijderen"
                  description="Wis alle lokale gegevens op dit toestel"
                  danger
                  trailing={<CaretRight size={15} aria-hidden="true" style={{ color: "var(--hard-no)" }} />}
                />
              </button>
            </SettingsGroup>
          </section>
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
