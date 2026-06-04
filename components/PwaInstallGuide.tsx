"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TAP_SPRING, useMotionSafe } from "@/lib/motion";

interface Props {
  isIos: boolean;
  onInstall?: () => void;
  onDismiss: () => void;
}

const IOS_STEPS = [
  {
    title: "Tap het deel-icoon",
    body: "Tap op het icoon □↑ onderin de Safari-navigatiebalk.",
  },
  {
    title: "Kies 'Zet op beginscherm'",
    body: "Scroll omlaag in het deelmenu en kies \"Zet op beginscherm\".",
  },
  {
    title: "Tap 'Voeg toe'",
    body: "Bevestig rechtsboven met 'Voeg toe'. KinkSync verschijnt dan als app op je beginscherm.",
  },
];

export default function PwaInstallGuide({ isIos, onInstall, onDismiss }: Props) {
  const t = useMotionSafe();
  const [step, setStep] = useState(0);
  const steps = isIos ? IOS_STEPS : null;
  const isLast = steps ? step === steps.length - 1 : true;

  function advance() {
    if (!steps || isLast) {
      onDismiss();
    } else {
      setStep(s => s + 1);
    }
  }

  const current = steps?.[step];

  return (
    <AnimatePresence>
      <motion.div
        key="pwa-backdrop"
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.55)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={t.fast}
        onClick={onDismiss}
      />

      <motion.div
        key="pwa-card"
        role="dialog"
        aria-modal="true"
        aria-label="KinkSync installeren"
        style={{
          position: "fixed",
          bottom: "1rem",
          left: "50%",
          zIndex: 401,
          width: "min(18rem, calc(100vw - 2rem))",
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: "1rem",
          padding: "1.125rem 1.125rem 0.875rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
        initial={{ opacity: 0, x: "-50%", y: 32 }}
        animate={{ opacity: 1, x: "-50%", y: 0 }}
        exit={{ opacity: 0, x: "-50%", y: 32 }}
        transition={t.modal}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.375rem" }}>
          <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600, color: "var(--text)" }}>
            KinkSync installeren
          </h3>
          {steps && (
            <span style={{ fontSize: "0.75rem", color: "var(--text2)", flexShrink: 0, marginLeft: "0.5rem", marginTop: "0.125rem" }}>
              {step + 1}/{steps.length}
            </span>
          )}
        </div>

        {/* Body */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={t.fast}
          >
            {isIos && current ? (
              <p style={{ margin: "0 0 1rem", fontSize: "0.8125rem", color: "var(--text2)", lineHeight: 1.6 }}>
                {current.body}
              </p>
            ) : (
              <p style={{ margin: "0 0 1rem", fontSize: "0.8125rem", color: "var(--text2)", lineHeight: 1.6 }}>
                Installeer KinkSync als app — werkt offline en zonder browserbalk.
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {isIos ? (
            <>
              <motion.button
                onClick={advance}
                whileTap={TAP_SPRING}
                style={{
                  flex: 1, background: "var(--accent)", color: "#000", fontWeight: 600,
                  padding: "0.5rem 1rem", borderRadius: "9999px", border: "none",
                  fontSize: "0.8125rem", cursor: "pointer",
                }}
              >
                {isLast ? "Klaar 🖤" : "Volgende →"}
              </motion.button>
              <motion.button
                onClick={onDismiss}
                whileTap={TAP_SPRING}
                style={{
                  background: "transparent", border: "1px solid var(--border)",
                  color: "var(--text2)", padding: "0.5rem 0.875rem",
                  borderRadius: "9999px", fontSize: "0.75rem", cursor: "pointer",
                }}
              >
                Sla over
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                onClick={() => { onInstall?.(); onDismiss(); }}
                whileTap={TAP_SPRING}
                style={{
                  flex: 1, background: "var(--accent)", color: "#000", fontWeight: 600,
                  padding: "0.5rem 1rem", borderRadius: "9999px", border: "none",
                  fontSize: "0.8125rem", cursor: "pointer",
                }}
              >
                Installeer als app
              </motion.button>
              <motion.button
                onClick={onDismiss}
                whileTap={TAP_SPRING}
                style={{
                  background: "transparent", border: "1px solid var(--border)",
                  color: "var(--text2)", padding: "0.5rem 0.875rem",
                  borderRadius: "9999px", fontSize: "0.75rem", cursor: "pointer",
                }}
              >
                Sla over
              </motion.button>
            </>
          )}
        </div>

        {/* Step dots — iOS only */}
        {steps && (
          <div style={{ display: "flex", justifyContent: "center", gap: "0.375rem", marginTop: "0.75rem" }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                height: 3, width: i === step ? 18 : 5, borderRadius: 999,
                background: i === step ? "var(--accent)" : "var(--border)",
                transition: "width 300ms cubic-bezier(0.34,1.56,0.64,1), background 200ms ease",
              }} />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
