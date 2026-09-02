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

export type SheetVariant = "sheet" | "task" | "surface";

interface SheetContentProps {
  children: ReactNode;
  className?: string;
  showHandle?: boolean;
  /** Kept for source compatibility; visible close actions belong in the footer. */
  showClose?: boolean;
  style?: CSSProperties;
  "data-testid"?: string;
}

/** Standardized quick-sheet content wrapper: surface bg, border and optional drag handle. */
export function SheetContent({
  children,
  className = "px-6 pb-6 pt-4",
  showHandle = true,
  style,
  "data-testid": dataTestId,
}: SheetContentProps) {
  return (
    <div
      className={`min-w-0 max-w-full overflow-x-clip rounded-t-2xl ${className}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none", ...style }}
      data-testid={dataTestId}
    >
      {showHandle && (
        <div className="h-7 mb-1" aria-hidden="true" data-sheet-handle>
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
  variant?: SheetVariant;
  "aria-label"?: string;
}

function TitledSheetFrame({
  title,
  onClose,
  scrollable,
  variant,
  children,
}: {
  title: string;
  onClose: () => void;
  scrollable: boolean;
  variant: SheetVariant;
  children: ReactNode;
}) {
  const quickSheet = variant === "sheet";
  const surface = variant === "surface";

  const frameClassName = quickSheet
    ? scrollable
      ? "flex max-h-[calc(var(--visual-viewport-height,100dvh)-env(safe-area-inset-top))] flex-col overflow-hidden rounded-t-3xl px-4 pt-3"
      : "rounded-t-3xl px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-3"
    : surface
      ? "flex h-[calc(var(--visual-viewport-height,100dvh)-env(safe-area-inset-top)-0.5rem)] max-h-[calc(var(--visual-viewport-height,100dvh)-env(safe-area-inset-top)-0.5rem)] flex-col overflow-hidden rounded-t-xl border border-b-0 px-4 pt-2 sm:h-auto sm:max-h-[min(760px,calc(100dvh-3rem))] sm:rounded-2xl sm:border-b sm:pt-3"
      : "flex max-h-[calc(var(--visual-viewport-height,100dvh)-env(safe-area-inset-top)-1rem)] flex-col overflow-hidden rounded-t-2xl border border-b-0 px-4 pt-3 sm:max-h-[min(720px,calc(100dvh-3rem))] sm:rounded-2xl sm:border-b";

  return (
    <div
      className={frameClassName}
      style={quickSheet
        ? { background: "var(--surface)", borderTop: "1px solid var(--border)" }
        : { background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {quickSheet && (
        <div className="mb-1 h-7" aria-hidden="true" data-sheet-handle>
          <div className="mx-auto mt-2 h-1 w-10 rounded-full" style={{ background: "var(--surface3)" }} />
        </div>
      )}
      <div className={`${quickSheet ? "mb-4" : "mb-3"} flex min-h-11 items-center gap-2 px-1`}>
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

function TaskSheetFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="max-h-[calc(var(--visual-viewport-height,100dvh)-env(safe-area-inset-top)-1rem)] overflow-y-auto overscroll-contain rounded-t-2xl border border-b-0 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:max-h-[min(720px,calc(100dvh-3rem))] sm:rounded-2xl sm:border-b"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      data-testid="sheet-scroll-body"
    >
      {children}
    </div>
  );
}

export default function Sheet({
  open,
  onClose,
  children,
  title,
  scrollable = false,
  variant = "sheet",
  "aria-label": ariaLabel,
}: Props) {
  const t = useMotionSafe();
  const y = useMotionValue(0);
  const backdropOpacity = useTransform(y, [0, 300], [1, 0]);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const quickSheet = variant === "sheet";
  const draggable = quickSheet && !scrollable;
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
            dragOpacity={quickSheet ? backdropOpacity : 1}
          />

          <div
            className={`pointer-events-none fixed inset-0 z-[151] flex overflow-x-clip justify-center ${quickSheet ? "items-end" : "items-end sm:items-center sm:p-6"}`}
          >
            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label={ariaLabel ?? title}
              data-sheet-variant={variant}
              className={`pointer-events-auto min-w-0 w-full max-w-full ${variant === "task" ? "sm:max-w-lg" : variant === "surface" ? "sm:max-w-xl" : ""}`}
              style={quickSheet
                ? { y, touchAction: scrollable ? "auto" : "none" }
                : { touchAction: "auto" }}
              initial={quickSheet ? { y: "100%" } : { opacity: 0, y: 12 }}
              animate={quickSheet ? { y: 0 } : { opacity: 1, y: 0 }}
              exit={quickSheet
                ? { y: "100%", transition: t.sheetExit }
                : { opacity: 0, y: 8, transition: t.fast }}
              transition={quickSheet ? t.sheet : t.fast}
              drag={draggable ? "y" : false}
              dragConstraints={draggable ? { top: 0 } : undefined}
              dragElastic={draggable ? { top: 0.05, bottom: 0.3 } : false}
              onDragEnd={draggable ? (_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 500) onClose();
              } : undefined}
            >
              <SheetCloseContext.Provider value={onClose}>
                {title
                  ? (
                    <TitledSheetFrame
                      title={title}
                      onClose={onClose}
                      scrollable={scrollable}
                      variant={variant}
                    >
                      {children}
                    </TitledSheetFrame>
                  )
                  : variant === "task"
                    ? <TaskSheetFrame>{children}</TaskSheetFrame>
                    : children}
              </SheetCloseContext.Provider>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
