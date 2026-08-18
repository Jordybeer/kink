"use client";
import { Backspace, Check, Fingerprint, SpinnerGap } from "@phosphor-icons/react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SHAKE_ANIM, useMotionSafe } from "@/lib/motion";
import { verifyPin } from "@/lib/crypto";
import { verifyBiometric } from "@/lib/webauthn";
import { APP_LOCK_PIN_LENGTH, LEGACY_APP_LOCK_PIN_MAX_LENGTH } from "@/lib/appLockPin";

const COOLDOWN_S = 30;
const MAX_ATTEMPTS = 5;
const PIN_LENGTH = APP_LOCK_PIN_LENGTH;

const KEYS = ["1","2","3","4","5","6","7","8","9","submit","0","backspace"];

interface Props {
  storedHash: string | null;
  biometricCredentialId?: string | null;
  onUnlock: () => void;
}

export default function AppLock({ storedHash, biometricCredentialId, onUnlock }: Props) {
  const t = useMotionSafe();
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState(false);
  const [legacyPinMode, setLegacyPinMode] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  // Auto-trigger biometric on mount if available
  useEffect(() => {
    if (biometricCredentialId) tryBiometric();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = setTimeout(() => setCooldownLeft(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownLeft]);

  async function tryBiometric() {
    if (!biometricCredentialId || bioLoading) return;
    setBioLoading(true);
    setBioError(false);
    try {
      const ok = await verifyBiometric(biometricCredentialId);
      if (ok) onUnlock();
      else setBioError(true);
    } catch {
      setBioError(true);
    } finally {
      setBioLoading(false);
    }
  }

  function registerFailedAttempt(keepDigitsForLegacy: boolean) {
    setShake(true);
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (newAttempts >= MAX_ATTEMPTS) {
      setAttempts(0);
      setCooldownLeft(COOLDOWN_S);
      setDigits([]);
      setLegacyPinMode(false);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (keepDigitsForLegacy) {
      setLegacyPinMode(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setTimeout(() => {
      setShake(false);
      setDigits([]);
      setLegacyPinMode(false);
    }, 500);
  }

  async function verifyEnteredPin(candidate: string, allowLegacyContinuation: boolean) {
    if (!storedHash || pinLoading) return;
    setPinLoading(true);
    try {
      const ok = await verifyPin(candidate, storedHash);
      if (ok) {
        onUnlock();
        return;
      }
      registerFailedAttempt(allowLegacyContinuation);
    } finally {
      setPinLoading(false);
    }
  }

  async function handleKey(k: string) {
    if (cooldownLeft > 0 || pinLoading || shake) return;

    if (k === "backspace") {
      const next = digits.slice(0, -1);
      setDigits(next);
      if (next.length < PIN_LENGTH) setLegacyPinMode(false);
      return;
    }

    if (k === "submit") {
      if (!legacyPinMode || digits.length <= PIN_LENGTH) return;
      await verifyEnteredPin(digits.join(""), false);
      return;
    }

    const maxLength = legacyPinMode ? LEGACY_APP_LOCK_PIN_MAX_LENGTH : PIN_LENGTH;
    if (digits.length >= maxLength) return;

    const next = [...digits, k];
    setDigits(next);

    // Nieuwe PINs zijn vier cijfers en blijven dus zonder extra bevestiging
    // ontgrendelen. Een mislukte viercijferpoging telt wél voor de rate limit,
    // maar blijft kort staan zodat een vóór deze fix ingestelde 5–8-cijferige
    // PIN verder kan worden ingevoerd. Zo herstellen we toegang zonder een
    // onbeperkte viercijfer-oracle te maken.
    if (next.length === PIN_LENGTH && !legacyPinMode) {
      await verifyEnteredPin(next.join(""), true);
      return;
    }

    // Acht was de oude bovengrens. Daar is geen mogelijke volgende digit meer,
    // dus verifieer automatisch; bij vijf tot zeven verschijnt de checkknop.
    if (legacyPinMode && next.length === LEGACY_APP_LOCK_PIN_MAX_LENGTH) {
      await verifyEnteredPin(next.join(""), false);
    }
  }

  const indicatorCount = Math.max(PIN_LENGTH, digits.length);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={t.fast}
      style={{ position: "fixed", inset: 0, zIndex: 600, background: "var(--scrim-strong)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={t.modal}
        style={{
          width: "min(18rem, calc(100vw - 2rem))",
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: "1rem",
          padding: "1.5rem 1.125rem 1.125rem",
          boxShadow: "0 8px 32px var(--scrim)",
        }}
      >
        <h2 style={{ margin: "0 0 0.25rem", fontSize: "0.9375rem", fontWeight: 600, color: "var(--text)", textAlign: "center" }}>
          KinkSync ontgrendelen
        </h2>

        {/* Biometric button */}
        {biometricCredentialId && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.25rem", marginTop: "0.5rem" }}>
            <motion.button
              onClick={tryBiometric}
              disabled={bioLoading}
              whileTap={bioLoading ? undefined : t.tap}
              style={{
                background: bioLoading ? "var(--surface3)" : "color-mix(in srgb, var(--accent) 12%, transparent)",
                border: `1px solid color-mix(in srgb, var(--accent) 30%, transparent)`,
                borderRadius: "0.875rem",
                padding: "0.75rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--accent)",
                cursor: bioLoading ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "opacity 150ms ease",
                opacity: bioLoading ? 0.6 : 1,
              }}
            >
              {bioLoading ? <SpinnerGap size={20} className="animate-spin" aria-hidden="true" /> : <Fingerprint size={20} aria-hidden="true" />}
              {bioLoading ? "Controleren…" : "Face ID / vingerafdruk"}
            </motion.button>
            {bioError && (
              <p style={{ fontSize: "0.75rem", color: "var(--text2)", marginTop: "0.375rem" }}>
                Niet herkend. Gebruik je PIN
              </p>
            )}
            {storedHash && (
              <p style={{ fontSize: "0.75rem", color: "var(--text2)", marginTop: "0.375rem", opacity: 0.6 }}>
                of voer PIN in
              </p>
            )}
          </div>
        )}

        {/* PIN pad — only shown when PIN is set */}
        {storedHash && (
          <>
            {/* Dot indicators */}
            <AnimatePresence mode="wait">
              <motion.div
                key={shake ? "shake" : "normal"}
                animate={shake && !t.reduced ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
                transition={t.reduced ? t.fast : SHAKE_ANIM}
                style={{ display: "flex", justifyContent: "center", gap: "0.875rem", marginBottom: legacyPinMode ? "0.5rem" : "1.25rem" }}
              >
                {Array.from({ length: indicatorCount }, (_, i) => (
                  <div key={i} style={{
                    width: 12, height: 12, borderRadius: "9999px",
                    background: i < digits.length ? "var(--accent)" : "var(--border)",
                    transition: "background 150ms ease",
                  }} />
                ))}
              </motion.div>
            </AnimatePresence>

            {legacyPinMode && cooldownLeft === 0 && (
              <p role="status" style={{ textAlign: "center", fontSize: "0.6875rem", lineHeight: 1.35, color: "var(--text2)", margin: "0 0 0.75rem" }}>
                PIN niet herkend. Had je eerder 5–8 cijfers? Vul de rest in en tik op ✓.
              </p>
            )}

            {cooldownLeft > 0 && (
              <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "var(--hard-no)", marginBottom: "1rem" }}>
                Wacht {cooldownLeft}s
              </p>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
              {KEYS.map((k, i) => {
                const submitEnabled = k === "submit" && legacyPinMode && digits.length > PIN_LENGTH;
                const keyEnabled = k === "submit" ? submitEnabled : !!k;
                const disabled = !keyEnabled || cooldownLeft > 0 || pinLoading || shake;
                const visible = k !== "submit" || submitEnabled;
                const ariaLabel = !visible
                  ? undefined
                  : k === "backspace"
                    ? "Laatste cijfer wissen"
                    : k === "submit"
                      ? "Oudere PIN bevestigen"
                      : k || undefined;

                return (
                  <motion.button
                    key={i}
                    aria-label={ariaLabel}
                    aria-hidden={!visible ? true : undefined}
                    tabIndex={visible ? undefined : -1}
                    onClick={() => keyEnabled && handleKey(k)}
                    disabled={disabled}
                    whileTap={!disabled ? t.tap : undefined}
                    style={{
                      height: "3.25rem", borderRadius: "0.75rem",
                      fontWeight: 600, cursor: !disabled ? "pointer" : "default",
                      background: visible ? "var(--surface3)" : "transparent",
                      border: visible ? "1px solid var(--border)" : "none",
                      color: k === "backspace" || k === "submit" ? "var(--text2)" : "var(--text)",
                      fontSize: "1.375rem",
                      opacity: visible ? (disabled ? 0.4 : 1) : 0,
                      transition: "opacity 150ms ease, background 150ms ease",
                    }}
                  >
                    {k === "backspace"
                      ? <Backspace size={20} aria-hidden="true" />
                      : k === "submit"
                        ? <Check size={20} weight="bold" aria-hidden="true" />
                        : k}
                  </motion.button>
                );
              })}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
