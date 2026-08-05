"use client";

import { useId, useRef, type KeyboardEvent } from "react";
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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectAndFocus(index: number) {
    const segment = segments[index];
    if (!segment) return;
    onChange(segment.value);
    tabRefs.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!segments.length) return;

    let nextIndex: number;
    switch (event.key) {
      case "ArrowLeft":
        nextIndex = (index - 1 + segments.length) % segments.length;
        break;
      case "ArrowRight":
        nextIndex = (index + 1) % segments.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = segments.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    selectAndFocus(nextIndex);
  }

  return (
    <div
      className="flex border-b"
      style={{ borderColor: "var(--border)" }}
      role="tablist"
      aria-label="Profielweergave"
    >
      {segments.map((segment, index) => {
        const active = segment.value === value;
        return (
          <button
            key={segment.value}
            ref={(node) => { tabRefs.current[index] = node; }}
            type="button"
            onClick={() => onChange(segment.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
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
