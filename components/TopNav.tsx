"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

const ITEMS = [
  { href: "/compare", label: "Vergelijk", icon: "⚡" },
  { href: "/scenes",  label: "Scènes",   icon: "🎬" },
];

export default function TopNav() {
  const path = usePathname();
  const firstProfileId = useStore((s) => s.profiles[0]?.id);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Immersive flows keep the stage to themselves.
  if (path === "/scene" || path === "/session") return null;

  const isHome = path === "/";
  const currentProfileMatch = path.match(/^\/profile\/([^/]+)/);
  const profileHref = currentProfileMatch
    ? `/profile/${currentProfileMatch[1]}`
    : firstProfileId ? `/profile/${firstProfileId}` : "/";

  const items = [...ITEMS, { href: profileHref, label: "Profiel", icon: "👤" }];

  return (
    <header
      className="sticky top-0 z-40 transition-colors"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        background: scrolled ? "color-mix(in srgb, var(--surface) 82%, transparent)" : "transparent",
        borderBottom: `1px solid ${scrolled ? "var(--border)" : "transparent"}`,
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
      }}
    >
      <nav
        className={`max-w-2xl mx-auto px-4 h-12 flex items-center ${isHome ? "justify-end" : "justify-between"}`}
        aria-label="Hoofdnavigatie"
      >
        {!isHome && (
          <Link
            href="/"
            className="focus-ring font-bold text-base tracking-tight"
            style={{
              background: "linear-gradient(90deg, var(--accent), var(--accent2))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
            aria-label="Home"
          >
            KinkSync
          </Link>
        )}
        <div className="flex items-center gap-1">
          {items.map(({ href, label, icon }) => {
            const active =
              label === "Profiel" ? path.startsWith("/profile") : path.startsWith(href);
            return (
              <Link
                key={label}
                href={href}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 h-8 text-xs font-medium transition-colors"
                style={
                  active
                    ? { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }
                    : { color: "var(--text2)" }
                }
                aria-label={label}
                aria-current={active ? "page" : undefined}
              >
                <span aria-hidden="true" className="text-sm leading-none">{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
