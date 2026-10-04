import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export default function SpaceLink({
  href,
  title,
  detail,
  icon,
  prefetch = true,
}: {
  href: string;
  title: string;
  detail?: string;
  icon?: ReactNode;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className="focus-ring flex min-h-[64px] w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-opacity hover:opacity-90 active:opacity-75"
      style={{
        background: "color-mix(in srgb, var(--surface2) 78%, transparent)",
        border: "1px solid color-mix(in srgb, var(--border) 82%, transparent)",
      }}
    >
      {icon && (
        <span
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full"
          style={{ background: "color-mix(in srgb, var(--accent) 9%, var(--surface2))", color: "var(--accent)" }}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        {detail && <span className="mt-0.5 block text-xs leading-5" style={{ color: "var(--text2)" }}>{detail}</span>}
      </span>
      <CaretRight size={15} aria-hidden="true" className="flex-none" style={{ color: "var(--text2)" }} />
    </Link>
  );
}
