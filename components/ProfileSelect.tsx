"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDown } from "@phosphor-icons/react";
import { useMotionSafe } from "@/lib/motion";
import type { Profile } from "@/types";

// The house dropdown for picking a profile — extracted from the scene
// planner's hand-rolled original. Same open/close/outside-click behaviour,
// but the animation layer now speaks lib/motion (and finally respects
// prefers-reduced-motion) instead of inline cubic-bezier strings.

export default function ProfileSelect({
  profiles,
  value,
  onChange,
  placeholder,
}: {
  profiles: Profile[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  const t = useMotionSafe();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = profiles.find((p) => p.id === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full focus-ring transition-colors"
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          background: "var(--surface2)",
          border: `1px solid ${open ? "var(--accent)" : "var(--border)"}`,
          borderRadius: 10,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          color: selected ? "var(--text)" : "var(--text2)",
          fontSize: 14,
          minHeight: 44,
          width: "100%",
        }}
      >
        <span className="truncate">{selected?.name ?? placeholder}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={t.fast}
          style={{ flexShrink: 0, display: "inline-flex", color: "var(--text2)" }}
          aria-hidden="true"
        >
          <CaretDown aria-hidden="true" size={12} weight="bold" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, scaleY: 0.9, y: -4 }}
            animate={{ opacity: 1, scaleY: 1, y: 0 }}
            exit={{ opacity: 0, scaleY: 0.9, y: -4 }}
            transition={t.fast}
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              background: "var(--surface2)",
              border: "1px solid var(--border-accent)",
              borderRadius: 10,
              overflow: "hidden",
              zIndex: 10,
              transformOrigin: "top",
            }}
          >
            <div style={{ overflowY: "auto", maxHeight: 220 }}>
              {profiles.length === 0 ? (
                <p style={{ padding: "10px 12px", fontSize: 13, color: "var(--text2)" }}>
                  Geen profielen
                </p>
              ) : (
                profiles.map((p, i) => (
                  <button
                    key={p.id}
                    role="option"
                    aria-selected={p.id === value}
                    onClick={() => { onChange(p.id); setOpen(false); }}
                    className="transition-colors"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: 14,
                      color: p.id === value ? "var(--accent)" : "var(--text)",
                      background: p.id === value
                        ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                        : "transparent",
                      borderBottom: i < profiles.length - 1 ? "1px solid var(--border)" : "none",
                      display: "block",
                      minHeight: 44,
                    }}
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
