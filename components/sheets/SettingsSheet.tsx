"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  CaretRight,
  DownloadSimple,
  Fingerprint,
  Key,
  LockKey,
  Sparkle,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import Sheet from "@/components/Sheet";
import Switch from "@/components/ui/Switch";
import { useStore } from "@/lib/store";
import { registerBiometric, isPlatformAuthenticatorAvailable } from "@/lib/webauthn";

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

const SETTINGS_ICON_TONE = "color-mix(in srgb, var(--accent) 72%, var(--text2))";

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3
      className="mb-1.5 px-1 text-xs font-semibold tracking-wide"
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
  iconColor,
  title,
  description,
  trailing,
  danger = false,
}: {
  icon: ReactNode;
  iconColor?: string;
  title: string;
  description: string;
  trailing?: ReactNode;
  danger?: boolean;
}) {
  return (
    <>
      <span
        className="flex w-8 flex-none items-center justify-center"
        style={{ color: danger ? "var(--hard-no-text)" : iconColor ?? SETTINGS_ICON_TONE }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block text-sm font-semibold leading-5"
          style={{ color: danger ? "var(--hard-no)" : "var(--text)" }}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-4" style={{ color: "var(--text2)" }}>
          {description}
        </span>
      </span>
      {trailing && <span className="flex-none">{trailing}</span>}
    </>
  );
}

const DIVIDER_STYLE = { borderTop: "1px solid var(--border)" } as const;
const SETTINGS_ROW_CLASS = "focus-ring flex min-h-14 w-full items-center gap-3 px-3.5 py-2.5 text-left";
const SETTINGS_SWITCH_ROW_CLASS = "flex min-h-14 w-full items-center gap-3 px-3.5 py-2";

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

  const [platformBioAvailable, setPlatformBioAvailable] = useState(false);
  const [bioRegistering, setBioRegistering] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  useEffect(() => {
    isPlatformAuthenticatorAvailable()
      .then(setPlatformBioAvailable)
      .catch(() => setPlatformBioAvailable(false));
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

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Instellingen"
      scrollable
      variant="surface"
      aria-label="Instellingen"
    >
      <div className="grid gap-4 pb-0.5">
        <section>
          <SectionTitle>Gegevens</SectionTitle>
          <SettingsGroup>
            <button
              type="button"
              onClick={onExportBackup}
              className={SETTINGS_ROW_CLASS}
            >
              <RowContent
                icon={<DownloadSimple size={19} aria-hidden="true" />}
                title="Back-up maken"
                description="Bewaar een kopie van je lokale gegevens"
                trailing={<CaretRight size={15} aria-hidden="true" style={{ color: "var(--text2)" }} />}
              />
            </button>

            <label
              className="focus-within:outline focus-within:outline-2 focus-within:outline-[var(--accent)] flex min-h-14 w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left"
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
              className={SETTINGS_ROW_CLASS}
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
                className={SETTINGS_SWITCH_ROW_CLASS}
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
                className={SETTINGS_ROW_CLASS}
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
          <SectionTitle>KinkSync</SectionTitle>
          <SettingsGroup>
            <Link
              href="/about"
              onClick={onClose}
              className={SETTINGS_ROW_CLASS}
            >
              <RowContent
                icon={<Sparkle size={19} aria-hidden="true" />}
                title="Over KinkSync"
                description="Wat KinkSync doet en hoe het werkt"
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
              className={SETTINGS_ROW_CLASS}
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
  );
}
