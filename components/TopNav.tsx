"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { TAP_SPRING } from "@/lib/motion";
import { useStore, useHasHydrated } from "@/lib/store";

const MotionLink = motion.create(Link);

const HUB_ITEMS = [
  { href: "/compare", label: "Vergelijk",    icon: "⚡" },
  { href: "/scenes",  label: "Scènes",       icon: "🎬" },
  { href: "/session", label: "Live",         icon: "⛓️" },
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
        <nav className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between" aria-label="Hoofdnavigatie">
          <StatusDot />
          <div className="flex items-center gap-1">
            {items.map(({ href, label, icon }) => (
              <MotionLink
                key={label}
                href={href}
                whileTap={TAP_SPRING}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 h-8 text-xs font-medium transition-colors"
                style={{ color: "var(--text2)" }}
                aria-label={label}
              >
                <span aria-hidden="true" className="text-sm leading-none">{icon}</span>
                <span>{label}</span>
              </MotionLink>
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
        <MotionLink
          href={back}
          whileTap={TAP_SPRING}
          className="focus-ring -ml-1 flex items-center justify-center h-9 w-9 rounded-full flex-none"
          style={{ color: "var(--text2)" }}
          aria-label="Terug"
        >
          <ChevronLeft size={20} />
        </MotionLink>
        <span className="font-semibold text-sm truncate min-w-0">{title}</span>
        <span className="ml-auto pl-2 flex-none">
          <StatusDot />
        </span>
      </nav>
    </header>
  );
}

// Live connection light: a quiet green dot online, a pulsing red dot + label
// the moment the leash to the network gets cut.
function StatusDot() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const color = online ? "#22c55e" : "#ef4444";

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={online ? "Online" : "Offline"}
      className="inline-flex items-center gap-1.5"
    >
      <span className="relative flex h-2 w-2">
        {!online && (
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
            style={{ background: color }}
          />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
      </span>
      {!online && (
        <span className="text-xs font-medium" style={{ color }}>
          Offline
        </span>
      )}
    </span>
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
