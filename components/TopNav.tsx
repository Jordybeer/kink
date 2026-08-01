"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Anchor, CaretLeft, FilmSlate, GearSix, User, Lightning } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { TAP_SPRING } from "@/lib/motion";
import { useStore, useHasHydrated } from "@/lib/store";

const MotionLink = motion.create(Link);

const HUB_ITEMS: { href: string; label: string; icon: Icon }[] = [
  { href: "/compare", label: "Vergelijk", icon: Lightning },
  { href: "/scenes",  label: "Scènes",   icon: FilmSlate },
  { href: "/session", label: "Live",     icon: Anchor },
];

export default function TopNav() {
  const path = usePathname();
  const hydrated = useHasHydrated();
  const profiles = useStore((s) => s.profiles);
  const scenes = useStore((s) => s.scenes);
  const onboardingComplete = useStore((s) => s.onboardingComplete);
  const appLockEnabled = useStore((s) => s.appLockEnabled);
  const [savedVisible, setSavedVisible] = useState(false);
  const previousProfilesRef = useRef(profiles);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFeedbackArmedRef = useRef(false);
  const saveFeedbackRoute = path === "/compare" || path === "/profile" || path.startsWith("/profile/");

  useEffect(() => {
    if (!hydrated) {
      saveFeedbackArmedRef.current = false;
      previousProfilesRef.current = profiles;
      return;
    }
    if (!saveFeedbackArmedRef.current) {
      saveFeedbackArmedRef.current = true;
      previousProfilesRef.current = profiles;
      return;
    }

    const changed = previousProfilesRef.current !== profiles;
    previousProfilesRef.current = profiles;
    if (!changed || !saveFeedbackRoute) return;

    setSavedVisible(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSavedVisible(false), 1800);
  }, [hydrated, profiles, saveFeedbackRoute]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
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
  const profileActive = !!firstProfileId && (path === profileHref || path.startsWith(profileHref + "/"));

  const shell = {
    paddingTop: "env(safe-area-inset-top)",
    background: "color-mix(in srgb, var(--surface) 78%, transparent)",
    borderBottom: "1px solid var(--border)",
    backdropFilter: "blur(12px) saturate(140%)",
    WebkitBackdropFilter: "blur(12px) saturate(140%)",
  } as const;

  if (isHub) {
    const items: { href: string; label: string; icon: Icon; forceActive?: boolean }[] = [
      ...HUB_ITEMS,
      { href: profileHref, label: "Profiel", icon: User, forceActive: profileActive },
    ];
    return (
      <header className="sticky top-0 z-40 transition-colors" style={shell}>
        <nav className="max-w-2xl mx-auto px-3 h-14 flex items-center" aria-label="Hoofdnavigatie">
          <div className="pwa-hidden flex items-center gap-0.5 sm:gap-1 -ml-1.5">
            {items.map(({ href, label, icon: Icon, forceActive }) => {
              const active = forceActive !== undefined ? forceActive : (path === href || path.startsWith(href + "/"));
              return (
                <MotionLink
                  key={label}
                  href={href}
                  whileTap={TAP_SPRING}
                  className="focus-ring inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-1.5 sm:px-2 h-8 text-xs whitespace-nowrap transition-colors"
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
          <div className="ml-auto flex items-center justify-end gap-2">
            <StatusDot />
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("ks:open-settings"))}
              aria-label="Instellingen openen"
              className="focus-ring flex items-center justify-center h-10 w-10 rounded-full"
              style={{ color: "var(--text2)" }}
            >
              <GearSix size={18} aria-hidden="true" />
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
      <nav className="relative max-w-2xl mx-auto px-4 h-14 flex items-center gap-1" aria-label="Hoofdnavigatie">
        <MotionLink
          href={back}
          whileTap={TAP_SPRING}
          className="focus-ring -ml-2 flex-none flex items-center justify-center h-10 w-10 rounded-full"
          style={{ color: "var(--text2)" }}
          aria-label="Terug"
        >
          <CaretLeft size={18} />
        </MotionLink>
        <span
          className="flex-1 min-w-0 text-base italic truncate serif-safe transition-opacity"
          style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)", opacity: savedVisible && saveFeedbackRoute ? 0 : 1 }}
        >
          {title}
        </span>
        {saveFeedbackRoute && (
          <span
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs font-semibold whitespace-nowrap transition-opacity"
            style={{ color: "var(--accent)", opacity: savedVisible ? 1 : 0 }}
          >
            Opgeslagen ✓
          </span>
        )}
        <div className="flex-none flex items-center justify-end gap-2">
          {profileIdFromPath && (
            <Link
              href={`/compare?a=${profileIdFromPath}`}
              className="pwa-hidden focus-ring flex items-center gap-1 text-xs font-medium px-3 h-8 rounded-full"
              style={{ color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}
            >
              <Lightning size={15} />
              Vergelijk
            </Link>
          )}
          {profileIdFromPath && (
            <Link
              href="/scene"
              className="focus-ring flex items-center gap-1 text-xs font-medium px-3 h-8 rounded-full"
              style={{ color: "var(--text2)", border: "1px solid var(--border)" }}
            >
              <FilmSlate size={15} />
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
  if (path === "/profile") return { title: "Profiel", back: "/" };
  if (path.startsWith("/profile/")) return { title: dyn.profileName ?? "Profiel", back: "/" };
  if (path.startsWith("/scenes/")) return { title: dyn.sceneTitle ?? "Scène", back: "/scenes" };
  if (path === "/scenes") return { title: "Scènes", back: "/" };
  if (path === "/compare") return { title: "Vergelijk", back: "/" };
  if (path === "/timeline") return { title: "Geschiedenis", back: "/" };
  if (path === "/contract") return { title: "Contract", back: "/compare" };
  return { title: "KinkSync", back: "/" };
}
