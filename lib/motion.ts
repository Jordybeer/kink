"use client";
import { useSyncExternalStore } from "react";

// ─── Transition presets ────────────────────────────────────────────────────────

export const TWEEN_FAST = { duration: 0.22, ease: [0.16, 1, 0.3, 1] } as const;
export const TWEEN_STATE = { duration: 0.19, ease: [0.16, 1, 0.3, 1] } as const;
export const TWEEN_DISCLOSURE = { duration: 0.22, ease: [0.16, 1, 0.3, 1] } as const;
export const TWEEN_SHEET = { type: "tween" as const, ease: [0.16, 1, 0.3, 1], duration: 0.28 } as const;
export const TWEEN_SHEET_EXIT = { type: "tween" as const, ease: "easeIn" as const, duration: 0.22 } as const;
export const TWEEN_SLIDE = { duration: 0.22, ease: "easeInOut" } as const;

export const SPRING_MODAL = { type: "spring" as const, damping: 28, stiffness: 260 } as const;
export const SPRING_TOOLTIP = { type: "spring" as const, damping: 30, stiffness: 300 } as const;

// whileTap value — use on motion.button / motion.div interactive elements
export const TAP_SPRING = { scale: 0.985, transition: { duration: 0.14, ease: [0.16, 1, 0.3, 1] } } as const;

// Shake keyframe duration (PIN wrong-entry animation)
export const SHAKE_ANIM = { duration: 0.4 } as const;

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

// ─── Reduced-motion hook ──────────────────────────────────────────────────────

const INSTANT = { duration: 0 } as const;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Framer's hook captures only the mount-time preference. Keep live OS changes in sync. */
export function useReducedMotionPreference() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    // Hydration starts still; content and interaction semantics are immediately available.
    () => true,
  );
}

/**
 * Shared motion contract for interactive components.
 *
 * Motion is presentation-only: reduced-motion collapses timed transitions to an
 * instant state change and disables press scaling entirely. Consumers must never
 * rely on animation completion for navigation, persistence, consent, or focus.
 */
export function useMotionSafe() {
  const reduced = useReducedMotionPreference();
  return {
    reduced,
    tap:       reduced ? undefined : TAP_SPRING,
    fast:      reduced ? INSTANT : TWEEN_FAST,
    state:     reduced ? INSTANT : TWEEN_STATE,
    disclosure: reduced ? INSTANT : TWEEN_DISCLOSURE,
    sheet:     reduced ? INSTANT : TWEEN_SHEET,
    sheetExit: reduced ? INSTANT : TWEEN_SHEET_EXIT,
    slide:     reduced ? INSTANT : TWEEN_SLIDE,
    modal:     reduced ? INSTANT : SPRING_MODAL,
    tooltip:   reduced ? INSTANT : SPRING_TOOLTIP,
    enter:     reduced ? INSTANT : SPRING_MODAL,
    exit:      reduced ? INSTANT : TWEEN_SHEET_EXIT,
  };
}
