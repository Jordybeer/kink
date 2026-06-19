"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useFocusTrap } from "@/lib/useFocusTrap";

const SPRING = { type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.38 } as const;
const FAST = { type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.22 } as const;

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
  "aria-label"?: string;
}

export default function Sheet({ open, onClose, title, children, "aria-label": ariaLabel }: Props) {
  const y = useMotionValue(0);
  const backdropOpacity = useTransform(y, [0, 300], [1, 0]);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(sheetRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
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
            transition={FAST}
            onClick={onClose}
          />

          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            className="fixed bottom-0 left-0 right-0 z-[151] touch-none"
            style={{ y }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={SPRING}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onClose();
            }}
          >
            <div
              className="rounded-t-[28px] px-4 pb-10 pt-3"
              style={{ background: "#0f0f0f", borderTop: "1px solid var(--border)" }}
            >
              {/* Handle */}
              <div
                className="w-12 h-[5px] rounded-full mx-auto mb-5"
                style={{ background: "var(--surface3)" }}
                aria-hidden="true"
              />

              {title && (
                <h2 className="text-[17px] font-bold mb-4 px-1">{title}</h2>
              )}

              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Convenience sub-components ── */

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
      className="w-full flex items-center gap-4 p-[14px] rounded-[18px] mb-2 text-left transition-[background,border-color] duration-150 active:scale-[0.97]"
      style={{
        background: active ? "rgba(192,132,252,0.08)" : "transparent",
        border: active ? "1px solid rgba(192,132,252,0.2)" : "1px solid transparent",
        color: "var(--text)",
      }}
    >
      {icon && (
        <span
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-[background,color] duration-150"
          style={{
            background: active ? "rgba(192,132,252,0.15)" : "var(--surface2)",
            color: active ? "var(--accent)" : "var(--text2)",
          }}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span
          className="block text-[14px] font-semibold"
          style={{ color: active ? "var(--accent)" : "var(--text)" }}
        >
          {label}
        </span>
        {description && (
          <span className="block text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>
            {description}
          </span>
        )}
      </span>
      {active && (
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: "var(--accent)", boxShadow: "0 0 10px rgba(192,132,252,0.6)" }}
        />
      )}
    </button>
  );
}
