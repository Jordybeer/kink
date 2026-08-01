"use client";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";
import { useMotionSafe } from "@/lib/motion";
import { useFocusTrap } from "@/lib/useFocusTrap";

const SheetCloseContext = createContext<(() => void) | null>(null);

/** Standardized sheet content wrapper: surface bg, border, rounded top, optional drag handle. */
export function SheetContent({
  children,
  className = "px-6 pb-6 pt-4",
  showHandle = true,
  showClose = showHandle,
}: {
  children: ReactNode;
  className?: string;
  showHandle?: boolean;
  showClose?: boolean;
}) {
  const onClose = useContext(SheetCloseContext);
  const showUtilityRow = showHandle || (showClose && onClose);

  return (
    <div
      className={`rounded-t-2xl ${className}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none" }}
    >
      {showUtilityRow && (
        <div className="relative h-11 mb-2">
          {showHandle && (
            <div
              className="absolute left-1/2 top-3 h-1 w-10 -translate-x-1/2 rounded-full"
              style={{ background: "var(--border)" }}
              aria-hidden="true"
            />
          )}
          {showClose && onClose && (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onClose}
              aria-label="Sluit venster"
              className="focus-ring absolute right-0 top-0 inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold"
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                color: "var(--text2)",
              }}
            >
              <X size={15} weight="bold" aria-hidden="true" />
              Sluiten
            </button>
          )}
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
          <motion.div
            aria-hidden="true"
            className="fixed inset-0 z-[150]"
            style={{ background: "var(--scrim)", opacity: backdropOpacity }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={t.fast}
            onClick={onClose}
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
