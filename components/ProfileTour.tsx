"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TAP_SPRING, useMotionSafe } from "@/lib/motion";

interface TourRect { top: number; left: number; width: number; height: number }

const STEPS = [
  {
    selector: '[data-tour="avatar"]',
    title: "Voeg een foto toe",
    body: "Tap de avatar om een profielfoto toe te voegen — bijgesneden en lokaal opgeslagen.",
    pad: 8,
  },
  {
    selector: '[data-tour="info"]',
    title: "Info over elke kink",
    body: "Tap ⓘ voor een beschrijving en veiligheidstips.",
    pad: 6,
  },
  {
    selector: '[data-tour="pills"]',
    title: "Jouw status",
    body: "Tap een pill om aan te geven hoe je over deze kink denkt — van Ja tot Harde grens.",
    pad: 4,
  },
  {
    selector: '[data-tour="hard-no"]',
    title: "Harde grens",
    body: "Staat apart van de rest — een harde grens is geen onderhandelingspositie.",
    pad: 4,
  },
];

interface Props { onComplete: () => void }

export default function ProfileTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [rects, setRects] = useState<(TourRect | null)[]>(STEPS.map(() => null));
  const t = useMotionSafe();

  useEffect(() => {
    let attempts = 0;
    function measure() {
      const measured = STEPS.map(s => {
        const el = document.querySelector(s.selector);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top, left: r.left, width: r.width, height: r.height };
      });
      if (measured.every(r => r !== null)) {
        setRects(measured as TourRect[]);
      } else if (attempts++ < 30) {
        requestAnimationFrame(measure);
      }
    }
    requestAnimationFrame(measure);

    function remeasure() { attempts = 0; setRects(STEPS.map(() => null)); requestAnimationFrame(measure); }
    window.addEventListener("scroll", remeasure, { passive: true });
    window.addEventListener("resize", remeasure, { passive: true });
    return () => {
      window.removeEventListener("scroll", remeasure);
      window.removeEventListener("resize", remeasure);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onComplete(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onComplete]);

  const current = STEPS[step];
  const rect = rects[step];
  const isLast = step === STEPS.length - 1;

  if (!rect) return null;

  const pad = current.pad;
  const spotTop = rect.top - pad;
  const spotLeft = rect.left - pad;
  const spotW = rect.width + pad * 2;
  const spotH = rect.height + pad * 2;

  const spaceBelow = window.innerHeight - (rect.top + rect.height + pad);
  const tooltipH = 180;
  const below = spaceBelow >= tooltipH + 16;
  const tipTop = below
    ? rect.top + rect.height + pad + 12
    : rect.top - pad - 12 - tooltipH;
  const tipLeft = Math.min(
    Math.max(rect.left - 16, 8),
    window.innerWidth - 300 - 8,
  );

  function advance() {
    if (isLast) onComplete();
    else setStep(s => s + 1);
  }

  return (
    <AnimatePresence>
      {/* Backdrop — click to skip */}
      <motion.div
        key="backdrop"
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: 400 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={t.fast}
        onClick={onComplete}
      />

      {/*
        Spotlight cutout.
        layout prop: Framer Motion animates position/size changes via CSS
        transforms internally — avoids reflow from top/left/width/height.
      */}
      <motion.div
        key="spotlight"
        layout
        style={{
          position: "fixed", zIndex: 401, pointerEvents: "none",
          top: spotTop, left: spotLeft, width: spotW, height: spotH,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.78)",
          borderRadius: 10,
          border: "2px solid rgba(255,255,255,0.25)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={t.modal}
      />

      {/* Tooltip card — re-enters per step */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-body"
          style={{
            position: "fixed", zIndex: 402,
            width: "min(18rem, calc(100vw - 1rem))",
            left: tipLeft, top: tipTop,
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "1.125rem 1.125rem 0.875rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
          initial={{ opacity: 0, y: below ? 8 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: below ? -4 : 4 }}
          transition={t.tooltip}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.375rem" }}>
            <h3 id="tour-title" style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600, color: "var(--text)" }}>
              {current.title}
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text2)", flexShrink: 0, marginLeft: "0.5rem", marginTop: "0.125rem" }}>
              {step + 1}/{STEPS.length}
            </span>
          </div>

          <p id="tour-body" style={{ margin: "0 0 1rem", fontSize: "0.8125rem", color: "var(--text2)", lineHeight: 1.6 }}>
            {current.body}
          </p>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <motion.button
              onClick={advance}
              whileTap={TAP_SPRING}
              style={{
                flex: 1, background: "var(--accent)", color: "var(--on-accent)", fontWeight: 600,
                padding: "0.5rem 1rem", borderRadius: "9999px", border: "none",
                fontSize: "0.8125rem", cursor: "pointer",
              }}
            >
              {isLast ? "Aan de slag 🖤" : "Volgende →"}
            </motion.button>
            <motion.button
              onClick={onComplete}
              whileTap={TAP_SPRING}
              style={{
                background: "transparent", border: "1px solid var(--border)",
                color: "var(--text2)", padding: "0.5rem 0.875rem",
                borderRadius: "9999px", fontSize: "0.75rem", cursor: "pointer",
              }}
            >
              Sla over
            </motion.button>
          </div>

          {/* Step dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: "0.375rem", marginTop: "0.75rem" }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                height: 3, width: i === step ? 18 : 5, borderRadius: 999,
                background: i === step ? "var(--accent)" : "var(--border)",
                transition: "width 300ms cubic-bezier(0.34,1.56,0.64,1), background 200ms ease",
              }} />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </AnimatePresence>
  );
}
