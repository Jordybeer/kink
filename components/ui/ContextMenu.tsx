"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SPRING = { type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.22 } as const;

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onClick?: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
  /** Wrap the anchor element (the trigger button) as children */
  children: ReactNode;
  align?: "left" | "right";
}

export default function ContextMenu({ open, onClose, items, children, align = "right" }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div ref={menuRef} className="relative inline-block">
      {children}

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-orientation="vertical"
            className={`absolute z-[200] w-[196px] overflow-hidden rounded-[18px] ${align === "left" ? "left-0" : "right-0"}`}
            style={{
              top: "calc(100% + 8px)",
              background: "rgba(20,20,20,0.97)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              transformOrigin: align === "left" ? "top left" : "top right",
            }}
            initial={{ scale: 0.92, opacity: 0, y: -6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: -6 }}
            transition={SPRING}
          >
            {items.map((item, i) => (
              <button
                key={i}
                role="menuitem"
                onClick={() => { item.onClick?.(); onClose(); }}
                className="w-full flex items-center justify-between px-4 py-[13px] text-[14px] font-medium text-left transition-colors duration-100 active:scale-[0.97]"
                style={{
                  color: item.danger ? "var(--hard-no)" : "var(--text)",
                  background: "transparent",
                  border: "none",
                  borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <span>{item.label}</span>
                {item.icon && (
                  <span className="shrink-0 opacity-60">{item.icon}</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
