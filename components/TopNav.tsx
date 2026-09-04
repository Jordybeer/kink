"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CaretLeft, DotsThree, GearSix, Info, ShieldCheck, WifiSlash } from "@phosphor-icons/react";
import { useMotionSafe } from "@/lib/motion";
import { useStore, useHasHydrated } from "@/lib/store";
import { routeChromeSemantics } from "@/lib/routeSemantics";
import ContextMenu from "@/components/ui/ContextMenu";
import Wordmark from "@/components/Wordmark";
import { useTopNav, type TopNavAction } from "@/components/nav/TopNavContext";

const MotionLink = motion.create(Link);

const contentHeaderSurface: React.CSSProperties = {
  background: "color-mix(in srgb, var(--bg) 66%, transparent)",
  backdropFilter: "blur(18px) saturate(120%)",
  WebkitBackdropFilter: "blur(18px) saturate(120%)",
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
        label: "Instellingen",
        icon: <GearSix size={17} aria-hidden="true" />,
        onClick: () => {
          window.requestAnimationFrame(() => {
            document.querySelector<HTMLButtonElement>('[data-testid="home-topnav-more"]')?.focus();
            window.dispatchEvent(new CustomEvent("ks:open-settings"));
          });
        },
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
      <header
        className="relative z-40"
        style={safeAreaShell}
        data-home-masthead
      >
        <nav
          className="mx-auto grid h-[5.5rem] max-w-2xl grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-start px-[var(--page-gutter)] py-3 lg:max-w-4xl"
          aria-label="Hoofdnavigatie"
          data-top-nav-variant="home"
        >
          <div className="justify-self-start" style={{ pointerEvents: "auto" }}>
            <OfflineStatus compact />
          </div>
          <div data-home-identity className="min-w-0 text-center">
            <h1
              data-home-nav-wordmark
              className="serif-safe whitespace-nowrap"
              style={{
                fontFamily: "var(--font-display, Georgia, serif)",
                fontSize: "clamp(2.25rem, 10vw, 2.5rem)",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              <Wordmark />
            </h1>
            <p
              data-home-subtitle
              className="mt-1 text-[0.8125rem] italic leading-5 tracking-wide"
              style={{ color: "var(--text2)" }}
            >
              Verken grenzen. Samen.
            </p>
          </div>

          <div
            data-testid="home-topnav-actions"
            className="justify-self-end"
            style={{ pointerEvents: "auto" }}
          >
            <ContextMenu
              open={overflowOpen}
              onClose={() => setOverflowOpen(false)}
              items={homeMenuItems}
            >
              <button
                type="button"
                data-testid="home-topnav-more"
                onClick={() => setOverflowOpen((open) => !open)}
                aria-label="Meer opties"
                aria-expanded={overflowOpen}
                className="focus-ring flex h-11 w-11 items-center justify-center rounded-full"
                style={{ color: "var(--text2)" }}
              >
                <DotsThree size={22} weight="bold" aria-hidden="true" />
              </button>
            </ContextMenu>
          </div>
        </nav>
      </header>
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
        className={`mx-auto h-14 ${navWidth} px-[var(--page-gutter)]`}
        aria-label="Hoofdnavigatie"
        data-top-nav-variant="content"
      >
        <div
          data-testid="content-topnav-row"
          className="grid h-14 w-full grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-1"
          style={contentNavRow}
        >
          <MotionLink
            href={route.back}
            whileTap={t.tap}
            className="focus-ring flex h-11 w-11 items-center justify-center rounded-full"
            style={{ color: "var(--text2)" }}
            aria-label="Terug"
          >
            <CaretLeft aria-hidden="true" size={20} />
          </MotionLink>
          <span
            className="serif-safe flex min-w-0 items-baseline gap-1.5 overflow-hidden text-base italic"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontWeight: 500,
              color: "var(--text)",
            }}
          >
            <span className="min-w-0 truncate">
              {questionTitle ? (
                <>
                  <span>{questionTitle[0]}</span>
                  <span> · {questionTitle[1]}</span>
                </>
              ) : title}
            </span>
            {saveFeedbackRoute && (
              <span
                aria-hidden="true"
                className="flex-none text-[11px] not-italic font-semibold transition-opacity"
                style={{ color: "var(--accent)", opacity: savedVisible ? 1 : 0 }}
              >
                ✓
              </span>
            )}
          </span>
          {saveFeedbackRoute && (
            <span role="status" aria-live="polite" className="sr-only">
              {savedVisible ? "Opgeslagen" : ""}
            </span>
          )}
          <div className="flex items-center justify-end gap-1">
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

function OfflineStatus({ compact = false }: { compact?: boolean }) {
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
      className={compact
        ? "inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium"
        : "inline-flex h-9 flex-none items-center gap-1.5 rounded-full px-2 text-xs font-medium"}
      style={{ color: "var(--hard-no)", background: "color-mix(in srgb, var(--hard-no) 8%, transparent)" }}
    >
      <WifiSlash size={15} aria-hidden="true" />
      {!compact && <span className="hidden min-[400px]:inline">Offline</span>}
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