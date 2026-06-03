/** Shared Framer Motion transition presets — import instead of defining per-component */

export const SPRING_MODAL = {
  type: "spring" as const,
  damping: 28,
  stiffness: 260,
} as const;

export const SPRING_TOOLTIP = {
  type: "spring" as const,
  damping: 30,
  stiffness: 300,
} as const;

export const TWEEN_SHEET = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.28,
} as const;

export const TWEEN_FAST = {
  duration: 0.22,
  ease: "easeOut" as const,
} as const;
