"use client";

interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
  size?: number;
}

export default function StarScore({ value, onChange, size = 16 }: Props) {
  return (
    <div className="flex gap-0.5" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          title={`Score ${n}`}
          onClick={() => onChange(value === n ? null : n)}
          className="leading-none transition-colors"
          style={{ color: value !== null && n <= value ? "#c084fc" : "var(--border)" }}
        >
          ★
        </button>
      ))}
    </div>
  );
}
