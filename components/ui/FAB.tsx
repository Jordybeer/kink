"use client";
import { useState, type ReactNode } from "react";
import { Plus } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

const SPRING = { type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.25 } as const;

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

  return (
    <div className="relative flex flex-col items-end">
      {/* Speed-dial menu */}
      <div className="flex flex-col gap-3 items-end mb-3" aria-hidden={!open}>
        <AnimatePresence>
          {open && items.map((item, i) => {
            /* Stagger reversed so the bottom item enters first */
            const delay = (items.length - 1 - i) * 0.05;
            return (
              <motion.div
                key={item.label}
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ ...SPRING, delay }}
              >
                <span
                  className="px-3 py-[6px] rounded-[8px] text-sm font-medium"
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                  }}
                >
                  {item.label}
                </span>
                <button
                  onClick={() => { item.onClick?.(); setOpen(false); }}
                  className="w-11 h-11 rounded-full flex items-center justify-center active:scale-[0.97] transition-transform duration-150"
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                  }}
                  aria-label={item.label}
                >
                  {item.icon}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Main FAB button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        animate={{ rotate: open ? 45 : 0 }}
        transition={SPRING}
        aria-label={ariaLabel}
        aria-expanded={open}
        className="w-14 h-14 rounded-full flex items-center justify-center active:scale-[0.97] transition-[background,box-shadow] duration-300 z-10 relative"
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
                color: "white",
                boxShadow: "0 8px 24px color-mix(in srgb, var(--accent) 40%, transparent)",
              }
        }
      >
        {icon ?? <Plus size={24} aria-hidden="true" />}
      </motion.button>
    </div>
  );
}
