"use client";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { X } from "@phosphor-icons/react";
import {
  createContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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
  style?: CSSProperties;
  "data-testid"?: string;
}

/** Standardized sheet content wrapper: surface bg, border and optional drag handle. */
export function SheetContent({
  children,
  className = "px-6 pb-6 pt-4",
  showHandle = true,
  style,
  "data-testid": dataTestId,
}: SheetContentProps) {
  return (
    <div
      className={`rounded-t-2xl ${className}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none", ...style }}
      data-testid={dataTestId}
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
  title?: string;
  scrollable?: boolean;
  "aria-label"?: string;
}

function TitledSheetFrame({
  title,
  onClose,
  scrollable,
  children,
}: {
  title: string;
  onClose: () => void;
  scrollable: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={scrollable
        ? "flex max-h-[calc(var(--visual-viewport-height,100dvh)-env(safe-area-inset-top))] flex-col overflow-hidden rounded-t-3xl px-4 pt-3"
        : "rounded-t-3xl px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-3"}
      style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
    >
      <div className="mb-1 h-7" aria-hidden="true">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full" style={{ background: "var(--surface3)" }} />
      </div>
      <div className="mb-4 flex min-h-11 items-center gap-2 px-1">
        <h2 className="min-w-0 flex-1 text-lg font-bold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={`${title} sluiten`}
          className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-full"
          style={{ color: "var(--text2)" }}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {scrollable ? (
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(2.5rem+env(safe-area-inset-bottom))]"
          data-testid="sheet-scroll-body"
        >
          {children}
        </div>
      ) : children}
    </div>
  );
}

export default function Sheet({ open, onClose, children, title, scrollable = false, "aria-label": ariaLabel }: Props) {
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
            aria-label={ariaLabel ?? title}
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
              {title
                ? <TitledSheetFrame title={title} onClose={onClose} scrollable={scrollable}>{children}</TitledSheetFrame>
                : children}
            </SheetCloseContext.Provider>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
