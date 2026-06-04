"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TAP_SPRING, useMotionSafe } from "@/lib/motion";

export default function UpdateBanner() {
  const t = useMotionSafe();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      if (reg.waiting) { setWaiting(reg.waiting); return; }
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(installing);
          }
        });
      });
    });
  }, []);

  function applyUpdate() {
    if (!waiting) return;
    waiting.postMessage({ type: "SKIP_WAITING" });
    waiting.addEventListener("statechange", () => {
      if (waiting.state === "activated") window.location.reload();
    });
    setWaiting(null);
  }

  return (
    <AnimatePresence>
      {waiting && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={t.fast}
          className="fixed bottom-4 left-4 right-4 z-[500] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg max-w-sm mx-auto"
          style={{ background: "var(--surface2)", border: "1px solid var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)" }}
        >
          <span className="flex-1 text-sm" style={{ color: "var(--text2)" }}>
            Nieuwe versie beschikbaar
          </span>
          <motion.button
            onClick={applyUpdate}
            whileTap={TAP_SPRING}
            className="focus-ring text-sm font-semibold flex-none px-3 py-1.5 rounded-lg"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            Herladen
          </motion.button>
          <button
            onClick={() => setWaiting(null)}
            className="focus-ring text-xs flex-none"
            style={{ color: "var(--text2)" }}
            aria-label="Sluiten"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
