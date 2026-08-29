"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDots, CaretLeft, DotsThree, GearSix, Info, ShieldCheck, WifiSlash } from "@phosphor-icons/react";
import { useMotionSafe } from "@/lib/motion";
import { useStore, useHasHydrated } from "@/lib/store";
import { routeChromeSemantics } from "@/lib/routeSemantics";
import ContextMenu from "@/components/ui/ContextMenu";
import { useTopNav, type TopNavAction } from "@/components/nav/TopNavContext";

const MotionLink = motion.create(Link);

const homeUtilitySurface: React.CSSProperties = {
  background: "color-mix(in srgb, var(--surface) 38%, transparent)",
  borderColor: "color-mix(in srgb, var(--border-accent) 38%, var(--border))",
  backdropFilter: "blur(12px) saturate(120%)",
  WebkitBackdropFilter: "blur(12px) saturate(120%)",
  boxShadow: "0 8px 24px color-mix(in srgb, var(--bg) 20%, transparent)",
  pointerEvents: "auto",
};

const contentHeaderSurface: React.CSSProperties = {
  background: "color-mix(in srgb, var(--bg) 72%, transparent)",
  backdropFilter: "blur(14px) saturate(120%)",
  WebkitBackdropFilter: "blur(14px) saturate(120%)",
  pointerEvents: "none",
};

const contentNavRow: React.CSSProperties = {
  pointerEvents: "auto",
};

export default function TopNav() {
  const path = usePathname();
  const router = useRouter();
  const hydrated = useHasHydrated();
  const profiles = useStore((state) => state.profiles);
  const scenes = useStore((state) => state.scenes);
  const onboardingComplete = useStore((state) => state.onboardingComplete);
  const { actions, title: contextualTitle } = useTopNav();
  const t = useMotionSafe();
  const [savedVisible, setSavedVisible] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const previousProfilesRef = useRef(profiles);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFeedbackArmedRef = useRef(false);
  const saveFeedbackRoute = path === "/compare"
    || path === "/profile"
    || (path.startsWith("/profile/") && !path.endsWith("/questions"));

  useEffect(() => {
    setOverflowOpen(false);
  }, [path]);

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

  if (path === "/scene") return null;
  if (hydrated && path === "/" && !onboardingComplete) return null;

  const safeAreaShell = {
    paddingTop: "env(safe-area-inset-top)",
    pointerEvents: "none",
  } as const;

  if (path === "/") {
    const homeMenuItems = [
      {
        label: "Agenda",
        icon: <CalendarDots size={17} aria-hidden="true" />,
        onClick: () => router.push("/intimacy"),
      },
      {
        label: "Over KinkSync",
        icon: <Info size={17} aria-hidden="true" />,
        onClick: () => router.push("/about"),
      },
      {
        label: "Security & privacy",
        icon: <ShieldCheck size={17} aria-hidden="true" />,
        onClick: () => router.push("/security"),
      },
    ];

    return (
      <>
        <style>{`
          [data-home-wordmark] {
            font-size: clamp(3rem, 11vw, 3.35rem) !important;
            line-height: 0.98;
          }
          @media (max-height: 520px) and (orientation: landscape) {
            [data-home-wordmark] {
              font-size: 2.85rem !important;
              line-height: 0.96;
            }
          }
        `}</style>
        <header className="sticky top-0 z-40" style={safeAreaShell}>
          <nav
            className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 lg:max-w-4xl"
            aria-label="Hoofdnavigatie"
            data-top-nav-variant="home"
          >
            <button
              type="button"
              data-testid="home-topnav-settings"
              onClick={() => window.dispatchEvent(new CustomEvent("ks:open-settings"))}
              aria-label="Instellingen openen"
              title="Instellingen"
              className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-full border"
              style={{ ...homeUtilitySurface, color: "var(--text2)" }}
            >
              <GearSix size={18} aria-hidden="true" />
            </button>

            <div
              data-testid="home-topnav-actions"
              className="flex items-center gap-2"
              style={{ pointerEvents: "auto" }}
            >
              <OfflineStatus />
              <ContextMenu
                open={overflowOpen}
                onClose={() => setOverflowOpen(false)}
                items={homeMenuItems}
              >
                <button
                  type="button"
                  onClick={() => setOverflowOpen((open) => !open)}
                  aria-label="Meer opties"
                  aria-expanded={overflowOpen}
                  className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-full border"
                  style={{ ...homeUtilitySurface, color: "var(--text2)" }}
                >
                  <DotsThree size={22} weight="bold" aria-hidden="true" />
                </button>
              </ContextMenu>
            </div>
          </nav>
        </header>
      </>
    );
  }

  const sceneMatch = path.match(/^\/scenes\/([^/]+)/);
  const route = routeChromeSemantics(path, {
    sceneTitle: sceneMatch ? scenes.find((scene) => scene.id === sceneMatch[1])?.title : undefined,
  });
  const title = contextualTitle ?? route.title;
  const questionTitle = contextualTitle?.startsWith("Vragenlijst · ")
    ? contextualTitle.split(" · ", 2)
    : null;
  const navWidth = navWidthForRoute(path);

  const directActions = actions.filter((action) => action.placement !== "overflow");
  const primary = actions.find((action) => action.placement === "primary") ?? directActions[0];
  const secondary = actions.find((action) => action.placement === "secondary" && action.id !== primary?.id)
    ?? directActions.find((action) => action.id !== primary?.id);
  const visibleIds = new Set([primary?.id, secondary?.id].filter(Boolean));
  const overflowActions = actions.filter((action) => !visibleIds.has(action.id));

  return (
    <header
      className="sticky top-0 z-40"
      style={{ ...safeAreaShell, ...contentHeaderSurface }}
    >
      <nav
        className={`mx-auto flex h-14 ${navWidth} items-center px-4`}
        aria-label="Hoofdnavigatie"
        data-top-nav-variant="content"
      >
        <div
          data-testid="content-topnav-row"
          className="relative flex h-14 w-full items-center gap-1"
          style={contentNavRow}
        >
          <MotionLink
            href={route.back}
            whileTap={t.tap}
            className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-full"
            style={{ color: "var(--text2)" }}
            aria-label="Terug"
          >
            <CaretLeft aria-hidden="true" size={20} />
          </MotionLink>
          <span
            className="serif-safe min-w-0 flex-1 truncate text-base italic transition-opacity"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontWeight: 500,
              color: "var(--text)",
              opacity: savedVisible && saveFeedbackRoute ? 0 : 1,
            }}
          >
            {questionTitle ? (
              <>
                <span>{questionTitle[0]}</span>
                <span> · {questionTitle[1]}</span>
              </>
            ) : title}
          </span>
          {saveFeedbackRoute && (
            <span
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold transition-opacity"
              style={{ color: "var(--accent)", opacity: savedVisible ? 1 : 0 }}
            >
              Opgeslagen ✓
            </span>
          )}
          {primary && <TopNavActionButton action={primary} emphasis="primary" />}
          {secondary && <TopNavActionButton action={secondary} emphasis="secondary" />}
          {overflowActions.length > 0 && (
            <ContextMenu
              open={overflowOpen}
              onClose={() => setOverflowOpen(false)}
              items={overflowActions
                .filter((action) => !action.disabled)
                .map((action) => ({
                  label: action.label,
                  icon: action.icon,
                  danger: action.danger,
                  selected: action.selected,
                  onClick: action.onClick,
                }))}
            >
              <button
                type="button"
                data-tour={questionTitle ? "questionnaire-menu" : undefined}
                onClick={() => setOverflowOpen((open) => !open)}
                aria-label="Meer acties"
                aria-expanded={overflowOpen}
                className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-full"
                style={{ color: "var(--text2)" }}
              >
                <DotsThree size={22} weight="bold" aria-hidden="true" />
              </button>
            </ContextMenu>
          )}
          <OfflineStatus />
        </div>
      </nav>
    </header>
  );
}

function TopNavActionButton({
  action,
  emphasis,
}: {
  action: TopNavAction;
  emphasis: "primary" | "secondary";
}) {
  const t = useMotionSafe();
  const labelled = Boolean(action.shortLabel);

  return (
    <motion.button
      type="button"
      data-tour={action.id === "questionnaire-help" ? "questionnaire-info" : undefined}
      whileTap={action.disabled ? undefined : t.tap}
      onClick={action.onClick}
      disabled={action.disabled}
      aria-label={action.label}
      title={action.label}
      className={`focus-ring flex h-11 flex-none items-center justify-center rounded-full disabled:opacity-35 [&_svg]:h-5 [&_svg]:w-5 ${labelled ? "min-w-11 gap-1.5 px-3 text-sm font-semibold" : "w-11"}`}
      style={{
        color: action.danger
          ? "var(--hard-no)"
          : emphasis === "primary"
            ? "var(--text)"
            : "var(--text2)",
      }}
    >
      {action.icon}
      {action.shortLabel && <span className="whitespace-nowrap">{action.shortLabel}</span>}
    </motion.button>
  );
}

function OfflineStatus() {
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

  if (online) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label="Offline"
      className="inline-flex h-9 flex-none items-center gap-1.5 rounded-full px-2 text-xs font-medium"
      style={{ color: "var(--hard-no)", background: "color-mix(in srgb, var(--hard-no) 8%, transparent)" }}
    >
      <WifiSlash size={15} aria-hidden="true" />
      <span className="hidden min-[400px]:inline">Offline</span>
    </span>
  );
}

function navWidthForRoute(path: string): string {
  if (path === "/compare") return "max-w-5xl";
  if (path === "/about" || path === "/security" || path === "/contracts" || path === "/scenes" || path === "/timeline") {
    return "max-w-4xl";
  }
  if (path === "/contract" || path.startsWith("/contracts/") || path === "/profile" || path.startsWith("/profile/")) {
    return "max-w-3xl";
  }
  return "max-w-2xl";
}
