"use client";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import type { ReactNode } from "react";
import { TWEEN_FAST, TWEEN_SHEET, TWEEN_SHEET_EXIT, useMotionSafe } from "@/lib/motion";

/** Standardized sheet content wrapper: surface bg, border, rounded top, drag handle. */
export function SheetContent({ children, className = "px-6 pb-6 pt-4" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-t-2xl ${className}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none" }}
    >
      <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: "var(--border)" }} aria-hidden="true" />
      {children}
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  "aria-label"?: string;
}

export default function Sheet({ open, onClose, children, "aria-label": ariaLabel }: Props) {
  const t = useMotionSafe();
  const y = useMotionValue(0);
  const backdropOpacity = useTransform(y, [0, 300], [1, 0]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            aria-hidden="true"
            style={{
              position: "fixed", inset: 0, zIndex: 150,
              background: "rgba(0,0,0,0.6)",
              opacity: backdropOpacity,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={t.fast}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 151, y, touchAction: "none" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: t.sheetExit }}
            transition={t.sheet}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onClose();
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
