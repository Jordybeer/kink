"use client";
import { motion, AnimatePresence } from "framer-motion";
import { TAP_SPRING, useMotionSafe } from "@/lib/motion";
import Wordmark from "@/components/Wordmark";

interface Props {
  isIos: boolean;
  onInstall?: () => void;
  onDismiss: () => void;
}

const IOS_STEPS = [
  {
    n: "1",
    title: "Tap het deel-icoon",
    body: "Tap □↑ in de Safari-navigatiebalk onderin.",
  },
  {
    n: "2",
    title: "Kies 'Zet op beginscherm'",
    body: "Scroll omlaag in het menu en tik 'Zet op beginscherm'.",
  },
  {
    n: "3",
    title: "Tap 'Voeg toe'",
    body: "Bevestig rechtsboven — KinkSync staat dan klaar op je startscherm.",
  },
];

export default function PwaInstallGuide({ isIos, onInstall, onDismiss }: Props) {
  const t = useMotionSafe();

  return (
    <AnimatePresence>
      {/* Scrim */}
      <motion.div
        key="pwa-backdrop"
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "var(--scrim)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={t.fast}
        onClick={onDismiss}
      />

      {/* Sheet */}
      <motion.div
        key="pwa-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="KinkSync installeren"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 401,
          background: "var(--surface2)",
          borderRadius: "1.25rem 1.25rem 0 0",
          boxShadow: "0 -8px 48px rgba(0,0,0,0.55), 0 0 0 1px var(--border)",
          paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
          maxHeight: "80dvh",
          overflowY: "auto",
        }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={t.modal}
      >
        {/* Drag handle */}
        <div style={{
          margin: "0.75rem auto 0",
          width: "2.5rem", height: "0.25rem",
          borderRadius: 999,
          background: "var(--border)",
        }} />

        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem 0", textAlign: "center" }}>
          <div style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "0.06em", color: "var(--text)" }}>
            <Wordmark />
          </div>
          <p style={{ margin: "0.375rem 0 0", fontSize: "0.8125rem", color: "var(--text2)", lineHeight: 1.5 }}>
            {isIos
              ? "Volg drie stappen in Safari om de app te installeren."
              : "Geen browserbalk. Werkt offline. Altijd bij de hand."}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: "1.25rem 1.5rem 0" }}>
          {isIos ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {IOS_STEPS.map((s, i) => (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.28, ease: "easeOut" }}
                  style={{
                    display: "flex",
                    gap: "0.875rem",
                    alignItems: "flex-start",
                    background: "color-mix(in srgb, var(--accent) 6%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
                    borderLeft: "2px solid var(--accent)",
                    borderRadius: "0.75rem",
                    padding: "0.75rem 1rem",
                    boxShadow: "-3px 0 12px var(--accent-glow)",
                  }}
                >
                  <span style={{
                    flexShrink: 0,
                    width: "1.375rem", height: "1.375rem",
                    borderRadius: "9999px",
                    background: "var(--accent)",
                    color: "var(--on-accent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.6875rem", fontWeight: 700,
                    marginTop: "0.0625rem",
                  }}>
                    {s.n}
                  </span>
                  <div>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.1875rem" }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text2)", lineHeight: 1.5 }}>
                      {s.body}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div style={{
              background: "color-mix(in srgb, var(--accent) 6%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
              borderLeft: "2px solid var(--accent)",
              borderRadius: "0.75rem",
              padding: "1rem 1.125rem",
              boxShadow: "-3px 0 12px var(--accent-glow)",
              fontSize: "0.8125rem", color: "var(--text2)", lineHeight: 1.6,
            }}>
              Werkt als een echte app — geen adresbalk, geen browser, geen afleiding.
              Altijd bereikbaar vanaf je startscherm.
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ padding: "1.25rem 1.5rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.625rem" }}>
          <motion.button
            whileTap={TAP_SPRING}
            onClick={isIos ? onDismiss : () => { onInstall?.(); onDismiss(); }}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              color: "var(--on-accent)",
              fontWeight: 600,
              padding: "0.875rem 1.5rem",
              borderRadius: "9999px",
              border: "none",
              fontSize: "0.9375rem",
              cursor: "pointer",
            }}
          >
            {isIos ? "Klaar 🖤" : "Zet op startscherm"}
          </motion.button>

          <button
            onClick={onDismiss}
            style={{
              background: "none",
              border: "none",
              color: "var(--text2)",
              fontSize: "0.8125rem",
              cursor: "pointer",
              padding: "0.5rem 1rem",
              minHeight: "44px",
            }}
          >
            Misschien later
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
