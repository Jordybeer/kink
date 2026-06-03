"use client";
import { useReducedMotion } from "framer-motion";

// ─── Transition presets ────────────────────────────────────────────────────────

export const TWEEN_FAST = { duration: 0.22, ease: "easeOut" } as const;
export const TWEEN_SHEET = { type: "tween" as const, ease: "easeOut" as const, duration: 0.28 } as const;
export const TWEEN_SHEET_EXIT = { type: "tween" as const, ease: "easeIn" as const, duration: 0.22 } as const;
export const TWEEN_SLIDE = { duration: 0.22, ease: "easeInOut" } as const;

export const SPRING_MODAL = { type: "spring" as const, damping: 28, stiffness: 260 } as const;
export const SPRING_TOOLTIP = { type: "spring" as const, damping: 30, stiffness: 300 } as const;

// Semantic aliases
export const ENTER_SPRING = SPRING_MODAL;
export const EXIT_SPRING = TWEEN_SHEET_EXIT;

// whileTap value — use on motion.button / motion.div interactive elements
export const TAP_SPRING = { scale: 0.96 } as const;

// ─── Stagger variant ──────────────────────────────────────────────────────────

export const STAGGER_CHILDREN = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
} as const;

// ─── Variant factories ────────────────────────────────────────────────────────

export const fadeUp = (distance = 10) => ({
  hidden: { opacity: 0, y: distance },
  show:   { opacity: 1, y: 0, transition: TWEEN_FAST },
});

export const fadeIn = () => ({
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: TWEEN_FAST },
});

export const scaleIn = () => ({
  hidden: { opacity: 0, scale: 0.95 },
  show:   { opacity: 1, scale: 1, transition: SPRING_MODAL },
});

// ─── Reduced-motion hook ──────────────────────────────────────────────────────

const INSTANT = { duration: 0 } as const;

/**
 * Returns transition presets that collapse to {duration:0} when the user
 * has requested reduced motion via `prefers-reduced-motion: reduce`.
 */
export function useMotionSafe() {
  const reduced = useReducedMotion();
  return {
    fast:      reduced ? INSTANT : TWEEN_FAST,
    sheet:     reduced ? INSTANT : TWEEN_SHEET,
    sheetExit: reduced ? INSTANT : TWEEN_SHEET_EXIT,
    slide:     reduced ? INSTANT : TWEEN_SLIDE,
    modal:     reduced ? INSTANT : SPRING_MODAL,
    tooltip:   reduced ? INSTANT : SPRING_TOOLTIP,
    enter:     reduced ? INSTANT : ENTER_SPRING,
    exit:      reduced ? INSTANT : EXIT_SPRING,
  };
}
