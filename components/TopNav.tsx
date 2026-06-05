"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useStore, useHasHydrated } from "@/lib/store";

const HUB_ITEMS = [
  { href: "/compare", label: "Vergelijk",    icon: "⚡" },
  { href: "/scenes",  label: "Scènes",       icon: "🎬" },
  { href: "/timeline", label: "Geschiedenis", icon: "📈" },
];

export default function TopNav() {
  const path = usePathname();
  const hydrated = useHasHydrated();
  const profiles = useStore((s) => s.profiles);
  const scenes = useStore((s) => s.scenes);
  const onboardingComplete = useStore((s) => s.onboardingComplete);
  const appLockEnabled = useStore((s) => s.appLockEnabled);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Immersive flows keep the stage to themselves.
  if (path === "/scene" || path === "/session") return null;
  // Never float over the onboarding curtain or the lock screen.
  if (hydrated && path === "/" && !onboardingComplete) return null;
  if (
    hydrated &&
    appLockEnabled &&
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem("app_unlocked") !== "1"
  )
    return null;

  const isHub = path === "/";
  const profileMatch = path.match(/^\/profile\/([^/]+)/);
  const sceneMatch = path.match(/^\/scenes\/([^/]+)/);
  const firstProfileId = profiles[0]?.id;
  const profileHref = firstProfileId ? `/profile/${firstProfileId}` : "/";

  const shell = {
    paddingTop: "env(safe-area-inset-top)",
    background: scrolled ? "color-mix(in srgb, var(--surface) 82%, transparent)" : "transparent",
    borderBottom: `1px solid ${scrolled ? "var(--border)" : "transparent"}`,
    backdropFilter: scrolled ? "blur(12px)" : "none",
    WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
  } as const;

  if (isHub) {
    const items = [...HUB_ITEMS, { href: profileHref, label: "Profiel", icon: "👤" }];
    return (
      <header className="sticky top-0 z-40 transition-colors" style={shell}>
        <nav className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-end" aria-label="Hoofdnavigatie">
          <div className="flex items-center gap-1">
            {items.map(({ href, label, icon }) => (
              <Link
                key={label}
                href={href}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 h-8 text-xs font-medium transition-colors"
                style={{ color: "var(--text2)" }}
                aria-label={label}
              >
                <span aria-hidden="true" className="text-sm leading-none">{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </header>
    );
  }

  // Focused mode — back + page title.
  const { title, back } = focusedRoute(path, {
    profileName: profileMatch ? profiles.find((p) => p.id === profileMatch[1])?.name : undefined,
    sceneTitle: sceneMatch ? scenes.find((s) => s.id === sceneMatch[1])?.title : undefined,
  });

  return (
    <header className="sticky top-0 z-40 transition-colors" style={shell}>
      <nav className="max-w-2xl mx-auto px-4 h-12 flex items-center gap-2" aria-label="Hoofdnavigatie">
        <Link
          href={back}
          className="focus-ring -ml-1 flex items-center justify-center h-9 w-9 rounded-full flex-none"
          style={{ color: "var(--text2)" }}
          aria-label="Terug"
        >
          <ChevronLeft size={20} />
        </Link>
        <span className="font-semibold text-sm truncate min-w-0">{title}</span>
      </nav>
    </header>
  );
}

function focusedRoute(
  path: string,
  dyn: { profileName?: string; sceneTitle?: string },
): { title: string; back: string } {
  if (path.startsWith("/profile/")) return { title: dyn.profileName ?? "Profiel", back: "/" };
  if (path.startsWith("/scenes/")) return { title: dyn.sceneTitle ?? "Scène", back: "/scenes" };
  if (path === "/scenes") return { title: "Scènes", back: "/" };
  if (path === "/compare") return { title: "Vergelijk", back: "/" };
  if (path === "/timeline") return { title: "Geschiedenis", back: "/" };
  if (path === "/contract") return { title: "Contract", back: "/compare" };
  return { title: "KinkSync", back: "/" };
}
