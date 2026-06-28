"use client";
import { useState, useEffect } from "react";
import Sheet from "@/components/ui/Sheet";
import { useStore } from "@/lib/store";
import { registerBiometric, isPlatformAuthenticatorAvailable } from "@/lib/webauthn";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenPinFlow: (step?: number) => void;
  onOpenDestroy: () => void;
  onResetTour: () => void;
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
  onResetTour,
  onExportBackup,
  onImportFile,
  importError,
  importSuccess,
}: SettingsSheetProps) {
  const { theme, setTheme, appLockEnabled, biometricEnabled, disableBiometric, enableBiometric } = useStore();

  const [platformBioAvailable, setPlatformBioAvailable] = useState(false);
  const [bioRegistering, setBioRegistering] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setPlatformBioAvailable);
  }, []);

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

  return (
    <Sheet open={open} onClose={onClose} title="Instellingen" aria-label="Instellingen">
      <div className="overflow-y-auto" style={{ maxHeight: "60svh" }}>

        {/* Thema */}
        <section className="settings-card">
          <div className="flex items-center gap-3 mb-3">
            <span className="settings-card-icon text-lg" aria-hidden="true">🎨</span>
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
                { value: "midnight", label: "Midnight", color: "#D946AF" },
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
                    ? { borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 8%, transparent)" }
                    : { borderColor: "var(--border)" }
                }
              >
                <span className="rounded-full flex-none" style={{ width: 20, height: 20, background: t.color }} aria-hidden="true" />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Back-up & herstel */}
        <section className="settings-card">
          <div className="flex items-center gap-3 mb-3">
            <span className="settings-card-icon text-lg" aria-hidden="true">💾</span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-tight">Back-up &amp; herstel</h3>
              <p className="text-xs truncate" style={{ color: "var(--text2)" }}>Exporteer of herstel je kinklijst</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onExportBackup}
              className="focus-ring py-3 rounded-xl text-sm font-medium border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              ⬇ Maak backup
            </button>
            <label className="focus-ring relative py-3 rounded-xl text-sm font-medium border transition-colors text-center cursor-pointer"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              ⬆ Herstel
              <input
                type="file"
                accept=".json"
                onChange={onImportFile}
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
            <span className="settings-card-icon text-lg" aria-hidden="true">🔒</span>
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
                <button onClick={() => onOpenPinFlow(0)}
                  className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                  🔑 PIN wijzigen
                </button>
                {platformBioAvailable && (
                  biometricEnabled ? (
                    <button onClick={() => disableBiometric()}
                      className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
                      style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
                      🔓 Face ID / vingerafdruk uitschakelen
                    </button>
                  ) : (
                    <button onClick={handleEnableBiometric} disabled={bioRegistering}
                      className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
                      style={{ borderColor: "var(--accent)", color: "var(--accent)", opacity: bioRegistering ? 0.6 : 1 }}>
                      {bioRegistering ? "Bezig…" : "🔓 Face ID / vingerafdruk inschakelen"}
                    </button>
                  )
                )}
                {bioError && <p className="text-xs text-center" style={{ color: "var(--hard-no)" }}>{bioError}</p>}
                <button onClick={() => onOpenPinFlow(2)}
                  className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
                  style={{ borderColor: "var(--hard-no)", color: "var(--hard-no)" }}>
                  PIN verwijderen
                </button>
              </>
            ) : (
              <button onClick={() => onOpenPinFlow(0)}
                className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                🔒 PIN-vergrendeling instellen
              </button>
            )}
          </div>
        </section>

        {/* Rondleiding */}
        <section className="settings-card">
          <div className="flex items-center gap-3 mb-3">
            <span className="settings-card-icon text-lg" aria-hidden="true">🧭</span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-tight">Rondleiding</h3>
              <p className="text-xs truncate" style={{ color: "var(--text2)" }}>Bekijk de uitleg opnieuw</p>
            </div>
          </div>
          <button
            onClick={() => { onResetTour(); onClose(); }}
            className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            🔍 Rondleiding opnieuw starten
          </button>
        </section>

        {/* Gevarenzone */}
        <section className="settings-card settings-card-danger">
          <div className="flex items-center gap-3 mb-3">
            <span className="settings-card-icon text-lg" aria-hidden="true">⚠️</span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-tight">Gevarenzone</h3>
              <p className="text-xs truncate" style={{ color: "var(--text2)" }}>Wis alles, permanent en onomkeerbaar</p>
            </div>
          </div>
          <button
            onClick={() => { onClose(); onOpenDestroy(); }}
            className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
            style={{ borderColor: "var(--hard-no)", color: "var(--hard-no)" }}
          >
            Vernietig alle data
          </button>
        </section>

      </div>
      <div className="pt-4">
        <button
          onClick={onClose}
          className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--text2)" }}
        >
          Sluit
        </button>
      </div>
    </Sheet>
  );
}
