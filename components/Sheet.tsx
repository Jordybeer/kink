"use client";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  createContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import SheetBackdrop from "@/components/SheetBackdrop";
import { useMotionSafe } from "@/lib/motion";
import { useFocusTrap } from "@/lib/useFocusTrap";

const SheetCloseContext = createContext<(() => void) | null>(null);

interface SheetContentProps {
  children: ReactNode;
  className?: string;
  showHandle?: boolean;
  /** Kept for source compatibility; visible close actions belong in the footer. */
  showClose?: boolean;
}

/** Standardized sheet content wrapper: surface bg, border and optional drag handle. */
export function SheetContent({
  children,
  className = "px-6 pb-6 pt-4",
  showHandle = true,
}: SheetContentProps) {
  return (
    <div
      className={`rounded-t-2xl ${className}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none" }}
    >
      {showHandle && (
        <div className="h-7 mb-1" aria-hidden="true">
          <div
            className="h-1 w-10 mx-auto mt-2 rounded-full"
            style={{ background: "var(--border)" }}
          />
        </div>
      )}
      {children}
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  scrollable?: boolean;
  "aria-label"?: string;
}

export default function Sheet({ open, onClose, children, scrollable = false, "aria-label": ariaLabel }: Props) {
  const t = useMotionSafe();
  const y = useMotionValue(0);
  const backdropOpacity = useTransform(y, [0, 300], [1, 0]);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  useFocusTrap(sheetRef, open && mounted);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <SheetBackdrop
            onClick={onClose}
            transition={t.fast}
            dragOpacity={backdropOpacity}
          />

          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 151,
              y,
              touchAction: scrollable ? "auto" : "none",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: t.sheetExit }}
            transition={t.sheet}
            drag={scrollable ? false : "y"}
            dragConstraints={scrollable ? undefined : { top: 0 }}
            dragElastic={scrollable ? false : { top: 0.05, bottom: 0.3 }}
            onDragEnd={scrollable ? undefined : (_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onClose();
            }}
          >
            <SheetCloseContext.Provider value={onClose}>
              {children}
            </SheetCloseContext.Provider>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
