"use client";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export default function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="ks-motion-choice focus-ring flex h-11 w-12 flex-none items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden="true"
        className="relative block h-6 w-11 rounded-full ks-motion-state"
        style={{
          background: checked ? "var(--accent)" : "var(--surface3)",
          border: checked ? "1px solid var(--accent)" : "1px solid var(--border)",
        }}
      >
        <span
          className="absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full ks-motion-travel"
          style={{
            background: "var(--text)",
            transform: checked ? "translateX(22px)" : "translateX(0)",
          }}
        />
      </span>
    </button>
  );
}
