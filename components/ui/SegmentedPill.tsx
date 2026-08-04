"use client";

import { useId } from "react";
import { motion } from "framer-motion";

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
  const indicatorId = useId();

  return (
    <div
      className="flex border-b"
      style={{ borderColor: "var(--border)" }}
      role="tablist"
      aria-label="Profielweergave"
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            onClick={() => onChange(segment.value)}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className="focus-ring relative flex min-h-11 flex-1 items-center justify-center px-3 text-[13px] transition-colors duration-150"
            style={{
              color: active ? "var(--text)" : "var(--text2)",
              fontWeight: active ? 500 : 400,
            }}
          >
            {segment.label}
            {active && (
              <motion.span
                layoutId={`segmented-indicator-${indicatorId}`}
                aria-hidden="true"
                className="absolute bottom-[-1px] left-5 right-5 h-0.5 rounded-full"
                style={{ background: "var(--accent)" }}
                transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.2 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
