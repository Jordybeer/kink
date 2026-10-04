"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SPACES = [
  { href: "/space", label: "Ik" },
  { href: "/together", label: "Samen" },
  { href: "/moments", label: "Momenten" },
] as const;

export default function SpaceSwitcher() {
  const path = usePathname();

  return (
    <nav
      aria-label="Ruimtes"
      className="space-browser-nav mb-4 grid grid-cols-3 gap-1 rounded-2xl p-1"
      style={{
        background: "color-mix(in srgb, var(--surface2) 76%, transparent)",
        border: "1px solid color-mix(in srgb, var(--border) 82%, transparent)",
      }}
    >
      {SPACES.map((space) => {
        const active = path === space.href;
        return (
          <Link
            key={space.href}
            href={space.href}
            aria-current={active ? "page" : undefined}
            className="focus-ring flex min-h-10 items-center justify-center rounded-xl px-2 text-sm font-semibold transition-colors"
            style={{
              color: active ? "var(--text)" : "var(--text2)",
              background: active ? "var(--surface)" : "transparent",
              boxShadow: active ? "var(--shadow-soft)" : "none",
            }}
          >
            {space.label}
          </Link>
        );
      })}
    </nav>
  );
}
