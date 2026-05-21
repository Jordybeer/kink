"use client";

interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
}

export default function StarScore({ value, onChange }: Props) {
  return (
    <div className="flex" role="group" aria-label="Score">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          aria-label={`Geef ${n} ${n === 1 ? "ster" : "sterren"}`}
          aria-pressed={value !== null && n <= value}
          onClick={() => onChange(value === n ? null : n)}
          className="focus-ring w-8 h-8 flex items-center justify-center text-lg leading-none transition-colors"
          style={{ color: value !== null && n <= value ? "var(--accent)" : "var(--border)" }}
        >
          ★
        </button>
      ))}
    </div>
  );
}
