"use client";
import { useLayoutEffect, useRef, useState } from "react";

interface Props {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

// Prose held on a two-line leash. If the text strains against it, the whole
// paragraph becomes tappable and slips the clamp in place — no sheet, no
// navigation, just more rope. Short text that fits stays a plain paragraph.
export default function ClampText({ text, className = "", style }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);

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

  if (!clipped) {
    return (
      <p className={className} style={style}>
        <span ref={ref} className="line-clamp-2 block">{text}</span>
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
      className={`focus-ring block w-full text-left ${className}`}
      style={style}
    >
      <span ref={ref} className={expanded ? "block" : "line-clamp-2 block"}>
        {text}
      </span>
      <span aria-hidden="true" className="block text-xs mt-0.5" style={{ color: "var(--accent)" }}>
        {expanded ? "minder" : "…meer"}
      </span>
    </button>
  );
}
