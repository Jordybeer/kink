"use client";
import { useState, useId, type ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useMotionSafe } from "@/lib/motion";

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
  const t = useMotionSafe();

  return (
    <div
      className="overflow-hidden rounded-[20px]"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 transition-transform duration-150 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
        style={{ background: "transparent", border: "none", color: "var(--text)" }}
      >
        <span className="flex items-center gap-3">
          {icon && (
            <span
              className="flex items-center justify-center rounded-[12px] p-2"
              style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
            >
              {icon}
            </span>
          )}
          <span className="text-sm font-medium">{trigger}</span>
        </span>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={t.fast}
          className="flex items-center justify-center"
          style={{ color: "var(--text2)" }}
          aria-hidden="true"
        >
          <CaretDown size={16} weight="bold" aria-hidden="true" />
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
            transition={t.sheet}
            style={{ overflow: "hidden" }}
          >
            <div className="flex flex-col gap-2 px-4 pb-4 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
