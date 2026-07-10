"use client";
import { motion, AnimatePresence } from "framer-motion";
import { ShareNetwork, PlusSquare, Check, WifiSlash, DeviceMobile, Lightning } from "@phosphor-icons/react";
import { TAP_SPRING, useMotionSafe } from "@/lib/motion";

interface Props {
  isIos: boolean;
  onInstall?: () => void;
  onDismiss: () => void;
}

const IOS_STEPS = [
  {
    icon: ShareNetwork,
    title: "Tap het deel-icoon",
    body: "□↑ in de Safari-navigatiebalk onderin.",
  },
  {
    icon: PlusSquare,
    title: "Zet op beginscherm",
    body: "Scroll omlaag en tik 'Zet op beginscherm'.",
  },
  {
    icon: Check,
    title: "Tap 'Voeg toe'",
    body: "Bevestig rechtsboven — klaar.",
  },
];

const FEATURES = [
  { icon: WifiSlash,    label: "Werkt offline" },
  { icon: DeviceMobile, label: "Geen adresbalk" },
  { icon: Lightning,        label: "Razendsnel" },
];

export default function PwaInstallGuide({ isIos, onInstall, onDismiss }: Props) {
  const t = useMotionSafe();

  return (
    <AnimatePresence>
      {/* Scrim */}
      <motion.div
        key="pwa-backdrop"
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: 400, background: "var(--scrim)" }}
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
          bottom: 0, left: 0, right: 0,
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
        <div style={{ margin: "0.75rem auto 0", width: "2.5rem", height: "0.25rem", borderRadius: 999, background: "var(--border)" }} />

        {/* App icon + heading */}
        <div style={{ padding: "1.5rem 1.5rem 0", textAlign: "center" }}>
          <motion.img
            src={isIos ? "/apple-touch-icon.png" : "/icon-192.png"}
            alt=""
            aria-hidden="true"
            width={64}
            height={64}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.08 }}
            style={{ borderRadius: "1rem", marginBottom: "0.875rem", boxShadow: "0 4px 20px rgba(0,0,0,0.35)" }}
          />
          <h2 style={{ margin: 0, fontSize: "1.1875rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>
            {isIos ? "Installeer KinkSync" : "Altijd bij de hand"}
          </h2>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.8125rem", color: "var(--text2)", lineHeight: 1.5 }}>
            {isIos
              ? "Drie tikken in Safari — dan staat de app op je beginscherm."
              : "Voeg KinkSync toe aan je beginscherm voor de volledige app-ervaring."}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: "1.25rem 1.5rem 0" }}>
          {isIos ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {IOS_STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.07, duration: 0.28, ease: "easeOut" }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.875rem",
                      background: "color-mix(in srgb, var(--accent) 6%, var(--surface))",
                      border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)",
                      borderRadius: "0.875rem",
                      padding: "0.75rem 1rem",
                    }}
                  >
                    <div style={{
                      flexShrink: 0,
                      width: "2rem", height: "2rem",
                      borderRadius: "9999px",
                      background: "var(--accent)",
                      color: "var(--on-accent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={14} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)" }}>{s.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text2)", lineHeight: 1.4 }}>{s.body}</div>
                    </div>
                    <div style={{
                      flexShrink: 0, marginLeft: "auto",
                      fontSize: "0.6875rem", fontWeight: 700,
                      color: "var(--text2)", opacity: 0.5,
                    }}>
                      {i + 1}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div>
              <div style={{
                display: "flex", justifyContent: "center", gap: "0.75rem",
                marginBottom: "1rem",
              }}>
                {FEATURES.map(({ icon: Icon, label }) => (
                  <div key={label} style={{
                    flex: 1,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem",
                    background: "color-mix(in srgb, var(--accent) 6%, var(--surface))",
                    border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)",
                    borderRadius: "0.875rem",
                    padding: "0.875rem 0.5rem",
                  }}>
                    <Icon size={18} style={{ color: "var(--accent)" }} />
                    <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text2)", textAlign: "center", lineHeight: 1.3 }}>{label}</span>
                  </div>
                ))}
              </div>
              <p style={{
                margin: 0, fontSize: "0.8125rem", color: "var(--text2)",
                lineHeight: 1.6, textAlign: "center",
              }}>
                Geen browser, geen afleiding — gewoon de app.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ padding: "1.25rem 1.5rem 0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <motion.button
            whileTap={TAP_SPRING}
            onClick={isIos ? onDismiss : () => { onInstall?.(); onDismiss(); }}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, var(--accent), var(--accent2, var(--accent)))",
              color: "var(--on-accent)",
              fontWeight: 700,
              padding: "0.9375rem 1.5rem",
              borderRadius: "9999px",
              border: "none",
              fontSize: "0.9375rem",
              cursor: "pointer",
              letterSpacing: "-0.01em",
            }}
          >
            {isIos ? "Klaar 🖤" : "Zet op startscherm"}
          </motion.button>

          <button
            onClick={onDismiss}
            style={{
              background: "none", border: "none",
              color: "var(--text2)", fontSize: "0.8125rem",
              cursor: "pointer", padding: "0.5rem 1rem",
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
