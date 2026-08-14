"use client";

interface Props {
  count: number;
  hidden: boolean;
  onToggle: () => void;
}

export default function DiscussedToggle({ count, hidden, onToggle }: Props) {
  if (count === 0) return null;
  return (
    <div className="mb-3 flex justify-end">
      <button
        type="button"
        onClick={onToggle}
        className="focus-ring min-h-11 rounded-full border px-3 text-[14px] transition-colors"
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
