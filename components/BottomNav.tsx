"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

const STATIC_ITEMS = [
  { href: "/",        label: "Home",     icon: "🖤" },
  { href: "/compare", label: "Vergelijk", icon: "⚡" },
  { href: "/scenes",  label: "Scènes",   icon: "🎬" },
];

export default function BottomNav() {
  const path = usePathname();
  if (path.startsWith("/scene") || path.startsWith("/session")) return null;
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
      className="pwa-only fixed bottom-0 left-0 right-0 z-[100] flex items-stretch"
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
            className="flex-1 flex items-center justify-center py-2.5 focus-ring"
            style={{ color: active ? "var(--accent)" : "var(--text2)" }}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            <span aria-hidden="true" className="text-xl leading-none">{icon}</span>
          </Link>
        );
      })}
    </nav>
  );
}
