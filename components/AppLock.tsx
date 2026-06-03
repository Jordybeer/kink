"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { hashPin } from "@/lib/crypto";

const COOLDOWN_S = 30;
const MAX_ATTEMPTS = 5;
const PIN_LENGTH = 4;

const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

interface Props {
  storedHash: string;
  onUnlock: () => void;
}

export default function AppLock({ storedHash, onUnlock }: Props) {
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setTimeout(() => setCooldownLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldownLeft]);

  async function handleKey(k: string) {
    if (cooldownLeft > 0) return;
    if (k === "⌫") { setDigits(d => d.slice(0, -1)); return; }
    if (digits.length >= PIN_LENGTH) return;
    const next = [...digits, k];
    setDigits(next);
    if (next.length < PIN_LENGTH) return;

    const hash = await hashPin(next.join(""));
    if (hash === storedHash) {
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
      style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
    >
      {/* Card */}
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        style={{
          width: "min(18rem, calc(100vw - 2rem))",
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: "1rem",
          padding: "1.5rem 1.125rem 1.125rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <h2 style={{ margin: "0 0 1.25rem", fontSize: "0.9375rem", fontWeight: 600, color: "var(--text)", textAlign: "center" }}>
          Voer je PIN in
        </h2>

        {/* Dot indicators */}
        <AnimatePresence mode="wait">
          <motion.div
            key={shake ? "shake" : "normal"}
            animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            style={{ display: "flex", justifyContent: "center", gap: "0.875rem", marginBottom: "1.5rem" }}
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

        {/* Cooldown message */}
        {cooldownLeft > 0 && (
          <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "var(--hard-no)", marginBottom: "1rem" }}>
            Wacht {cooldownLeft}s
          </p>
        )}

        {/* PIN pad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
          {KEYS.map((k, i) => (
            <button
              key={i}
              onClick={() => k && handleKey(k)}
              disabled={!k || cooldownLeft > 0}
              style={{
                height: "3.25rem", borderRadius: "0.75rem", fontSize: k === "⌫" ? "1.25rem" : "1.25rem",
                fontWeight: 600, cursor: k && cooldownLeft === 0 ? "pointer" : "default",
                background: k ? "var(--surface3)" : "transparent",
                border: k ? "1px solid var(--border)" : "none",
                color: k === "⌫" ? "var(--text2)" : "var(--text)",
                opacity: (!k || cooldownLeft > 0) ? (k ? 0.4 : 0) : 1,
                transition: "opacity 150ms ease, background 150ms ease",
              }}
              onMouseDown={e => { if (k) (e.currentTarget as HTMLButtonElement).style.background = "var(--border)"; }}
              onMouseUp={e => { if (k) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface3)"; }}
            >
              {k}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
