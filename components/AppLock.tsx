"use client";
import { Backspace, Fingerprint, SpinnerGap } from "@phosphor-icons/react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TAP_SPRING, SHAKE_ANIM, useMotionSafe } from "@/lib/motion";
import { verifyPin } from "@/lib/crypto";
import { verifyBiometric } from "@/lib/webauthn";

const COOLDOWN_S = 30;
const MAX_ATTEMPTS = 5;
const PIN_LENGTH = 4;

const KEYS = ["1","2","3","4","5","6","7","8","9","","0","backspace"];

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

  async function handleKey(k: string) {
    if (cooldownLeft > 0) return;
    if (k === "backspace") { setDigits(d => d.slice(0, -1)); return; }
    if (digits.length >= PIN_LENGTH) return;
    const next = [...digits, k];
    setDigits(next);
    if (next.length < PIN_LENGTH) return;

    if (!storedHash) return;
    const ok = await verifyPin(next.join(""), storedHash);
    if (ok) {
      onUnlock();
    } else {
      setShake(true);
      setTimeout(() => { setShake(false); setDigits([]); }, 500);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        setAttempts(0);
        setCooldownLeft(COOLDOWN_S);
        setDigits([]);
      }
    }
  }

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
              whileTap={bioLoading ? {} : TAP_SPRING}
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
                Niet herkend — gebruik je PIN
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
                animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
                transition={SHAKE_ANIM}
                style={{ display: "flex", justifyContent: "center", gap: "0.875rem", marginBottom: "1.25rem" }}
              >
                {Array.from({ length: PIN_LENGTH }, (_, i) => (
                  <div key={i} style={{
                    width: 12, height: 12, borderRadius: "9999px",
                    background: i < digits.length ? "var(--accent)" : "var(--border)",
                    transition: "background 150ms ease",
                  }} />
                ))}
              </motion.div>
            </AnimatePresence>

            {cooldownLeft > 0 && (
              <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "var(--hard-no)", marginBottom: "1rem" }}>
                Wacht {cooldownLeft}s
              </p>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
              {KEYS.map((k, i) => (
                <motion.button
                  key={i}
                  aria-label={k === "backspace" ? "Laatste cijfer wissen" : k || undefined}
                  onClick={() => k && handleKey(k)}
                  disabled={!k || cooldownLeft > 0}
                  whileTap={k && cooldownLeft === 0 ? TAP_SPRING : {}}
                  style={{
                    height: "3.25rem", borderRadius: "0.75rem",
                    fontWeight: 600, cursor: k && cooldownLeft === 0 ? "pointer" : "default",
                    background: k ? "var(--surface3)" : "transparent",
                    border: k ? "1px solid var(--border)" : "none",
                    color: k === "backspace" ? "var(--text2)" : "var(--text)",
                    fontSize: "1.375rem",
                    opacity: (!k || cooldownLeft > 0) ? (k ? 0.4 : 0) : 1,
                    transition: "opacity 150ms ease, background 150ms ease",
                  }}
                >
                  {k === "backspace" ? <Backspace size={20} aria-hidden="true" /> : k}
                </motion.button>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
