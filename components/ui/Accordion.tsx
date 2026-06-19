"use client";
import { useState, useId, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SPRING = { type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.35 } as const;

interface Props {
  trigger: ReactNode;
  /** Optional icon shown in a tinted pill left of the trigger label */
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function Accordion({ trigger, icon, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const bodyId = `acc-body-${id}`;

  return (
    <div
      className="overflow-hidden rounded-[20px]"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <button
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 active:scale-[0.97] transition-transform duration-150"
        style={{ background: "transparent", border: "none", color: "var(--text)" }}
      >
        <span className="flex items-center gap-3">
          {icon && (
            <span
              className="p-2 rounded-[12px] flex items-center justify-center"
              style={{ background: "rgba(192,132,252,0.15)", color: "var(--accent)" }}
            >
              {icon}
            </span>
          )}
          <span className="text-[14px] font-medium">{trigger}</span>
        </span>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={SPRING}
          className="flex items-center justify-center"
          style={{ color: "var(--text2)" }}
          aria-hidden="true"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={bodyId}
            role="region"
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4 pt-1 flex flex-col gap-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
