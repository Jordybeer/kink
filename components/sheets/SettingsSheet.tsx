"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  Check,
  CaretRight,
  DownloadSimple,
  Fingerprint,
  Key,
  LockKey,
  Sparkle,
  DeviceMobile,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import Sheet from "@/components/Sheet";
import Switch from "@/components/ui/Switch";
import Accordion from "@/components/ui/Accordion";
import { useStore } from "@/lib/store";
import { registerBiometric, isPlatformAuthenticatorAvailable } from "@/lib/webauthn";
import { useTheme } from "@/components/ThemeProvider";
import { usePwaInstall } from "@/components/PwaInstallProvider";
import type { ThemePreference } from "@/lib/theme";

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

const SETTINGS_ICON_TONE = "color-mix(in srgb, var(--accent) 64%, var(--text2))";

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3
      className="mb-2 px-1 text-base font-medium"
      style={{ color: "var(--text)", fontFamily: "var(--font-display, Georgia, serif)" }}
    >
      {children}
    </h3>
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
      <span className="min-w-0 flex-1 break-words">
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
const SETTINGS_ROW_CLASS = "focus-ring ks-motion-choice flex min-h-[52px] w-full items-center gap-3 px-1.5 py-2 text-left sm:px-2";
const SETTINGS_SWITCH_ROW_CLASS = "flex min-h-[52px] w-full items-center gap-3 px-1.5 py-2 sm:px-2";

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "Systeem" },
  { value: "light", label: "Licht" },
  { value: "dark", label: "Donker" },
];

function ThemeSelector() {
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className="min-w-0 px-1.5 sm:px-2">
      <legend className="sr-only">Kleurmodus</legend>
      <div
        className="grid gap-1 rounded-xl p-1"
        data-testid="settings-theme-options"
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 5.5rem), 1fr))",
        }}
      >
        {THEME_OPTIONS.map((option) => {
          const active = preference === option.value;
          return (
            <label key={option.value} className="relative cursor-pointer">
              <input
                type="radio"
                name="kleurmodus"
                value={option.value}
                checked={active}
                onChange={() => setPreference(option.value)}
                className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <span
                className="flex min-h-11 items-center justify-center gap-1 rounded-lg border px-2 text-sm font-semibold ks-motion-state peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]"
                style={{
                  background: active ? "var(--surface3)" : "transparent",
                  borderColor: active ? "var(--border-accent)" : "transparent",
                  color: active ? "var(--text)" : "var(--text2)",
                  boxShadow: active ? "var(--shadow-control)" : "none",
                }}
              >
                <span className="flex w-3.5 flex-none items-center justify-center" aria-hidden="true">
                  <Check size={14} weight="bold" style={{ visibility: active ? "visible" : "hidden" }} aria-hidden="true" />
                </span>
                <span className="min-w-0 break-words">{option.label}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function InstallApp() {
  const { standalone, ios, canPrompt, busy, message, install } = usePwaInstall();
  if (standalone) return null;

  return (
    <Accordion
      className="border-t border-[var(--border)]"
      triggerClassName="px-1.5 py-2 sm:px-2"
      trigger={
        <span className="flex items-center gap-3">
          <RowContent
            icon={<DeviceMobile size={19} aria-hidden="true" />}
            title="KinkSync installeren"
            description="Open je eigen plek vanaf het beginscherm"
          />
        </span>
      }
    >
      <div className="space-y-3 px-1.5 pb-3 text-sm leading-relaxed sm:px-2" style={{ color: "var(--text)" }}>
        <p>Installeren is optioneel. Het KinkSync-icoon wordt zichtbaar op je toestel.</p>
        {canPrompt || busy ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void install()}
            className="ks-motion-choice focus-ring min-h-11 rounded-xl px-4 py-2 font-semibold disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            {busy ? "Installatie openen…" : "Installeer KinkSync"}
          </button>
        ) : ios ? (
          <p>Open KinkSync in Safari. Tik op Delen en kies ‘Zet op beginscherm’. Zet ‘Open als webapp’ aan als die keuze verschijnt.</p>
        ) : (
          <p>Open het browsermenu en kies ‘App installeren’ of ‘Toevoegen aan beginscherm’. Ontbreekt die optie? Gebruik een browser die webapps kan installeren, zoals Chrome of Edge.</p>
        )}
        {message && <p role="status">{message}</p>}
        <p style={{ color: "var(--text2)" }}>Maak eerst een back-up als je al profielen hebt. Zie je ze niet in de geïnstalleerde app? Herstel daar je back-up. Installeren is geen back-up.</p>
      </div>
    </Accordion>
  );
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
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 pb-0.5 [overflow-wrap:anywhere]">
        <section>
          <SectionTitle>Kleurmodus</SectionTitle>
          <p className="mb-3 px-1 text-xs leading-4" style={{ color: "var(--text2)" }}>Gebruik je toestelvoorkeur of kies zelf</p>
          <ThemeSelector />
        </section>

        <section>
          <SectionTitle>Gegevens</SectionTitle>
          <div>
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
              className="focus-within:outline focus-within:outline-2 focus-within:outline-[var(--accent)] flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-1.5 py-2 text-left sm:px-2"
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
          </div>
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
          <div>
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
          </div>
          {bioError && (
            <p className="mt-2 px-1 text-xs" role="alert" style={{ color: "var(--hard-no)" }}>
              {bioError}
            </p>
          )}
        </section>

        <section>
          <SectionTitle>KinkSync</SectionTitle>
          <div>
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
            <InstallApp />
          </div>
        </section>

        <div className="border-t border-[var(--border)] pt-3">
          <div>
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
          </div>
        </div>
      </div>
    </Sheet>
  );
}
