"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Anchor, ChevronLeft, Clapperboard, Settings, User, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TAP_SPRING } from "@/lib/motion";
import { useStore, useHasHydrated } from "@/lib/store";

const MotionLink = motion.create(Link);

const HUB_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/compare", label: "Vergelijk", icon: Zap },
  { href: "/scenes",  label: "Scènes",   icon: Clapperboard },
  { href: "/session", label: "Live",     icon: Anchor },
];

export default function TopNav() {
  const path = usePathname();
  const hydrated = useHasHydrated();
  const profiles = useStore((s) => s.profiles);
  const scenes = useStore((s) => s.scenes);
  const onboardingComplete = useStore((s) => s.onboardingComplete);
  const appLockEnabled = useStore((s) => s.appLockEnabled);

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
  const profileActive = !!firstProfileId && (path === profileHref || path.startsWith(profileHref + "/"));

  const shell = {
    paddingTop: "env(safe-area-inset-top)",
    background: "color-mix(in srgb, var(--surface) 78%, transparent)",
    borderBottom: "1px solid var(--border)",
    backdropFilter: "blur(12px) saturate(140%)",
    WebkitBackdropFilter: "blur(12px) saturate(140%)",
  } as const;

  if (isHub) {
    const items: { href: string; label: string; icon: LucideIcon; forceActive?: boolean }[] = [
      ...HUB_ITEMS,
      { href: profileHref, label: "Profiel", icon: User, forceActive: profileActive },
    ];
    return (
      <header className="sticky top-0 z-40 transition-colors" style={shell}>
        <nav className="relative max-w-2xl mx-auto px-4 h-14 flex items-center" aria-label="Hoofdnavigatie">
          <div className="pwa-hidden absolute inset-x-0 flex items-center justify-center gap-1">
            {items.map(({ href, label, icon: Icon, forceActive }) => {
              const active = forceActive !== undefined ? forceActive : (path === href || path.startsWith(href + "/"));
              return (
                <MotionLink
                  key={label}
                  href={href}
                  whileTap={TAP_SPRING}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 h-8 text-xs transition-colors"
                  style={{ color: active ? "var(--text)" : "var(--text2)", fontWeight: active ? 700 : 500 }}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span>{label}</span>
                </MotionLink>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-1 flex-none">
            <StatusDot />
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("ks:open-settings"))}
              aria-label="Instellingen openen"
              className="focus-ring flex items-center justify-center rounded-lg"
              style={{ minWidth: 44, minHeight: 44, color: "var(--text2)" }}
            >
              <Settings size={18} aria-hidden="true" />
            </button>
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

  const profileIdFromPath = path.startsWith("/profile/") ? path.split("/")[2] : null;

  return (
    <header className="sticky top-0 z-40 transition-colors" style={shell}>
      <nav className="relative max-w-2xl mx-auto px-4 h-14 flex items-center" aria-label="Hoofdnavigatie">
        <MotionLink
          href={back}
          whileTap={TAP_SPRING}
          className="focus-ring -ml-1 flex items-center justify-center h-9 w-9 rounded-full flex-none"
          style={{ color: "var(--text2)" }}
          aria-label="Terug"
        >
          <ChevronLeft size={20} />
        </MotionLink>
        <span className="flex-1 ml-2 font-bold text-base truncate min-w-0">
          {title}
        </span>
        <div className="flex items-center gap-1 flex-none">
          {profileIdFromPath && (
            <Link
              href={`/compare?a=${profileIdFromPath}`}
              className="pwa-hidden focus-ring flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg"
              style={{ color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}
            >
              <Zap size={13} />
              Vergelijk
            </Link>
          )}
          {profileIdFromPath && (
            <Link
              href="/scene"
              className="focus-ring flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg"
              style={{ color: "var(--text2)", border: "1px solid var(--border)" }}
            >
              <Clapperboard size={13} />
              Scène
            </Link>
          )}
          <StatusDot />
        </div>
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

  const color = online ? "var(--willing)" : "var(--hard-no)";

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
