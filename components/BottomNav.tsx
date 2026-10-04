"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDots, UserCircle, UsersThree } from "@phosphor-icons/react";
import { useHasHydrated, useStore } from "@/lib/store";
import { routeChromeSemantics } from "@/lib/routeSemantics";

export default function BottomNav() {
  const path = usePathname();
  const hydrated = useHasHydrated();
  const onboardingComplete = useStore((state) => state.onboardingComplete);
  const profileCount = useStore((state) => state.profiles.length);
  const route = routeChromeSemantics(path);

  if (!hydrated || !onboardingComplete || profileCount === 0 || route.hideBottomNav) return null;

  const items = [
    { href: "/space", label: "Ik", icon: UserCircle, section: "space" as const },
    { href: "/together", label: "Samen", icon: UsersThree, section: "together" as const },
    { href: "/moments", label: "Momenten", icon: CalendarDots, section: "moments" as const },
  ];

  return (
    <nav
      className="bottom-nav fixed inset-x-0 bottom-0 z-40 gap-1 pt-1.5"
      style={{
        background: "linear-gradient(180deg, var(--pwa-nav-surface) 0%, var(--pwa-nav-surface-deep) 100%)",
        borderTop: "1px solid color-mix(in srgb, var(--pwa-nav-icon) 16%, var(--border))",
        boxShadow: "0 -10px 30px color-mix(in srgb, var(--pwa-nav-surface-deep) 70%, transparent)",
        height: "var(--bottom-nav-h)",
        alignItems: "flex-start",
        paddingLeft: "max(var(--bottom-nav-side-inset), env(safe-area-inset-left, 0px))",
        paddingRight: "max(var(--bottom-nav-side-inset), env(safe-area-inset-right, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      aria-label="Tabbladen"
    >
      {items.map(({ href, label, icon: Icon, section }) => {
        const active = route.bottomNavSection === section;
        return (
          <Link
            key={section}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className="focus-ring flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-[background-color,transform] duration-150 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
            style={{ background: active ? "var(--pwa-nav-active)" : "transparent" }}
          >
            <Icon
              size={24}
              weight={active ? "fill" : "regular"}
              aria-hidden="true"
              style={{
                color: active ? "var(--pwa-nav-icon-active)" : "var(--pwa-nav-icon)",
                filter: active ? "drop-shadow(0 0 8px color-mix(in srgb, var(--pwa-nav-icon) 22%, transparent))" : "none",
              }}
            />
            <span
              className="max-w-full truncate text-xs leading-none"
              style={{
                color: active ? "var(--pwa-nav-icon-active)" : "var(--pwa-nav-icon)",
                fontWeight: active ? 650 : 500,
                opacity: active ? 1 : 0.86,
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
