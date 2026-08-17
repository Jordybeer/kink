"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, DownloadSimple, Eye, EyeSlash, Warning } from "@phosphor-icons/react";
import { useMotionSafe } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { useContractStore } from "@/lib/contractStore";
import type { EncryptedBackup } from "@/lib/crypto";

// ─── Export sheet ─────────────────────────────────────────────────────────────

interface ExportSheetProps {
  open: boolean;
  onClose: () => void;
}

interface PreparedExport {
  json: string;
  filename: string;
}

export function EncryptedExportSheet({ open, onClose }: ExportSheetProps) {
  const t = useMotionSafe();
  const { profiles, contracts, profileOwnerKeys } = useStore();
  const contractSeries = useContractStore((state) => state.series);
  const [step, setStep] = useState(0);
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwShow, setPwShow] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preparedExport, setPreparedExport] = useState<PreparedExport | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setStep(0);
    setPw("");
    setPwConfirm("");
    setPwShow(false);
    setPwError(null);
    setLoading(false);
    setPreparedExport(null);
    setSaveError(null);
    setSaving(false);
  }

  function handleClose() { reset(); onClose(); }

  async function handlePrepareExport() {
    if (loading) return;
    if (pw.length < 8) { setPwError("Wachtwoord moet minstens 8 tekens zijn."); return; }
    if (pw !== pwConfirm) { setPwError("Wachtwoorden komen niet overeen."); return; }
    setLoading(true);
    setPwError(null);
    try {
      const plain = JSON.stringify({ version: 3, source: "backup", profiles, contracts, contractSeries, profileOwnerKeys });
      const { encryptBackup } = await import("@/lib/crypto");
      const encrypted = await encryptBackup(plain, pw);
      setPreparedExport({
        json: JSON.stringify(encrypted),
        filename: `kinksync-backup-${new Date().toISOString().slice(0, 10)}.enc.json`,
      });
      // The encrypted payload is ready. Clear the password before the explicit
      // save gesture so it is not kept in component state longer than needed.
      setPw("");
      setPwConfirm("");
      setPwShow(false);
      setStep(2);
    } catch {
      setPwError("De back-up kon niet worden versleuteld. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveExport() {
    if (!preparedExport || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const file = new File([preparedExport.json], preparedExport.filename, { type: "application/json" });
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
        share?: (data?: ShareData) => Promise<void>;
      };
      const shareData: ShareData = { files: [file], title: "KinkSync-back-up" };

      // iOS/PWA downloads may ignore a synthetic click once the original user
      // activation was consumed by asynchronous encryption. A second explicit
      // tap keeps the native file/share sheet inside a fresh user gesture.
      if (typeof nav.share === "function" && nav.canShare?.(shareData)) {
        await nav.share(shareData);
        handleClose();
        return;
      }

      // Browser fallback: keep the object URL alive long enough for Safari and
      // Chromium to claim it, and attach the anchor before clicking it.
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = preparedExport.filename;
      anchor.rel = "noopener";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      handleClose();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSaveError("Bewaren lukte niet. Probeer het opnieuw of gebruik een andere browser.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4" style={{ background: "var(--scrim)" }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 ? (
            <motion.div key="warning"
              initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}
              transition={t.slide}
              className="p-6 flex flex-col gap-4"
            >
              <h2 className="text-base font-bold">Backup versleutelen</h2>
              <div className="rounded-xl p-4 text-sm flex flex-col gap-3" style={{ background: "color-mix(in srgb, var(--hard-no) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--hard-no) 25%, transparent)", color: "var(--text)" }}>
                <p><strong>Je staat op het punt gevoelige data te exporteren.</strong> Je kinklijst bevat je grenzen, verlangens en aantekeningen: informatie die niemand anders mag zien.</p>
                <p>De versleutelde backup bevat ook de private eigendomssleutels van je profielen. Wie zowel dit bestand als het wachtwoord bezit, kan nieuwe profielversies ondertekenen alsof die van jouw lokale profielbron komen.</p>
                <p>Met encryptie is het bestand waardeloos zonder jouw wachtwoord. Bewaar bestand en wachtwoord daarom apart en deel geen van beide.</p>
                <p className="font-semibold flex items-start gap-1.5" style={{ color: "var(--hard-no)" }}><Warning size={16} weight="fill" className="mt-0.5 flex-none" aria-hidden="true" /><span>Als je dit wachtwoord vergeet, is je backup permanent onleesbaar. Er is geen hersteloptie.</span></p>
              </div>
              <button onClick={() => setStep(1)}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}>
                Doorgaan
              </button>
              <button onClick={handleClose} className="w-full py-3 rounded-xl text-sm inline-flex items-center justify-center gap-1" style={{ color: "var(--text2)" }}>
                <ArrowLeft size={14} aria-hidden="true" /> Terug
              </button>
            </motion.div>
          ) : step === 1 ? (
            <motion.div key="fields"
              initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
              transition={t.slide}
              className="p-6 flex flex-col gap-4"
            >
              <h2 className="text-base font-bold">Kies een wachtwoord</h2>
              <div className="relative">
                <input
                  type={pwShow ? "text" : "password"}
                  placeholder="Wachtwoord (min. 8 tekens)"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  autoFocus
                />
                <button type="button" onClick={() => setPwShow(v => !v)}
                  aria-label={pwShow ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 focus-ring rounded-lg p-0.5"
                  style={{ color: "var(--text2)" }}>
                  {pwShow ? <EyeSlash aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={pwShow ? "text" : "password"}
                  placeholder="Herhaal wachtwoord"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handlePrepareExport(); }}
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
                <button type="button" onClick={() => setPwShow(v => !v)}
                  aria-label={pwShow ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 focus-ring rounded-lg p-0.5"
                  style={{ color: "var(--text2)" }}>
                  {pwShow ? <EyeSlash aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
                </button>
              </div>
              {pwError && <p className="text-xs" role="alert" style={{ color: "var(--hard-no)" }}>{pwError}</p>}
              <button onClick={() => void handlePrepareExport()} disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}>
                {loading ? "Versleutelen…" : "Versleutelen"}
              </button>
              <button onClick={() => setStep(0)} className="w-full py-3 rounded-xl text-sm inline-flex items-center justify-center gap-1" style={{ color: "var(--text2)" }}>
                <ArrowLeft size={14} aria-hidden="true" /> Terug
              </button>
            </motion.div>
          ) : (
            <motion.div key="ready"
              initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
              transition={t.slide}
              className="p-6 flex flex-col gap-4"
            >
              <h2 className="text-base font-bold">Back-up klaar</h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                Je back-up is versleuteld. Tik nog één keer om het bestand veilig op je toestel te bewaren.
              </p>
              {saveError && <p className="text-xs" role="alert" style={{ color: "var(--hard-no)" }}>{saveError}</p>}
              <button onClick={() => void handleSaveExport()} disabled={saving || !preparedExport}
                className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}>
                {saving ? "Openen…" : <span className="inline-flex items-center justify-center gap-1.5"><DownloadSimple size={15} aria-hidden="true" />Back-up bewaren</span>}
              </button>
              <button onClick={() => { setPreparedExport(null); setSaveError(null); setStep(1); }} className="w-full py-3 rounded-xl text-sm inline-flex items-center justify-center gap-1" style={{ color: "var(--text2)" }}>
                <ArrowLeft size={14} aria-hidden="true" /> Wachtwoord wijzigen
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Import sheet ─────────────────────────────────────────────────────────────

interface ImportSheetProps {
  open: boolean;
  data: EncryptedBackup | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function EncryptedImportSheet({ open, data, onClose, onSuccess, onError }: ImportSheetProps) {
  const t = useMotionSafe();
  const { importProfiles, restoreBackupProfiles, restoreContracts } = useStore();
  const restoreContractSeries = useContractStore((state) => state.restoreSeries);
  const [pw, setPw] = useState("");
  const [pwShow, setPwShow] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setPw(""); setPwShow(false); setPwError(null);
    onClose();
  }

  async function handleDecrypt() {
    if (!data) return;
    setLoading(true);
    setPwError(null);
    try {
      let parsed: Record<string, unknown>;
      try {
        const { decryptBackup } = await import("@/lib/crypto");
        const plain = await decryptBackup(data, pw);
        parsed = JSON.parse(plain) as Record<string, unknown>;
      } catch {
        setPwError("Verkeerd wachtwoord of beschadigd versleuteld bestand.");
        return;
      }

      if (!Array.isArray(parsed.profiles)) {
        handleClose();
        onError("Ongeldig backupbestand: geen profielen gevonden.");
        return;
      }

      const { prepareBackupRestore } = await import("@/lib/backupRestore");
      let prepared;
      try {
        prepared = await prepareBackupRestore(parsed);
      } catch {
        handleClose();
        onError("Het bestand kon worden ontsleuteld, maar bevat geen geldige KinkSync-backup.");
        return;
      }

      if (!prepared.profiles.length && !prepared.contracts.length && !prepared.contractSeries.length) {
        handleClose();
        onError("De backup bevat geen geldige profielen of contracten om te herstellen.");
        return;
      }

      const knownContractIds = new Set(useStore.getState().contracts.map((contract) => contract.id));
      const contractsAdded = prepared.contracts.filter((contract) => !knownContractIds.has(contract.id)).length;
      let message: string;

      if (prepared.source === "backup") {
        const result = restoreBackupProfiles(prepared.profiles, prepared.ownerKeys);
        if (prepared.contracts.length) restoreContracts(prepared.contracts);
        const seriesResult = restoreContractSeries(prepared.contractSeries);
        const profileChanges = result.added + result.updated;
        const keyChanges = result.ownerKeysAdded + result.ownerKeysUpdated;
        const seriesChanges = seriesResult.added + seriesResult.updated;

        if (profileChanges === 0 && keyChanges === 0 && contractsAdded === 0 && seriesChanges === 0) {
          message = result.conflicts > 0
            ? `Backup gecontroleerd: niets overschreven; ${result.conflicts} bronconflict(en) veilig overgeslagen.`
            : "Backup gecontroleerd: de bestaande gegevens waren al even nieuw of nieuwer.";
        } else {
          message = `Backup hersteld: ${result.added} profiel(en) toegevoegd, ${result.updated} bijgewerkt, ${result.unchanged} ongewijzigd, ${result.conflicts} bronconflict(en) overgeslagen, ${keyChanges} eigendomssleutel(s), ${contractsAdded} oud(e) contract(en) en ${seriesChanges} contractreeks(en) toegevoegd of bijgewerkt.`;
        }
      } else {
        importProfiles(prepared.profiles);
        if (prepared.contracts.length) restoreContracts(prepared.contracts);
        message = `Import verwerkt: ${prepared.profiles.length} geldig(e) gedeeld(e) profiel(en) en ${contractsAdded} nieuw(e) contract(en).`;
      }

      handleClose();
      onSuccess(message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div key="import-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={t.fast}
        className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4"
        style={{ background: "var(--scrim)" }}
      >
        <motion.div key="import-card"
          initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
          transition={t.fast}
          className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-base font-bold">Versleutelde backup ontgrendelen</h2>
          <p className="text-xs" style={{ color: "var(--text2)" }}>Voer het wachtwoord in waarmee je deze backup hebt beveiligd.</p>
          <div className="relative">
            <input
              type={pwShow ? "text" : "password"}
              placeholder="Wachtwoord"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleDecrypt(); }}
              className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              autoFocus
            />
            <button type="button" onClick={() => setPwShow(v => !v)}
              aria-label={pwShow ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
              className="absolute right-3 top-1/2 -translate-y-1/2 focus-ring rounded-lg p-0.5"
              style={{ color: "var(--text2)" }}>
              {pwShow ? <EyeSlash aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
            </button>
          </div>
          {pwError && <p className="text-xs" style={{ color: "var(--hard-no)" }}>{pwError}</p>}
          <button onClick={handleDecrypt} disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}>
            {loading ? "Ontsleutelen…" : "Backup herstellen"}
          </button>
          <button onClick={handleClose} className="w-full py-3 rounded-xl text-sm inline-flex items-center justify-center gap-1" style={{ color: "var(--text2)" }}>
            <ArrowLeft size={14} aria-hidden="true" /> Annuleer
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}