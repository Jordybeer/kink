"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import { TAP_SPRING, useMotionSafe } from "@/lib/motion";

export interface SpotlightStep {
  selector: string;
  scrollSelector?: string;
  title: string;
  body: string;
  pad?: number;
  scrollBlock?: ScrollLogicalPosition;
  offsetBelowNav?: boolean;
}

export type SpotlightTourExitReason = "completed" | "skipped" | "abandoned";

interface SpotlightTourProps {
  steps: readonly SpotlightStep[];
  onComplete: (reason: SpotlightTourExitReason) => void;
  finalLabel?: string;
  ariaIdPrefix: string;
}

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

export default function SpotlightTour({
  steps,
  onComplete,
  finalLabel = "Aan de slag",
  ariaIdPrefix,
}: SpotlightTourProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<TourRect | null>(null);
  const [viewport, setViewport] = useState({ width: 390, height: 844 });
  const [dialogHeight, setDialogHeight] = useState(190);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const focusRestoredRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const t = useMotionSafe();
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const titleId = `${ariaIdPrefix}-title`;
  const bodyId = `${ariaIdPrefix}-body`;

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const restorePreviousFocus = useCallback(() => {
    if (focusRestoredRef.current) return;
    focusRestoredRef.current = true;
    const previous = previouslyFocusedRef.current;
    if (previous?.isConnected) previous.focus();
  }, []);

  const finishTour = useCallback((reason: SpotlightTourExitReason) => {
    onCompleteRef.current(reason);
    requestAnimationFrame(restorePreviousFocus);
  }, [restorePreviousFocus]);

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
    if (!current) {
      finishTour("abandoned");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function abandonMissingStep() {
      if (cancelled) return;
      if (step >= steps.length - 1) finishTour("abandoned");
      else setStep((currentStep) => Math.min(currentStep + 1, steps.length - 1));
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
      const scrollTarget = document.querySelector(current.scrollSelector ?? current.selector) as HTMLElement | null;
      if (!scrollTarget) {
        retry(positionTarget);
        return;
      }

      attempts = 0;
      scrollTarget.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: current.scrollBlock ?? "center",
      });

      const settleDelay = reducedMotion ? 0 : 260;
      timer = setTimeout(() => {
        if (cancelled) return;

        if (current.offsetBelowNav) {
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
        }

        timer = setTimeout(measure, settleDelay);
      }, settleDelay);
    }

    setRect(null);
    positionTarget();

    function remeasure() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      requestAnimationFrame(measure);
    }

    document.addEventListener("scroll", remeasure, true);
    window.addEventListener("resize", remeasure, { passive: true });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
      document.removeEventListener("scroll", remeasure, true);
      window.removeEventListener("resize", remeasure);
    };
  }, [current, step, steps]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        finishTour("skipped");
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
    if (!rect || !current) return null;

    const pad = current.pad ?? 6;
    const width = Math.min(288, viewport.width - 16);
    const belowTop = rect.top + rect.height + pad + DIALOG_GAP;
    const aboveBottom = rect.top - pad - DIALOG_GAP;
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
  }, [current, dialogHeight, rect, viewport]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !rect || !current) return;
    const measuredHeight = Math.ceil(dialog.scrollHeight);
    setDialogHeight((previous) => Math.abs(previous - measuredHeight) > 1 ? measuredHeight : previous);
  }, [current, rect, step, viewport.width]);

  if (!current || !rect || !placement) return null;

  const pad = current.pad ?? 6;
  const spotTop = rect.top - pad;
  const spotLeft = rect.left - pad;
  const spotWidth = rect.width + pad * 2;
  const spotHeight = rect.height + pad * 2;

  function advance() {
    if (isLast) finishTour("completed");
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
        onClick={() => finishTour("skipped")}
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
          aria-labelledby={titleId}
          aria-describedby={bodyId}
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
          <div className="flex items-start justify-between mb-1.5">
            <h3 id={titleId} className="m-0 text-[0.9375rem] font-semibold" style={{ color: "var(--text)" }}>
              {current.title}
            </h3>
            <span className="ml-2 mt-0.5 flex-none text-xs" style={{ color: "var(--text2)" }}>
              {step + 1}/{steps.length}
            </span>
          </div>

          <p id={bodyId} className="mb-4 text-[0.8125rem] leading-relaxed" style={{ color: "var(--text2)" }}>
            {current.body}
          </p>

          <div className="flex items-center gap-2">
            <motion.button
              ref={focusPrimaryAction}
              type="button"
              onClick={advance}
              whileTap={TAP_SPRING}
              className="focus-ring flex-1 rounded-full px-4 py-2 text-[0.8125rem] font-semibold"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              {isLast
                ? finalLabel
                : <span className="inline-flex items-center gap-1">Volgende <ArrowRight size={14} aria-hidden="true" /></span>}
            </motion.button>
            <motion.button
              type="button"
              onClick={() => finishTour("skipped")}
              whileTap={TAP_SPRING}
              className="focus-ring rounded-full px-3.5 py-2 text-xs"
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              Sla over
            </motion.button>
          </div>

          {steps.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
              {steps.map((_, index) => (
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
          )}
        </motion.div>
      </AnimatePresence>
    </AnimatePresence>
  );
}
