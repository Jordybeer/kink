"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lightning, FilmSlate, User } from "@phosphor-icons/react";
import { useStore, useHasHydrated } from "@/lib/store";
import { profileHref } from "@/lib/localRoutes";

export default function BottomNav() {
  const path = usePathname();
  const { profiles } = useStore();
  const _hasHydrated = useHasHydrated();

  // Keep the main profile surface tab-like. Only the questionnaire is a focused
  // subflow that should temporarily take over the screen.
  if (/^\/profile\/[^/]+\/questions$/.test(path)) return null;
  if (path === "/scene" || path.startsWith("/scenes/")) return null;
  if (path === "/about" || path === "/security") return null;
  const firstProfileId = _hasHydrated ? profiles[0]?.id : undefined;
  const firstProfileHref = firstProfileId ? profileHref(firstProfileId) : "/";

  const items = [
    {
      href: "/compare",
      label: "Vergelijk",
      icon: Lightning,
      active: path === "/compare" || path.startsWith("/compare/"),
    },
    {
      href: "/scenes",
      label: "Scènes",
      icon: FilmSlate,
      active: path === "/scenes" || path.startsWith("/scenes/"),
    },
    {
      href: firstProfileHref,
      label: "Profiel",
      icon: User,
      active: path === "/profile" || /^\/profile\/[^/]+$/.test(path),
    },
  ] as const;

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
      {items.map(({ href, label, icon: Icon, active }) => (
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
          <span style={{ fontSize: 12, letterSpacing: "0.01em" }}>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
