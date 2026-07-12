"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useMotionSafe } from "@/lib/motion";
import { useStore } from "@/lib/store";
import type { EncryptedBackup } from "@/lib/crypto";
import type { Profile, ContractSnapshot } from "@/types";

// ─── Export sheet ─────────────────────────────────────────────────────────────

interface ExportSheetProps {
  open: boolean;
  onClose: () => void;
}

export function EncryptedExportSheet({ open, onClose }: ExportSheetProps) {
  const t = useMotionSafe();
  const { profiles, contracts } = useStore();
  const [step, setStep] = useState(0);
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwShow, setPwShow] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setStep(0); setPw(""); setPwConfirm(""); setPwShow(false); setPwError(null); setLoading(false);
  }

  function handleClose() { reset(); onClose(); }

  async function handleExport() {
    if (pw.length < 8) { setPwError("Wachtwoord moet minstens 8 tekens zijn."); return; }
    if (pw !== pwConfirm) { setPwError("Wachtwoorden komen niet overeen."); return; }
    setLoading(true);
    try {
      const plain = JSON.stringify({ version: 1, source: "backup", profiles, contracts });
      const { encryptBackup } = await import("@/lib/crypto");
      const encrypted = await encryptBackup(plain, pw);
      const blob = new Blob([JSON.stringify(encrypted)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kinksync-backup-${new Date().toISOString().slice(0, 10)}.enc.json`;
      a.click();
      URL.revokeObjectURL(url);
      handleClose();
    } finally {
      setLoading(false);
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
                <p><strong>Je staat op het punt gevoelige data te exporteren.</strong> Je kinklijst bevat je grenzen, verlangens en aantekeningen — informatie die niemand anders mag zien.</p>
                <p>Met encryptie is het bestand waardeloos zonder jouw wachtwoord. Zonder encryptie kan iedereen die het bestand vindt alles lezen.</p>
                <p className="font-semibold" style={{ color: "var(--hard-no)" }}>⚠ Als je dit wachtwoord vergeet, is je backup permanent onleesbaar. Er is geen hersteloptie.</p>
              </div>
              <button onClick={() => setStep(1)}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                Doorgaan
              </button>
              <button onClick={handleClose} className="w-full py-3 rounded-xl text-sm" style={{ color: "var(--text2)" }}>
                ← Terug
              </button>
            </motion.div>
          ) : (
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
                  {pwShow ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={pwShow ? "text" : "password"}
                  placeholder="Herhaal wachtwoord"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleExport(); }}
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
                <button type="button" onClick={() => setPwShow(v => !v)}
                  aria-label={pwShow ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 focus-ring rounded-lg p-0.5"
                  style={{ color: "var(--text2)" }}>
                  {pwShow ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pwError && <p className="text-xs" style={{ color: "var(--hard-no)" }}>{pwError}</p>}
              <button onClick={handleExport} disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                {loading ? "Versleutelen…" : "⬇ Versleuteld exporteren"}
              </button>
              <button onClick={() => setStep(0)} className="w-full py-3 rounded-xl text-sm" style={{ color: "var(--text2)" }}>
                ← Terug
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
  const { importProfiles, restoreContracts } = useStore();
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
      const { decryptBackup } = await import("@/lib/crypto");
      const plain = await decryptBackup(data, pw);
      const parsed = JSON.parse(plain) as Record<string, unknown>;
      handleClose();

      if (!parsed.profiles || !Array.isArray(parsed.profiles)) {
        onError("Ongeldig bestand — geen geldige profielen gevonden.");
        return;
      }
      // Decrypted doesn't mean trustworthy — every element gets frisked and
      // the fakes are dropped one by one instead of failing the whole restore.
      const { sanitizeProfileFull, sanitizeContractSnapshot } = await import("@/lib/sanitizeProfile");
      const incoming = parsed.profiles
        .map((p) => sanitizeProfileFull(p))
        .filter((p): p is Profile => p !== null);
      const restoredContracts = (Array.isArray(parsed.contracts) ? parsed.contracts : [])
        .map((c) => sanitizeContractSnapshot(c))
        .filter((c): c is ContractSnapshot => c !== null);
      if (!incoming.length && !restoredContracts.length) {
        onError("Ongeldig bestand — geen geldige profielen gevonden.");
        return;
      }
      if (incoming.length) importProfiles(incoming.map(p => ({ ...p, isImported: true as const, origin: "shared" as const, lockedAt: p.lockedAt ?? Date.now() })));
      if (restoredContracts.length) restoreContracts(restoredContracts);
      onSuccess(`${incoming.length} profiel(en) en ${restoredContracts.length} contract(en) hersteld.`);
    } catch {
      setPwError("Verkeerd wachtwoord — probeer opnieuw.");
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
              {pwShow ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {pwError && <p className="text-xs" style={{ color: "var(--hard-no)" }}>{pwError}</p>}
          <button onClick={handleDecrypt} disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
            {loading ? "Ontsleutelen…" : "Backup herstellen"}
          </button>
          <button onClick={handleClose} className="w-full py-3 rounded-xl text-sm" style={{ color: "var(--text2)" }}>
            Annuleer
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
