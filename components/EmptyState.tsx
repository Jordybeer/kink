import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  message,
  ctaHref,
  ctaLabel,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-16 px-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <Icon size={28} aria-hidden style={{ color: "var(--text2)" }} />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          {title}
        </h1>
        <p className="text-sm" style={{ color: "var(--text2)" }}>
          {message}
        </p>
      </div>
      <Link href={ctaHref} className="btn-accent focus-ring" style={{ minWidth: 200 }}>
        {ctaLabel}
      </Link>
    </div>
  );
}
