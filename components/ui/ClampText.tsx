"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMotionSafe } from "@/lib/motion";

interface Props {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

// Prose held on a two-line leash. If the text strains against it, the whole
// paragraph becomes tappable. Expanding never grows the flow — a floating
// panel opens on top of whatever sits below (status pills, tags) so nothing
// shifts under a mid-tap thumb — and pulls itself into view and into focus
// instead of leaving the reader to scroll manually. Short text that fits
// stays a plain paragraph.
export default function ClampText({ text, className = "", style }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);
  const t = useMotionSafe();
  const reducedMotion = useReducedMotion();

  // New text, fresh restraint — collapse before measuring.
  useLayoutEffect(() => {
    setExpanded(false);
  }, [text]);

  // Only a clamped paragraph can tell us whether it's straining.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    setClipped(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  // Bring the newly opened panel into view and hand it focus — the reader
  // shouldn't have to hunt for what just appeared.
  useEffect(() => {
    if (!expanded) return;
    const el = overlayRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
    el.focus({ preventScroll: true });
  }, [expanded, reducedMotion]);

  if (!clipped) {
    return (
      <p className={className} style={style}>
        <span ref={ref} className="line-clamp-2 block">{text}</span>
      </p>
    );
  }

  // The overlay is out of flow and self-positions at top:0 — a caller's
  // margin utilities (spacing it from siblings in the reserved slot) would
  // just nudge the floating panel off-alignment, so they're dropped here.
  // text-sm is the collapsed preview's rhythm; committing to read the full
  // paragraph earns a size bump and full-contrast ink instead of the
  // muted caller colour, since that's the "very small kink info" complaint.
  const overlayClassName = className
    .replace(/\bm[trblxy]?-\S+/g, "")
    .replace(/\btext-sm\b/, "text-base")
    .trim();

  return (
    <span className="relative block" style={style}>
      {/* Reserves the collapsed footprint so siblings below never move. */}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-expanded={expanded}
        aria-hidden={expanded}
        tabIndex={expanded ? -1 : 0}
        style={{ visibility: expanded ? "hidden" : "visible" }}
        className={`focus-ring block w-full text-left ${className}`}
      >
        <span ref={ref} className="line-clamp-2 block">{text}</span>
        <span aria-hidden="true" className="block text-xs mt-0.5" style={{ color: "var(--accent)" }}>
          …meer
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            ref={overlayRef}
            role="button"
            tabIndex={0}
            aria-label="Toon minder"
            onClick={() => setExpanded(false)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(false); } }}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={t.fast}
            className={`focus-ring absolute left-0 right-0 top-0 z-20 rounded-xl p-3 text-left overflow-y-auto cursor-pointer leading-relaxed ${overlayClassName}`}
            style={{ maxHeight: "45vh", background: "var(--surface2)", border: "1px solid var(--border-accent)", boxShadow: "0 10px 28px rgba(0,0,0,0.45)", color: "var(--text)" }}
          >
            <span className="block">{text}</span>
            <span aria-hidden="true" className="block text-xs mt-1.5" style={{ color: "var(--accent)" }}>
              minder ↑
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
