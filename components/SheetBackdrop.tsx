"use client";

import { motion, type MotionValue, type Transition } from "framer-motion";

export const SHEET_BACKDROP_STYLE = {
  background: "var(--scrim-strong)",
  WebkitBackdropFilter: "blur(8px)",
  backdropFilter: "blur(8px)",
} as const;

interface SheetBackdropProps {
  onClick?: () => void;
  transition: Transition;
  zIndex?: number;
  dragOpacity?: number | MotionValue<number>;
}

/**
 * Shared modal/sheet backdrop. The outer layer owns enter/exit fading while
 * the inner layer owns drag-linked dimming, so Framer never has two writers
 * fighting over the same opacity value.
 */
export default function SheetBackdrop({
  onClick,
  transition,
  zIndex = 150,
  dragOpacity = 1,
}: SheetBackdropProps) {
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-0"
      style={{ zIndex }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
      onClick={onClick}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ ...SHEET_BACKDROP_STYLE, opacity: dragOpacity }}
      />
    </motion.div>
  );
}
