"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "@phosphor-icons/react";
import { useMotionSafe } from "@/lib/motion";

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
  const t = useMotionSafe();
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
    document.addEventListener("touchstart", handler, { passive: true });
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

  function activateItem(item: ContextMenuItem) {
    const trigger = returnFocusRef.current;
    item.onClick?.();
    onClose();
    window.requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!trigger || !document.contains(trigger)) return;
      if (!active || active === document.body || active === document.documentElement) {
        trigger.focus();
      }
    });
  }

  return (
    <div ref={menuRef} className="relative inline-block">
      {children}

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-orientation="vertical"
            className={`absolute z-[200] w-max min-w-[196px] overflow-hidden rounded-[18px] ${align === "left" ? "left-0" : "right-0"}`}
            style={{
              top: "calc(100% + 8px)",
              maxWidth: "min(17.5rem, calc(100vw - 2rem))",
              background: "var(--floating-surface)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid var(--floating-border)",
              boxShadow: "var(--floating-shadow)",
              transformOrigin: align === "left" ? "top left" : "top right",
            }}
            initial={t.reduced ? { opacity: 0 } : { scale: 0.92, opacity: 0, y: -6 }}
            animate={t.reduced ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
            exit={t.reduced ? { opacity: 0 } : { scale: 0.92, opacity: 0, y: -6 }}
            transition={t.fast}
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
                onClick={() => activateItem(item)}
                className="w-full min-h-11 flex items-center justify-between gap-3 px-4 py-[13px] text-sm font-medium text-left transition-colors duration-100 active:scale-[0.97] motion-reduce:active:scale-100 motion-reduce:transition-none"
                style={{
                  color: item.danger ? "var(--hard-no)" : "var(--text)",
                  background: item.selected ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
                  border: "none",
                  borderBottom: i < items.length - 1 ? "1px solid var(--floating-divider)" : "none",
                }}
              >
                <span className="min-w-0 flex-1 break-words">{item.label}</span>
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
