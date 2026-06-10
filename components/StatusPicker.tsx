"use client";
import { Ban } from "lucide-react";
import type { KinkStatus } from "@/types";

const OPTIONS: { value: NonNullable<KinkStatus>; icon: string; label: string; title: string }[] = [
  { value: "yes",     icon: "✓",  label: "Heel graag",  title: "Heel graag — ik wil dit erg graag" },
  { value: "willing", icon: "↗",  label: "Ja",          title: "Ja — ik sta er open voor" },
  { value: "maybe",   icon: "♡",  label: "Misschien",   title: "Misschien — nieuwsgierig maar onzeker" },
  { value: "no",      icon: "↘",  label: "Voor hen",    title: "Voor hen — ik doe het voor jou, niet voor mezelf" },
  { value: "hard_no", icon: "✕✕", label: "Harde grens", title: "Harde grens — absolute limiet" },
];

interface Props {
  value: KinkStatus;
  onChange: (v: KinkStatus) => void;
  kinkName?: string;
}

export default function StatusPicker({ value, onChange, kinkName }: Props) {
  return (
    <div
      role="group"
      aria-label={kinkName ? `Status voor ${kinkName}` : "Status"}
      className="grid grid-cols-5 border-t border-[var(--border)]"
    >
      {OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            title={o.title}
            aria-pressed={active}
            onClick={() => onChange(active ? null : o.value)}
            className={`focus-ring h-11 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
              active
                ? `status-${o.value}`
                : "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--surface3)]"
            }`}
          >
            {o.value === "hard_no" ? <Ban size={13} aria-hidden="true" /> : <span className="text-[13px] leading-none">{o.icon}</span>}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
