"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lightning, FilmSlate, User } from "@phosphor-icons/react";
import { useStore, useHasHydrated } from "@/lib/store";
import { profileHref } from "@/lib/localRoutes";
import { routeChromeSemantics } from "@/lib/routeSemantics";

export default function BottomNav() {
  const path = usePathname();
  const { profiles } = useStore();
  const hydrated = useHasHydrated();
  const route = routeChromeSemantics(path);

  if (route.hideBottomNav) return null;

  const firstProfileId = hydrated ? profiles[0]?.id : undefined;
  const firstProfileHref = firstProfileId ? profileHref(firstProfileId) : "/";
  const items = [
    { href: "/compare", label: "Vergelijk", icon: Lightning, section: "compare" as const },
    { href: "/scenes", label: "Scènes", icon: FilmSlate, section: "scenes" as const },
    { href: firstProfileHref, label: "Profiel", icon: User, section: "profile" as const },
  ];

  return (
    <nav
      className="bottom-nav fixed bottom-0 left-0 right-0 z-40 justify-around px-2"
      style={{
        background: "var(--bg)",
        borderTop: "1px solid var(--border)",
        height: "var(--bottom-nav-h)",
        alignItems: "center",
      }}
      aria-label="Tabbladen"
    >
      {items.map(({ href, label, icon: Icon, section }) => {
        const active = route.bottomNavSection === section;
        return (
          <Link
            key={label}
            href={href}
            className="focus-ring flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 transition-transform duration-150 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
            style={{
              color: active ? "var(--text)" : "var(--text2)",
              fontWeight: active ? 700 : 500,
              minWidth: 44,
              minHeight: 44,
              justifyContent: "center",
            }}
            aria-current={active ? "page" : undefined}
          >
            <Icon
              size={20}
              weight={active ? "fill" : "regular"}
              aria-hidden="true"
              className={`transition-transform duration-200 motion-reduce:transform-none motion-reduce:transition-none ${active ? "-translate-y-0.5 scale-[1.06]" : ""}`}
            />
            <span className="text-xs tracking-[0.01em]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
