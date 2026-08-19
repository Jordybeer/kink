"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CaretLeft, DotsThree, DownloadSimple, GearSix, Info, ShieldCheck, WifiSlash } from "@phosphor-icons/react";
import { useMotionSafe } from "@/lib/motion";
import { useStore, useHasHydrated } from "@/lib/store";
import ContextMenu from "@/components/ui/ContextMenu";
import PwaInstallGuide from "@/components/PwaInstallGuide";
import { useTopNav, type TopNavAction } from "@/components/nav/TopNavContext";
import {
  clearInstallPrompt,
  detectIosInstallBrowser,
  getInstallPrompt,
  INSTALL_PROMPT_CHANGE_EVENT,
} from "@/lib/installPrompt";

const MotionLink = motion.create(Link);

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
  const [installAvailable, setInstallAvailable] = useState(false);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [iosInstall, setIosInstall] = useState(false);
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

  useEffect(() => {
    if (path !== "/") {
      setInstallAvailable(false);
      setInstallGuideOpen(false);
      return;
    }

    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const ios = detectIosInstallBrowser(
      navigator.userAgent,
      navigator.platform,
      navigator.maxTouchPoints,
    ) !== null;
    setIosInstall(ios);

    const refreshInstallAvailability = () => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches
        || navigatorWithStandalone.standalone === true;
      const available = !standalone && (ios || getInstallPrompt() !== null);
      setInstallAvailable(available);
      if (!available) setInstallGuideOpen(false);
    };
    const handleAppInstalled = () => {
      clearInstallPrompt();
      setInstallAvailable(false);
      setInstallGuideOpen(false);
    };

    refreshInstallAvailability();
    window.addEventListener("beforeinstallprompt", refreshInstallAvailability);
    window.addEventListener(INSTALL_PROMPT_CHANGE_EVENT, refreshInstallAvailability);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", refreshInstallAvailability);
      window.removeEventListener(INSTALL_PROMPT_CHANGE_EVENT, refreshInstallAvailability);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [path]);

  if (path === "/scene") return null;
  if (hydrated && path === "/" && !onboardingComplete) return null;

  const shell = {
    paddingTop: "env(safe-area-inset-top)",
    background: "color-mix(in srgb, var(--surface) 82%, transparent)",
    borderBottom: "1px solid var(--border)",
    backdropFilter: "blur(12px) saturate(140%)",
    WebkitBackdropFilter: "blur(12px) saturate(140%)",
  } as const;

  if (path === "/") {
    return (
      <>
        <header className="sticky top-0 z-40 transition-colors" style={shell}>
          <nav className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-end gap-1" aria-label="Hoofdnavigatie">
            <OfflineStatus />
            {installAvailable && (
              <button
                type="button"
                onClick={() => setInstallGuideOpen(true)}
                aria-label="KinkSync installeren"
                title="KinkSync installeren"
                className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-full"
                style={{ color: "var(--text2)" }}
              >
                <DownloadSimple size={20} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("ks:open-settings"))}
              aria-label="Instellingen openen"
              className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-full"
              style={{ color: "var(--text2)" }}
            >
              <GearSix size={20} aria-hidden="true" />
            </button>
            <ContextMenu
              open={overflowOpen}
              onClose={() => setOverflowOpen(false)}
              items={[
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
              ]}
            >
              <button
                type="button"
                onClick={() => setOverflowOpen((open) => !open)}
                aria-label="Meer over KinkSync"
                aria-expanded={overflowOpen}
                className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-full"
                style={{ color: "var(--text2)" }}
              >
                <DotsThree size={22} weight="bold" aria-hidden="true" />
              </button>
            </ContextMenu>
          </nav>
        </header>
        {installGuideOpen && (
          <PwaInstallGuide
            isIos={iosInstall}
            manual
            onDismiss={() => setInstallGuideOpen(false)}
          />
        )}
      </>
    );
  }

  const sceneMatch = path.match(/^\/scenes\/([^/]+)/);
  const { title: routeTitle, back } = focusedRoute(path, {
    sceneTitle: sceneMatch ? scenes.find((scene) => scene.id === sceneMatch[1])?.title : undefined,
  });
  const title = contextualTitle ?? routeTitle;
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
    <header className="sticky top-0 z-40 transition-colors" style={shell}>
      <nav className={`relative ${navWidth} mx-auto px-4 h-14 flex items-center gap-1`} aria-label="Hoofdnavigatie">
        <MotionLink
          href={back}
          whileTap={t.tap}
          className="focus-ring -ml-2 flex-none flex items-center justify-center h-10 w-10 rounded-full"
          style={{ color: "var(--text2)" }}
          aria-label="Terug"
        >
          <CaretLeft aria-hidden="true" size={20} />
        </MotionLink>
        <span
          className="flex-1 min-w-0 text-base italic truncate serif-safe transition-opacity"
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
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs font-semibold whitespace-nowrap transition-opacity"
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
              className="focus-ring flex h-10 w-10 flex-none items-center justify-center rounded-full"
              style={{ color: "var(--text2)" }}
            >
              <DotsThree size={22} weight="bold" aria-hidden="true" />
            </button>
          </ContextMenu>
        )}
        <OfflineStatus />
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

  return (
    <motion.button
      type="button"
      data-tour={action.id === "questionnaire-help" ? "questionnaire-info" : undefined}
      whileTap={action.disabled ? undefined : t.tap}
      onClick={action.onClick}
      disabled={action.disabled}
      aria-label={action.label}
      title={action.label}
      className="focus-ring flex h-10 w-10 flex-none items-center justify-center rounded-full disabled:opacity-35 [&_svg]:h-5 [&_svg]:w-5"
      style={{
        color: action.danger
          ? "var(--hard-no)"
          : emphasis === "primary"
            ? "var(--text)"
            : "var(--text2)",
      }}
    >
      {action.icon}
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
      className="inline-flex h-9 flex-none items-center gap-1.5 rounded-full px-2 text-[11px] font-medium"
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

function focusedRoute(
  path: string,
  dyn: { sceneTitle?: string },
): { title: string; back: string } {
  if (path === "/profile") return { title: "Profiel", back: "/" };
  if (/^\/profile\/[^/]+\/questions$/.test(path)) {
    return { title: "Vragenlijst", back: path.replace(/\/questions$/, "") };
  }
  if (path.startsWith("/profile/")) return { title: "Profiel", back: "/" };
  if (path.startsWith("/scenes/")) return { title: dyn.sceneTitle ?? "Scène", back: "/scenes" };
  if (path === "/scenes") return { title: "Scènes", back: "/" };
  if (path === "/compare") return { title: "Vergelijk", back: "/" };
  if (path === "/timeline") return { title: "Verloop", back: "/" };
  if (path === "/about") return { title: "Hoe KinkSync werkt", back: "/" };
  if (path === "/security") return { title: "Security & privacy", back: "/about" };
  if (path.includes("/versions/")) return { title: "Contractversie", back: path.replace(/\/versions\/[^/]+$/, "/history") };
  if (path.endsWith("/history") && path.startsWith("/contracts/")) return { title: "Contractverloop", back: path.replace(/\/history$/, "") };
  if (path.startsWith("/contracts/")) return { title: "Contract", back: "/contracts" };
  if (path === "/contracts") return { title: "Contracten", back: "/" };
  if (path === "/contract") return { title: "Contract opstellen", back: "/compare" };
  return { title: "KinkSync", back: "/" };
}
