"use client";
import type { KinkStatus } from "@/types";

const OPTIONS: { value: KinkStatus; label: string; title: string }[] = [
  { value: "yes",      label: "✓ Yes",        title: "Yes — I enjoy this" },
  { value: "willing",  label: "↗ Willing",    title: "Willing to try" },
  { value: "maybe",    label: "~ Maybe",      title: "Curious / situational" },
  { value: "no",       label: "✗ No",         title: "Not interested" },
  { value: "hard_no",  label: "⛔ Hard no",   title: "Absolute limit" },
];

interface Props {
  value: KinkStatus;
  onChange: (v: KinkStatus) => void;
}

export default function StatusPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1">
      {OPTIONS.map((o) => {
        const active = value === o.value;
        const cls = active ? `status-${o.value} border` : "";
        return (
          <button
            key={o.value}
            title={o.title}
            onClick={() => onChange(active ? null : o.value)}
            className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${
              active ? cls : "border-transparent text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
