"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "@phosphor-icons/react";

const SPRING = { type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.22 } as const;

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  selected?: boolean;
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
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const returnFocusRef = useRef<HTMLElement | null>(null);

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

    const active = document.activeElement;
    returnFocusRef.current = active instanceof HTMLElement && menuRef.current?.contains(active)
      ? active
      : menuRef.current?.querySelector<HTMLElement>('button[aria-expanded="true"]') ?? null;

    const frame = window.requestAnimationFrame(() => itemRefs.current[0]?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function focusItem(index: number) {
    const available = itemRefs.current.filter((item): item is HTMLButtonElement => Boolean(item));
    if (available.length === 0) return;
    const nextIndex = (index + available.length) % available.length;
    available[nextIndex]?.focus();
  }

  function restoreTriggerFocus() {
    const trigger = returnFocusRef.current;
    onClose();
    window.requestAnimationFrame(() => trigger?.focus());
  }

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
            onKeyDown={(event) => {
              const currentIndex = itemRefs.current.findIndex((item) => item === document.activeElement);
              if (event.key === "ArrowDown") {
                event.preventDefault();
                focusItem(currentIndex + 1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                focusItem(currentIndex - 1);
              } else if (event.key === "Home") {
                event.preventDefault();
                focusItem(0);
              } else if (event.key === "End") {
                event.preventDefault();
                focusItem(items.length - 1);
              } else if (event.key === "Escape") {
                event.preventDefault();
                restoreTriggerFocus();
              }
            }}
            onBlur={(event) => {
              const next = event.relatedTarget;
              if (next instanceof Node && menuRef.current?.contains(next)) return;
              onClose();
            }}
          >
            {items.map((item, i) => (
              <button
                key={i}
                ref={(element) => { itemRefs.current[i] = element; }}
                type="button"
                role={item.selected === undefined ? "menuitem" : "menuitemradio"}
                aria-checked={item.selected}
                tabIndex={-1}
                onClick={() => { item.onClick?.(); onClose(); }}
                className="w-full flex items-center justify-between px-4 py-[13px] text-sm font-medium text-left transition-colors duration-100 active:scale-[0.97]"
                style={{
                  color: item.danger ? "var(--hard-no)" : "var(--text)",
                  background: item.selected ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
                  border: "none",
                  borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <span>{item.label}</span>
                {item.selected ? (
                  <Check size={15} weight="bold" aria-hidden="true" className="shrink-0" style={{ color: "var(--accent)" }} />
                ) : item.icon ? (
                  <span className="shrink-0 opacity-60">{item.icon}</span>
                ) : null}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}