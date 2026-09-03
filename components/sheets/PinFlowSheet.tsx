"use client";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SHEET_BACKDROP_STYLE } from "@/components/SheetBackdrop";
import { useMotionSafe } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { APP_LOCK_PIN_LENGTH, isValidAppLockPin, normalizeAppLockPinInput } from "@/lib/appLockPin";

interface PinFlowSheetProps {
  open: boolean;
  initialStep?: number;
  onClose: () => void;
}

export default function PinFlowSheet({ open, initialStep = 0, onClose }: PinFlowSheetProps) {
  const t = useMotionSafe();
  const { setAppLockPin, clearAppLockPin } = useStore();

  const [step, setStep] = useState(initialStep);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(initialStep);
      setPinInput("");
      setPinConfirm("");
      setPinError(null);
    }
  }, [open, initialStep]);

  function handleClose() {
    onClose();
    setTimeout(() => {
      setPinInput("");
      setPinConfirm("");
      setPinError(null);
      setStep(0);
    }, 300);
  }

  async function handleSavePin() {
    if (!isValidAppLockPin(pinInput)) { setPinError(`PIN moet precies ${APP_LOCK_PIN_LENGTH} cijfers zijn.`); return; }
    if (pinInput !== pinConfirm) { setPinError("PINs komen niet overeen."); return; }
    const { hashPin } = await import("@/lib/crypto");
    const hash = await hashPin(pinInput);
    setAppLockPin(hash);
    sessionStorage.removeItem("app_unlocked");
    handleClose();
  }

  function handleRemovePin() {
    clearAppLockPin();
    sessionStorage.removeItem("app_unlocked");
    handleClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-4" style={SHEET_BACKDROP_STYLE}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 && (
            <motion.div key="pin-intro"
              initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}
              transition={t.slide}
              className="p-6 flex flex-col gap-4"
            >
              <h2 className="text-base font-bold">PIN-vergrendeling</h2>
              <p className="text-sm" style={{ color: "var(--text2)" }}>
                Stel een PIN in om de app te beveiligen. Je hebt deze nodig bij elke herstart.
              </p>
              <button onClick={() => setStep(1)}
                className="w-full py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1"
                style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}>
                PIN instellen <ArrowRight size={14} aria-hidden="true" />
              </button>
              <button onClick={handleClose} className="w-full py-3 rounded-xl text-sm inline-flex items-center justify-center gap-1" style={{ color: "var(--text2)" }}>
                Annuleer
              </button>
            </motion.div>
          )}
          {step === 1 && (
            <motion.div key="pin-enter"
              initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
              transition={t.slide}
              className="p-6 flex flex-col gap-4"
            >
              <h2 className="text-base font-bold">Kies een PIN</h2>
              <input
                type="password" inputMode="numeric" pattern="[0-9]*"
                placeholder={`${APP_LOCK_PIN_LENGTH} cijfers`}
                aria-label={`Nieuwe PIN, ${APP_LOCK_PIN_LENGTH} cijfers`}
                value={pinInput} onChange={e => { setPinInput(normalizeAppLockPinInput(e.target.value)); setPinError(null); }}
                className="focus-ring w-full rounded-xl px-4 py-3 text-sm outline-none tracking-widest text-center"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "1.5rem" }}
                autoFocus
              />
              <input
                type="password" inputMode="numeric" pattern="[0-9]*"
                placeholder="Herhaal PIN"
                aria-label="Herhaal de nieuwe PIN"
                value={pinConfirm} onChange={e => { setPinConfirm(normalizeAppLockPinInput(e.target.value)); setPinError(null); }}
                onKeyDown={e => { if (e.key === "Enter") handleSavePin(); }}
                className="focus-ring w-full rounded-xl px-4 py-3 text-sm outline-none tracking-widest text-center"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "1.5rem" }}
              />
              {pinError && <p className="text-xs text-center" role="alert" style={{ color: "var(--hard-no)" }}>{pinError}</p>}
              <button onClick={handleSavePin}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}>
                PIN opslaan
              </button>
              <button onClick={() => setStep(0)} className="w-full py-3 rounded-xl text-sm inline-flex items-center justify-center gap-1" style={{ color: "var(--text2)" }}>
                <ArrowLeft size={14} aria-hidden="true" /> Terug
              </button>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="pin-remove"
              initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
              transition={t.slide}
              className="p-6 flex flex-col gap-4"
            >
              <h2 className="text-base font-bold">PIN verwijderen</h2>
              <p className="text-sm" style={{ color: "var(--text2)" }}>
                De app wordt niet meer vergrendeld bij het herstarten.
              </p>
              <button onClick={handleRemovePin}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: "var(--danger-fill)", color: "var(--on-danger-fill)" }}>
                Ja, verwijder PIN
              </button>
              <button onClick={handleClose} className="w-full py-3 rounded-xl text-sm inline-flex items-center justify-center gap-1" style={{ color: "var(--text2)" }}>
                Annuleer
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
