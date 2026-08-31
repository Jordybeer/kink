"use client";
import { useState, type ReactNode } from "react";
import { Plus } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useMotionSafe } from "@/lib/motion";

export interface FABItem {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
}

interface Props {
  items: FABItem[];
  /** Icon shown in the main button when closed (defaults to Plus). */
  icon?: ReactNode;
  "aria-label"?: string;
}

export default function FAB({ items, icon, "aria-label": ariaLabel = "Acties openen" }: Props) {
  const [open, setOpen] = useState(false);
  const t = useMotionSafe();

  return (
    <div className="relative flex flex-col items-end">
      {/* Speed-dial menu */}
      <div className="mb-3 flex flex-col items-end gap-3" aria-hidden={!open}>
        <AnimatePresence>
          {open && items.map((item, i) => {
            // Stagger is decorative only; reduced-motion users get the final state immediately.
            const delay = t.reduced ? 0 : (items.length - 1 - i) * 0.05;
            return (
              <motion.div
                key={item.label}
                className="flex items-center gap-3"
                initial={t.reduced ? false : { opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={t.reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.9 }}
                transition={{ ...t.fast, delay }}
              >
                <span
                  className="rounded-[8px] px-3 py-[6px] text-sm font-medium"
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    boxShadow: "0 4px 12px var(--deep-shadow)",
                  }}
                >
                  {item.label}
                </span>
                <motion.button
                  type="button"
                  whileTap={t.tap}
                  transition={t.fast}
                  onClick={() => { item.onClick?.(); setOpen(false); }}
                  className="flex h-11 w-11 items-center justify-center rounded-full"
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    boxShadow: "0 4px 12px var(--deep-shadow)",
                  }}
                  aria-label={item.label}
                >
                  {item.icon}
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Main FAB button */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        animate={{ rotate: open ? 45 : 0 }}
        whileTap={t.tap}
        transition={t.fast}
        aria-label={ariaLabel}
        aria-expanded={open}
        className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full transition-[background,box-shadow] duration-300 motion-reduce:transition-none"
        style={
          open
            ? {
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                color: "var(--text2)",
                boxShadow: "none",
              }
            : {
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                border: "none",
                color: "var(--on-accent)",
                boxShadow: "0 8px 24px color-mix(in srgb, var(--accent) 40%, transparent)",
              }
        }
      >
        {icon ?? <Plus size={24} aria-hidden="true" />}
      </motion.button>
    </div>
  );
}
