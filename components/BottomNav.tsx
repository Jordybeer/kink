"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/",        label: "Home",     icon: "🖤" },
  { href: "/compare", label: "Vergelijk", icon: "⚡" },
  { href: "/session", label: "Sessie",   icon: "📡" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
      style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
      aria-label="Hoofdnavigatie"
    >
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = path === href || (href !== "/" && path.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors focus-ring"
            style={{ color: active ? "var(--accent)" : "var(--text2)" }}
            aria-current={active ? "page" : undefined}
          >
            <span aria-hidden="true" className="text-base leading-none">{icon}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
