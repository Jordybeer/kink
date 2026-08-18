"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { X } from "@phosphor-icons/react";
import SheetBackdrop from "@/components/SheetBackdrop";
import { useMotionSafe } from "@/lib/motion";
import { useFocusTrap } from "@/lib/useFocusTrap";

const SPRING = { type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.38 } as const;

export interface SheetOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  scrollable?: boolean;
  "aria-label"?: string;
}

export default function Sheet({ open, onClose, title, children, scrollable = false, "aria-label": ariaLabel }: Props) {
  const t = useMotionSafe();
  const reduceMotion = useReducedMotion();
  const y = useMotionValue(0);
  const backdropOpacity = useTransform(y, [0, 300], [1, 0]);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(sheetRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
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
            className="fixed bottom-0 left-0 right-0 z-[151]"
            style={{ y, touchAction: scrollable ? "auto" : "none" }}
            initial={reduceMotion ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={reduceMotion ? { duration: 0 } : SPRING}
            drag={scrollable ? false : "y"}
            dragConstraints={scrollable ? undefined : { top: 0 }}
            dragElastic={scrollable ? false : { top: 0.05, bottom: 0.3 }}
            onDragEnd={scrollable ? undefined : (_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onClose();
            }}
          >
            <div
              className={scrollable
                ? "flex flex-col overflow-hidden rounded-t-[28px] px-4 pt-3"
                : "rounded-t-[28px] px-4 pb-10 pt-3"}
              style={{
                background: "var(--surface)",
                borderTop: "1px solid var(--border)",
                ...(scrollable
                  ? { maxHeight: "calc(var(--visual-viewport-height, 100dvh) - env(safe-area-inset-top))" }
                  : {}),
              }}
            >
              <div className="h-7 mb-1" aria-hidden="true">
                <div
                  className="h-[5px] w-12 mx-auto mt-2 rounded-full"
                  style={{ background: "var(--surface3)" }}
                />
              </div>

              {title && (
                <div className="mb-4 flex min-h-11 items-center gap-2 px-1">
                  <h2 className="min-w-0 flex-1 text-lg font-bold">{title}</h2>
                  {scrollable && (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label={`${title} sluiten`}
                      className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-full"
                      style={{ color: "var(--text2)" }}
                    >
                      <X size={20} aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

              {scrollable ? (
                <div
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(2.5rem+env(safe-area-inset-bottom))]"
                  data-testid="sheet-scroll-body"
                >
                  {children}
                </div>
              ) : children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface SheetOptionProps {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export function SheetOptionItem({ label, description, icon, active, onClick }: SheetOptionProps) {
  return (
    <button
      onClick={onClick}
      // De keuze zat alleen in kleur: accentlabel, accenticoon en een bolletje
      // van 2,5px. Wie niet ziet, hoorde een rij identieke knoppen en wist niet
      // welke al gekozen was. Bij een profiel- of perspectiefkeuze betekent dat
      // antwoorden zonder te weten namens wie.
      aria-pressed={active}
      className="w-full flex items-center gap-4 p-[14px] rounded-[18px] mb-2 text-left transition-[background,border-color] duration-150 active:scale-[0.97]"
      style={{
        background: active ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
        border: active ? "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" : "1px solid transparent",
        color: "var(--text)",
      }}
    >
      {icon && (
        <span
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-[background,color] duration-150"
          style={{
            background: active ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--surface2)",
            color: active ? "var(--accent)" : "var(--text2)",
          }}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span
          className="block text-sm font-semibold"
          style={{ color: active ? "var(--accent)" : "var(--text)" }}
        >
          {label}
        </span>
        {description && (
          <span className="block text-xs mt-0.5" style={{ color: "var(--text2)" }}>
            {description}
          </span>
        )}
      </span>
      {active && (
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: "var(--accent)", boxShadow: "0 0 10px var(--accent-glow)" }}
        />
      )}
    </button>
  );
}
