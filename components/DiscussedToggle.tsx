"use client";

interface Props {
  count: number;
  hidden: boolean;
  onToggle: () => void;
}

export default function DiscussedToggle({ count, hidden, onToggle }: Props) {
  if (count === 0) return null;
  return (
    <div className="flex justify-end mb-3">
      <button
        onClick={onToggle}
        className="focus-ring text-xs px-3 py-1.5 rounded-full border transition-colors"
        style={{
          borderColor: hidden ? "var(--accent)" : "var(--border)",
          color: hidden ? "var(--accent)" : "var(--text2)",
        }}
      >
        {hidden ? `Toon alles (${count})` : `Verberg besproken (${count})`}
      </button>
    </div>
  );
}
