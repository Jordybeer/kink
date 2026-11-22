"use client";
import { motion, AnimatePresence, useDragControls, useMotionValue, useTransform, type DragControls } from "framer-motion";
import { X } from "@phosphor-icons/react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import SheetBackdrop from "@/components/SheetBackdrop";
import { useMotionSafe } from "@/lib/motion";
import type { ResolvedTheme } from "@/lib/theme";
import { useFocusTrap } from "@/lib/useFocusTrap";

const SheetCloseContext = createContext<(() => void) | null>(null);
const SheetDragContext = createContext<DragControls | null>(null);

export type SheetVariant = "sheet" | "task" | "surface";

type SheetTestIds = { header?: string; body?: string; footer?: string };

/** Only the handle starts a drag; gestures in the content remain native scrolling. */
export function SheetDragHandle({ children, className = "mb-1 h-7" }: { children: ReactNode; className?: string }) {
  const dragControls = useContext(SheetDragContext);
  return (
    <div className={`min-h-[44px] shrink-0 touch-none ${className}`} aria-hidden="true" data-sheet-handle onPointerDown={(event) => dragControls?.start(event)}>
      {children}
    </div>
  );
}

interface SheetContentProps {
  children: ReactNode;
  className?: string;
  showHandle?: boolean;
  /** Disable when children provide a fixed header and their own scroll body. */
  scrollable?: boolean;
  /** Kept for source compatibility; visible close actions belong in the footer. */
  showClose?: boolean;
  style?: CSSProperties;
  "data-testid"?: string;
}

/** Standardized quick-sheet content wrapper: surface bg, border and optional drag handle. */
export function SheetContent({
  children,
  className = "px-[var(--sheet-gutter)] pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 sm:pb-6 sm:pt-4",
  showHandle = true,
  scrollable = true,
  style,
  "data-testid": dataTestId,
}: SheetContentProps) {
  return (
    <div
      className={`min-w-0 max-w-full rounded-t-2xl text-pretty sm:rounded-2xl ${scrollable ? "overflow-y-auto overscroll-contain" : ""} ${className}`}
      data-sheet-scroll-owner={scrollable ? "" : undefined}
      style={{
        maxHeight: "calc(var(--visual-viewport-height, 100dvh) - var(--sheet-edge-clearance))",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderBottom: "none",
        ...style,
        maxBlockSize: "calc(var(--visual-viewport-height, 100dvh) - env(safe-area-inset-top) - var(--sheet-edge-clearance))",
      }}
      data-testid={dataTestId}
    >
      {showHandle && (
        <SheetDragHandle>
          <div
            className="mx-auto mt-2 h-1 w-10 rounded-full"
            style={{ background: "var(--border)" }}
          />
        </SheetDragHandle>
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
  headerIcon?: ReactNode;
  scrollable?: boolean;
  variant?: SheetVariant;
  footer?: ReactNode;
  eyebrow?: string;
  subtitle?: string;
  contentSized?: boolean;
  titleTone?: "editorial" | "utility";
  headerAfter?: ReactNode;
  scrollBodyRef?: Ref<HTMLDivElement>;
  testIds?: SheetTestIds;
  "aria-label"?: string;
  previewTheme?: ResolvedTheme;
}

function TitledSheetFrame({
  title,
  headerIcon,
  onClose,
  scrollable,
  variant,
  footer,
  eyebrow,
  subtitle,
  contentSized = false,
  titleTone = "editorial",
  headerAfter,
  scrollBodyRef,
  testIds,
  children,
}: {
  title: string;
  headerIcon?: ReactNode;
  onClose: () => void;
  scrollable: boolean;
  variant: SheetVariant;
  footer?: ReactNode;
  eyebrow?: string;
  subtitle?: string;
  contentSized?: boolean;
  titleTone?: "editorial" | "utility";
  headerAfter?: ReactNode;
  scrollBodyRef?: Ref<HTMLDivElement>;
  testIds?: SheetTestIds;
  children: ReactNode;
}) {
  const quickSheet = variant === "sheet";
  const surface = variant === "surface";
  const task = variant === "task";

  const sheetAmbient = "linear-gradient(156deg, color-mix(in srgb, var(--accent2) 5%, var(--surface)) 0%, var(--surface) 46%, color-mix(in srgb, var(--accent) 3%, var(--surface)) 100%)";

  const frameClassName = quickSheet
    ? scrollable
      ? "flex max-h-[calc(var(--visual-viewport-height,100dvh)-env(safe-area-inset-top)-var(--sheet-edge-clearance))] flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl px-[var(--sheet-gutter)] pt-3"
      : "max-h-[calc(var(--visual-viewport-height,100dvh)-env(safe-area-inset-top)-var(--sheet-edge-clearance))] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-2xl px-[var(--sheet-gutter)] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3"
    : surface
      ? contentSized
        ? "flex max-h-[calc(min(var(--visual-viewport-height,100dvh),100dvh)-env(safe-area-inset-top)-1.5rem)] flex-col overflow-hidden rounded-2xl border px-[min(var(--sheet-gutter),20px)] pt-3 sm:max-h-[min(720px,calc(100dvh-3rem))] sm:px-[min(var(--sheet-gutter),24px)]"
        : "flex h-[calc(min(var(--visual-viewport-height,100dvh),100dvh)-env(safe-area-inset-top)-var(--sheet-edge-clearance))] max-h-[calc(min(var(--visual-viewport-height,100dvh),100dvh)-env(safe-area-inset-top)-var(--sheet-edge-clearance))] flex-col overflow-hidden rounded-t-xl border border-b-0 px-[min(var(--sheet-gutter),20px)] pt-2 sm:h-auto sm:max-h-[min(760px,calc(100dvh-3rem))] sm:rounded-2xl sm:border-b sm:px-[min(var(--sheet-gutter),24px)] sm:pt-3"
      : "flex max-h-[calc(var(--visual-viewport-height,100dvh)-env(safe-area-inset-top)-min(1rem,16px))] flex-col overflow-hidden rounded-t-2xl border border-b-0 px-[min(var(--sheet-gutter),20px)] pt-[min(0.75rem,12px)] sm:max-h-[min(720px,calc(100dvh-min(3rem,48px)))] sm:rounded-2xl sm:border-b sm:px-[min(var(--sheet-gutter),24px)]";

  return (
    <div
      className={`min-w-0 w-full max-w-full ${surface ? "ks-modal-atmosphere " : ""}${frameClassName}`}
      style={quickSheet
        ? { background: sheetAmbient, borderTop: "1px solid var(--border)" }
        : { background: sheetAmbient, borderColor: "var(--border)" }}
    >
      {quickSheet && (
        <SheetDragHandle>
          <div className="mx-auto mt-2 h-1 w-10 rounded-full" style={{ background: "var(--surface3)" }} />
        </SheetDragHandle>
      )}
      {/* Bound task chrome so enlarged text leaves room for the scroll body. */}
      <div data-testid={testIds?.header} className={`${quickSheet ? "mb-4" : task ? "mb-[min(0.75rem,12px)]" : "mb-3"} flex ${task ? "min-h-[44px]" : "min-h-11"} min-w-0 flex-none items-start ${surface || task ? "gap-[8px] px-[4px]" : "gap-2 px-1"}`}>
        {headerIcon && <span className="flex h-[24px] w-[20px] flex-none self-center items-center justify-center" style={{ color: "var(--accent)" }} aria-hidden="true">{headerIcon}</span>}
        <div className="min-w-0 flex-1 self-center">
          {eyebrow && <p className="ks-modal-eyebrow mb-2">{eyebrow}</p>}
          <h2
            className={`break-words ${titleTone === "utility" ? "text-base font-semibold leading-tight" : surface ? "text-balance text-[clamp(1.65rem,7.5vw,2rem)] font-medium leading-[1.06] tracking-[-0.025em]" : "text-lg font-bold"}`}
            style={titleTone === "utility" ? undefined : surface ? { fontFamily: "var(--font-display, Georgia, serif)" } : undefined}
          >{title}</h2>
          {subtitle && <p className="mt-2 max-w-[32rem] text-sm leading-5" style={{ color: "var(--text2)" }}>{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`${title} sluiten`}
          className={`ks-motion-choice focus-ring flex ${surface || task ? "h-[44px] w-[44px]" : "h-11 w-11"} flex-none items-center justify-center rounded-full`}
          style={{ color: "var(--text2)" }}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {headerAfter && <div className={`${task ? "mb-[min(0.75rem,12px)]" : "mb-3"} flex-none`}>{headerAfter}</div>}
      {scrollable ? (
        <>
          <div
            ref={scrollBodyRef}
            className={`min-h-0 min-w-0 ${contentSized ? "flex-auto" : "flex-1"} scroll-py-4 overflow-y-auto overscroll-contain ${footer ? task ? "pb-[min(1rem,16px)]" : "pb-4" : task ? "pb-[calc(min(2rem,32px)+env(safe-area-inset-bottom))]" : "pb-[calc(2rem+env(safe-area-inset-bottom))]"}`}
            data-testid={testIds?.body ?? "sheet-scroll-body"}
          >
            {children}
          </div>
          {footer && (
            <div
              className={`flex-none border-t ${task ? "pt-[min(0.75rem,12px)] pb-[calc(min(0.75rem,12px)+env(safe-area-inset-bottom))]" : "pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"}`}
              style={{ borderColor: "var(--border)" }}
              data-testid={testIds?.footer ?? "sheet-footer"}
            >
              {footer}
            </div>
          )}
        </>
      ) : children}
    </div>
  );
}

function TaskSheetFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="max-h-[calc(var(--visual-viewport-height,100dvh)-env(safe-area-inset-top)-min(1rem,16px))] overflow-y-auto overscroll-contain rounded-t-2xl border border-b-0 px-[min(var(--sheet-gutter),20px)] pb-[calc(min(1rem,16px)+env(safe-area-inset-bottom))] pt-[min(1rem,16px)] sm:max-h-[min(720px,calc(100dvh-min(3rem,48px)))] sm:rounded-2xl sm:border-b sm:px-[min(var(--sheet-gutter),24px)]"
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
  headerIcon,
  scrollable = false,
  variant = "sheet",
  footer,
  eyebrow,
  subtitle,
  contentSized = false,
  titleTone = "editorial",
  headerAfter,
  scrollBodyRef,
  testIds,
  "aria-label": ariaLabel,
  previewTheme,
}: Props) {
  const t = useMotionSafe();
  const dragControls = useDragControls();
  const y = useMotionValue<number | string>(0);
  // Entrance/exit uses percentages; only pixel-valued dragging owns dimming.
  const backdropOpacity = useTransform(y, (value) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(1, 1 - value / 300))
      : 1,
  );
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
            className={`pointer-events-none fixed left-0 z-[151] flex overflow-x-clip justify-center ${quickSheet ? "items-end sm:items-center sm:p-6" : contentSized ? "items-start pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:items-center sm:p-6" : variant === "task" ? "items-end sm:items-center sm:p-[min(1.5rem,24px)]" : "items-end sm:items-center sm:p-6"}`}
            data-testid="sheet-visual-viewport"
            style={{
              top: "var(--visual-viewport-offset-top, 0px)",
              width: "100vw",
              // A stale or overflow-inflated JS height cannot exceed the CSS
              // viewport. A smaller visual viewport still accommodates keyboards.
              height: variant === "surface"
                ? "min(var(--visual-viewport-height, 100dvh), 100dvh)"
                : "var(--visual-viewport-height, 100dvh)",
            }}
          >
            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label={ariaLabel ?? title}
              data-preview-theme={previewTheme}
              data-sheet-draggable={draggable || undefined}
              data-sheet-variant={variant}
              className={`pointer-events-auto min-w-0 w-full max-w-full [overflow-wrap:anywhere] ${variant === "surface" ? "sm:max-w-xl" : "sm:max-w-lg"}`}
              style={quickSheet
                ? { y, touchAction: "auto" }
                : { touchAction: "auto" }}
              initial={quickSheet ? { y: "100%" } : { opacity: 0, y: 12 }}
              animate={quickSheet ? { y: 0 } : { opacity: 1, y: 0 }}
              exit={quickSheet
                ? { y: "100%", transition: t.sheetExit }
                : { opacity: 0, y: 8, transition: t.fast }}
              transition={quickSheet ? t.sheet : t.fast}
              drag={draggable ? "y" : false}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={draggable ? { top: 0 } : undefined}
              dragElastic={draggable ? { top: 0.05, bottom: 0.3 } : false}
              onDragEnd={draggable ? (_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 500) onClose();
              } : undefined}
            >
              <SheetCloseContext.Provider value={onClose}>
              <SheetDragContext.Provider value={draggable ? dragControls : null}>
                {title
                  ? (
                    <TitledSheetFrame
                      title={title}
                      headerIcon={headerIcon}
                      onClose={onClose}
                      scrollable={scrollable}
                      variant={variant}
                      footer={footer}
                      eyebrow={eyebrow}
                      subtitle={subtitle}
                      contentSized={contentSized}
                      titleTone={titleTone}
                      headerAfter={headerAfter}
                      scrollBodyRef={scrollBodyRef}
                      testIds={testIds}
                    >
                      {children}
                    </TitledSheetFrame>
                  )
                  : variant === "task"
                    ? <TaskSheetFrame>{children}</TaskSheetFrame>
                    : children}
              </SheetDragContext.Provider>
              </SheetCloseContext.Provider>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
