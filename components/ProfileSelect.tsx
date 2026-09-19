"use client";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDown } from "@phosphor-icons/react";
import { useMotionSafe } from "@/lib/motion";
import { usePartnerProfileId } from "@/lib/partnerPreference";
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
  const listboxId = useId();
  const [preferredPartnerId] = usePartnerProfileId();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = profiles.find((p) => p.id === value);
  const usesPartnerDefault = placeholder === "Geen partner gekozen";

  useEffect(() => {
    if (!usesPartnerDefault || value || !preferredPartnerId) return;
    if (!profiles.some((profile) => profile.id === preferredPartnerId)) return;
    onChange(preferredPartnerId);
  }, [onChange, preferredPartnerId, profiles, usesPartnerDefault, value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  function focusOption(index: number) {
    if (profiles.length === 0) return;
    const next = (index + profiles.length) % profiles.length;
    optionRefs.current[next]?.focus();
  }

  function openAndFocusSelected(direction: 1 | -1) {
    if (!profiles.length) return;
    setOpen(true);
    window.requestAnimationFrame(() => {
      const selectedIndex = Math.max(0, profiles.findIndex((profile) => profile.id === value));
      const index = value ? selectedIndex : direction === 1 ? 0 : profiles.length - 1;
      focusOption(index);
    });
  }

  function closeAndReturnFocus() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openAndFocusSelected(1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            openAndFocusSelected(-1);
          }
        }}
        className="w-full focus-ring transition-colors"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
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
            id={listboxId}
            role="listbox"
            aria-label="Kies profiel"
            initial={t.reduced ? { opacity: 0 } : { opacity: 0, scaleY: 0.9, y: -4 }}
            animate={t.reduced ? { opacity: 1 } : { opacity: 1, scaleY: 1, y: 0 }}
            exit={t.reduced ? { opacity: 0 } : { opacity: 0, scaleY: 0.9, y: -4 }}
            transition={t.fast}
            onKeyDown={(event) => {
              const currentIndex = optionRefs.current.findIndex((option) => option === document.activeElement);
              if (event.key === "ArrowDown") {
                event.preventDefault();
                focusOption(currentIndex + 1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                focusOption(currentIndex - 1);
              } else if (event.key === "Home") {
                event.preventDefault();
                focusOption(0);
              } else if (event.key === "End") {
                event.preventDefault();
                focusOption(profiles.length - 1);
              } else if (event.key === "Escape") {
                event.preventDefault();
                closeAndReturnFocus();
              }
            }}
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
                <p style={{ padding: "10px 12px", fontSize: 14, color: "var(--text2)" }}>
                  Geen profielen
                </p>
              ) : (
                profiles.map((p, i) => (
                  <button
                    key={p.id}
                    ref={(element) => { optionRefs.current[i] = element; }}
                    type="button"
                    role="option"
                    aria-selected={p.id === value}
                    onClick={() => {
                      onChange(p.id);
                      closeAndReturnFocus();
                    }}
                    className="focus-ring transition-colors"
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
