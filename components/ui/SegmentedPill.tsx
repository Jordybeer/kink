"use client";
import { useRef, useLayoutEffect, useState } from "react";

interface Segment<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function SegmentedPill<T extends string>({ segments, value, onChange }: Props<T>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const activeIdx = segments.findIndex((s) => s.value === value);
    const btn = btnRefs.current[activeIdx];
    const wrap = wrapRef.current;
    if (!btn || !wrap) return;

    const wr = wrap.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setIndicator({ left: br.left - wr.left, width: br.width });
  }, [value, segments]);

  return (
    <div
      ref={wrapRef}
      className="flex relative p-1 rounded-full"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      role="group"
    >
      {/* Sliding gradient indicator — inline style required for dynamic position */}
      {indicator && (
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 rounded-full pointer-events-none z-0"
          style={{
            left: indicator.left,
            width: indicator.width,
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            transition: "left 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      )}

      {segments.map((seg, i) => {
        const active = seg.value === value;
        return (
          <button
            key={seg.value}
            ref={(el) => { btnRefs.current[i] = el; }}
            onClick={() => onChange(seg.value)}
            role="radio"
            aria-checked={active}
            className="relative z-[1] flex-1 py-[10px] px-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors duration-200 active:scale-[0.97]"
            style={{
              background: "transparent",
              border: "none",
              color: active ? "white" : "var(--text2)",
            }}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
