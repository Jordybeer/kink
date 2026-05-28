"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

const STATIC_ITEMS = [
  { href: "/",        label: "Home",     icon: "🖤" },
  { href: "/compare", label: "Vergelijk", icon: "⚡" },
  { href: "/session", label: "Sessie",   icon: "📡" },
];

export default function BottomNav() {
  const path = usePathname();
  const firstProfileId = useStore((s) => s.profiles[0]?.id);
  const currentProfileMatch = path.match(/^\/profile\/([^/]+)/);
  const profileHref = currentProfileMatch
    ? `/profile/${currentProfileMatch[1]}`
    : firstProfileId ? `/profile/${firstProfileId}` : "/";

  const allItems = [
    ...STATIC_ITEMS,
    { href: profileHref, label: "Profiel", icon: "👤" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] flex items-stretch"
      style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Hoofdnavigatie"
    >
      {allItems.map(({ href, label, icon }) => {
        const active =
          label === "Profiel"
            ? path.startsWith("/profile")
            : href === "/"
            ? path === "/"
            : path.startsWith(href);
        return (
          <Link
            key={label}
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
