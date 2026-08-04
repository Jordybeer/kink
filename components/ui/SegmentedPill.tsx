"use client";

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
            <span
              aria-hidden="true"
              className="absolute bottom-[-1px] left-7 right-7 h-0.5 rounded-full transition-[opacity,transform] duration-150"
              style={{
                background: "color-mix(in srgb, var(--text) 72%, transparent)",
                opacity: active ? 1 : 0,
                transform: active ? "scaleX(1)" : "scaleX(0.65)",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
