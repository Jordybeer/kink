"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import { TAP_SPRING, useMotionSafe } from "@/lib/motion";

interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const MAX_TARGET_ATTEMPTS = 40;
const DIALOG_MARGIN = 12;
const DIALOG_GAP = 12;
const MIN_SIDE_SPACE = 120;
const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const STEPS = [
  {
    selector: '[data-tour="avatar"]',
    scrollSelector: '[data-tour="avatar"]',
    title: "Voeg een foto toe",
    body: "Tik de avatar om een profielfoto toe te voegen — bijgesneden en lokaal opgeslagen.",
    pad: 8,
  },
  {
    selector: '[data-tour="kink-card"]',
    scrollSelector: '[data-tour="kink-card"]',
    title: "Beoordeel de volledige kink",
    body: "De hele kaart hoort bij één onderwerp. Kies daar hoe het voor jou voelt — van Heel graag tot Harde grens.",
    pad: 6,
  },
  {
    selector: '[data-tour="curious"]',
    scrollSelector: '[data-tour="kink-card"]',
    title: "Nieuwsgierig?",
    body: "Los van je oordeel: markeer met de ster wat je wil verkennen. Een ster is geen ja.",
    pad: 6,
  },
  {
    selector: '[data-tour="private"]',
    scrollSelector: '[data-tour="kink-card"]',
    title: "Verberg je antwoord",
    body: "Tik ‘Verberg’ voor of na je keuze. Alleen de kinknaam blijft zichtbaar tot je het antwoord bewust onthult.",
    pad: 6,
  },
] as const;

interface Props {
  onComplete: () => void;
}

export default function ProfileTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<TourRect | null>(null);
  const [viewport, setViewport] = useState({ width: 390, height: 844 });
  const [dialogHeight, setDialogHeight] = useState(190);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const focusRestoredRef = useRef(false);
  const t = useMotionSafe();
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const restorePreviousFocus = useCallback(() => {
    if (focusRestoredRef.current) return;
    focusRestoredRef.current = true;
    const previous = previouslyFocusedRef.current;
    if (previous?.isConnected) previous.focus();
  }, []);

  const finishTour = useCallback(() => {
    onComplete();
    requestAnimationFrame(restorePreviousFocus);
  }, [onComplete, restorePreviousFocus]);

  const focusPrimaryAction = useCallback((node: HTMLButtonElement | null) => {
    if (!node) return;
    requestAnimationFrame(() => {
      if (node.isConnected) node.focus();
    });
  }, []);

  useEffect(() => {
    focusRestoredRef.current = false;
    const active = document.activeElement;
    previouslyFocusedRef.current = active instanceof HTMLElement ? active : null;
    return restorePreviousFocus;
  }, [restorePreviousFocus]);

  useEffect(() => {
    setViewport({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function abandonMissingStep() {
      if (cancelled) return;
      if (step >= STEPS.length - 1) finishTour();
      else setStep((currentStep) => Math.min(currentStep + 1, STEPS.length - 1));
    }

    function retry(callback: () => void) {
      if (cancelled || retryTimer) return;
      attempts += 1;
      if (attempts >= MAX_TARGET_ATTEMPTS) {
        abandonMissingStep();
        return;
      }
      retryTimer = setTimeout(() => {
        retryTimer = null;
        callback();
      }, 50);
    }

    function measure() {
      if (cancelled) return;
      const element = document.querySelector(current.selector);
      if (!element) {
        retry(measure);
        return;
      }
      attempts = 0;
      const bounds = element.getBoundingClientRect();
      setRect({
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height,
      });
    }

    function positionTarget() {
      if (cancelled) return;
      const scrollTarget = document.querySelector(current.scrollSelector) as HTMLElement | null;
      if (!scrollTarget) {
        retry(positionTarget);
        return;
      }

      attempts = 0;
      if (step === 1) {
        scrollTarget.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "start",
        });
        timer = setTimeout(() => {
          if (cancelled) return;
          const navHeight = Number.parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue("--nav-h"),
          ) || 56;
          const bounds = scrollTarget.getBoundingClientRect();
          const correction = bounds.top - navHeight - 14;
          if (Math.abs(correction) > 2) {
            window.scrollBy({
              top: correction,
              behavior: reducedMotion ? "auto" : "smooth",
            });
          }
          timer = setTimeout(measure, reducedMotion ? 0 : 260);
        }, reducedMotion ? 0 : 260);
      } else {
        scrollTarget.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "center",
        });
        timer = setTimeout(measure, reducedMotion ? 0 : 260);
      }
    }

    setRect(null);
    positionTarget();

    function remeasure() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      requestAnimationFrame(measure);
    }

    window.addEventListener("scroll", remeasure, { passive: true });
    window.addEventListener("resize", remeasure, { passive: true });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener("scroll", remeasure);
      window.removeEventListener("resize", remeasure);
    };
  }, [current, finishTour, step]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        finishTour();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => element.getAttribute("aria-hidden") !== "true");

      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const focusIsInside = active instanceof Node && dialog.contains(active);

      if (event.shiftKey && (!focusIsInside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!focusIsInside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finishTour]);

  const placement = useMemo(() => {
    if (!rect) return null;

    const width = Math.min(288, viewport.width - 16);
    const belowTop = rect.top + rect.height + current.pad + DIALOG_GAP;
    const aboveBottom = rect.top - current.pad - DIALOG_GAP;
    const spaceBelow = Math.max(0, viewport.height - DIALOG_MARGIN - belowTop);
    const spaceAbove = Math.max(0, aboveBottom - DIALOG_MARGIN);

    let below: boolean;
    let top: number;
    let maxHeight: number;

    if (spaceBelow >= dialogHeight) {
      below = true;
      top = belowTop;
      maxHeight = spaceBelow;
    } else if (spaceAbove >= dialogHeight) {
      below = false;
      top = Math.max(DIALOG_MARGIN, aboveBottom - dialogHeight);
      maxHeight = spaceAbove;
    } else if (Math.max(spaceBelow, spaceAbove) >= MIN_SIDE_SPACE) {
      below = spaceBelow >= spaceAbove;
      maxHeight = below ? spaceBelow : spaceAbove;
      top = below ? belowTop : DIALOG_MARGIN;
    } else {
      below = rect.top < viewport.height / 2;
      top = DIALOG_MARGIN;
      maxHeight = Math.max(1, viewport.height - DIALOG_MARGIN * 2);
    }

    const left = Math.min(
      Math.max(rect.left - 8, 8),
      viewport.width - width - 8,
    );

    return {
      top,
      left,
      width,
      below,
      maxHeight,
      constrained: dialogHeight > maxHeight,
    };
  }, [current.pad, dialogHeight, rect, viewport]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !rect) return;
    const measuredHeight = Math.ceil(dialog.scrollHeight);
    setDialogHeight((previous) => Math.abs(previous - measuredHeight) > 1 ? measuredHeight : previous);
  }, [current.body, current.title, rect, step, viewport.width]);

  if (!rect || !placement) return null;

  const spotTop = rect.top - current.pad;
  const spotLeft = rect.left - current.pad;
  const spotWidth = rect.width + current.pad * 2;
  const spotHeight = rect.height + current.pad * 2;

  function advance() {
    if (isLast) finishTour();
    else setStep((currentStep) => currentStep + 1);
  }

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: 400 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={t.fast}
        onClick={finishTour}
      />

      <motion.div
        key="spotlight"
        layout
        style={{
          position: "fixed",
          zIndex: 401,
          pointerEvents: "none",
          top: spotTop,
          left: spotLeft,
          width: spotWidth,
          height: spotHeight,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.78)",
          borderRadius: 12,
          border: "2px solid rgba(255,255,255,0.25)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={t.modal}
      />

      <AnimatePresence mode="wait">
        <motion.div
          ref={dialogRef}
          key={step}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-body"
          tabIndex={-1}
          style={{
            position: "fixed",
            zIndex: 402,
            width: placement.width,
            left: placement.left,
            top: placement.top,
            maxHeight: placement.maxHeight,
            overflowY: placement.constrained ? "auto" : "visible",
            overscrollBehavior: "contain",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "1.125rem 1.125rem 0.875rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
          initial={{ opacity: 0, y: placement.below ? 8 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: placement.below ? -4 : 4 }}
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
              ref={focusPrimaryAction}
              onClick={advance}
              whileTap={TAP_SPRING}
              style={{
                flex: 1,
                background: "var(--accent)",
                color: "var(--on-accent)",
                fontWeight: 600,
                padding: "0.5rem 1rem",
                borderRadius: "9999px",
                border: "none",
                fontSize: "0.8125rem",
                cursor: "pointer",
              }}
            >
              {isLast ? "Aan de slag" : <span className="inline-flex items-center gap-1">Volgende <ArrowRight size={14} aria-hidden="true" /></span>}
            </motion.button>
            <motion.button
              onClick={finishTour}
              whileTap={TAP_SPRING}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text2)",
                padding: "0.5rem 0.875rem",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              Sla over
            </motion.button>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "0.375rem", marginTop: "0.75rem" }}>
            {STEPS.map((_, index) => (
              <div
                key={index}
                style={{
                  height: 3,
                  width: index === step ? 18 : 5,
                  borderRadius: 999,
                  background: index === step ? "var(--accent)" : "var(--border)",
                  transition: "width 300ms cubic-bezier(0.34,1.56,0.64,1), background 200ms ease",
                }}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </AnimatePresence>
  );
}
