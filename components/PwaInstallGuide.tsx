"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle,
  DeviceMobile,
  DotsThree,
  DownloadSimple,
  Lightning,
  PlusSquare,
  WifiSlash,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import SheetBackdrop from "@/components/SheetBackdrop";
import PlatformShareIcon from "@/components/ui/PlatformShareIcon";
import {
  clearInstallPrompt,
  detectIosInstallBrowser,
  getInstallPrompt,
  shouldAutoShowInstallPrompt,
  type IosInstallBrowser,
} from "@/lib/installPrompt";
import { useInstallPromptPolicyStore } from "@/lib/installPromptPolicyStore";
import { TAP_SPRING, useMotionSafe } from "@/lib/motion";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useStore } from "@/lib/store";

interface Props {
  isIos: boolean;
  onInstall?: () => void | Promise<void>;
  onDismiss: () => void;
  manual?: boolean;
}

interface InstallStep {
  icon: ReactNode;
  title: string;
  detail: string;
}

function InstructionList({ steps }: { steps: readonly InstallStep[] }) {
  return (
    <div className="flex flex-col gap-1">
      {steps.map((step, index) => (
        <motion.div
          key={step.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.06, duration: 0.24, ease: "easeOut" }}
          className="grid grid-cols-[1.75rem_2.5rem_1fr] items-start gap-2.5 rounded-2xl px-2 py-3"
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold tabular-nums"
            style={{ background: "var(--surface3)", color: "var(--text2)" }}
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: "color-mix(in srgb, var(--accent) 10%, var(--surface3))",
              color: "var(--accent)",
            }}
            aria-hidden="true"
          >
            {step.icon}
          </span>
          <span className="min-w-0 pt-0.5">
            <span className="block text-sm font-semibold leading-5" style={{ color: "var(--text)" }}>
              {step.title}
            </span>
            <span className="mt-1 block text-xs leading-5" style={{ color: "var(--text2)" }}>
              {step.detail}
            </span>
          </span>
        </motion.div>
      ))}
    </div>
  );
}

const FEATURES = [
  { icon: WifiSlash, label: "Werkt offline" },
  { icon: DeviceMobile, label: "Zonder adresbalk" },
  { icon: Lightning, label: "Direct geopend" },
];

export default function PwaInstallGuide({ isIos, onInstall, onDismiss, manual = false }: Props) {
  const t = useMotionSafe();
  const meaningfulUse = useStore((state) => state.profiles.length > 0);
  const dismissals = useInstallPromptPolicyStore((state) => state.dismissals);
  const snoozedUntil = useInstallPromptPolicyStore((state) => state.snoozedUntil);
  const neverAsk = useInstallPromptPolicyStore((state) => state.neverAsk);
  const snoozeAutomaticPrompt = useInstallPromptPolicyStore((state) => state.snoozeAutomaticPrompt);
  const disableAutomaticPrompt = useInstallPromptPolicyStore((state) => state.disableAutomaticPrompt);
  const [visible, setVisible] = useState(manual);
  const [iosBrowser, setIosBrowser] = useState<IosInstallBrowser>(null);
  const [profileCreateOpen, setProfileCreateOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const exitCallbackRef = useRef<(() => void) | null>(null);
  const meaningfulUseAtMountRef = useRef(meaningfulUse);
  useFocusTrap(sheetRef, visible);

  useEffect(() => {
    if (manual) return;

    const syncProfileCreateState = () => {
      setProfileCreateOpen(Boolean(
        document.querySelector('[role="dialog"][aria-label="Nieuw profiel maken"]'),
      ));
    };

    syncProfileCreateState();
    const observer = new MutationObserver(syncProfileCreateState);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [manual]);

  useEffect(() => {
    if (manual) {
      setVisible(true);
      return;
    }

    // Do not let the automatic install sheet jump in between creating the
    // first profile and navigating to its questionnaire. If meaningful use
    // starts during this Home mount, wait until Home is visited again.
    const meaningfulUseStartedThisVisit = !meaningfulUseAtMountRef.current && meaningfulUse;
    if (profileCreateOpen || meaningfulUseStartedThisVisit) {
      setVisible(false);
      return;
    }

    setVisible(shouldAutoShowInstallPrompt(
      { dismissals, snoozedUntil, neverAsk },
      meaningfulUse,
    ));
  }, [dismissals, manual, meaningfulUse, neverAsk, profileCreateOpen, snoozedUntil]);

  useEffect(() => {
    if (!isIos) {
      setIosBrowser(null);
      return;
    }

    setIosBrowser(
      detectIosInstallBrowser(
        navigator.userAgent,
        navigator.platform,
        navigator.maxTouchPoints,
      ),
    );
  }, [isIos]);

  function closeAfterExit(callback?: () => void) {
    exitCallbackRef.current = callback ?? null;
    setVisible(false);
  }

  function dismiss() {
    if (manual) {
      closeAfterExit(onDismiss);
      return;
    }
    snoozeAutomaticPrompt();
    closeAfterExit();
  }

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function neverAskAgain() {
    disableAutomaticPrompt();
    closeAfterExit(onDismiss);
  }

  async function install() {
    const prompt = getInstallPrompt();
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      clearInstallPrompt();

      if (manual) {
        closeAfterExit(onDismiss);
        return;
      }

      if (choice.outcome === "accepted") {
        disableAutomaticPrompt();
        closeAfterExit(onDismiss);
      } else {
        snoozeAutomaticPrompt();
        closeAfterExit();
      }
      return;
    }

    await onInstall?.();
    closeAfterExit(manual ? onDismiss : undefined);
  }

  const chromeSteps: InstallStep[] = [
    {
      icon: <DotsThree size={21} weight="bold" />,
      title: "Open het Chrome-menu",
      detail: "Tik op de drie puntjes in Chrome.",
    },
    {
      icon: <PlatformShareIcon platform="ios" size={20} weight="regular" />,
      title: "Open Delen",
      detail: "Kies Delen in het browsermenu.",
    },
    {
      icon: <PlusSquare size={20} weight="regular" />,
      title: "Zet op je beginscherm",
      detail: "Kies Zet op beginscherm en bevestig daarna met Voeg toe.",
    },
  ];

  const safariSteps: InstallStep[] = [
    {
      icon: <PlatformShareIcon platform="ios" size={20} weight="regular" />,
      title: "Open Delen",
      detail: "Tik op het deel-icoon in de onderste Safari-balk.",
    },
    {
      icon: <PlusSquare size={20} weight="regular" />,
      title: "Zet op je beginscherm",
      detail: "Scroll omlaag en kies Zet op beginscherm.",
    },
    {
      icon: <CheckCircle size={20} weight="regular" />,
      title: "Bevestig",
      detail: "Tik rechtsboven op Voeg toe.",
    },
  ];

  const otherIosSteps: InstallStep[] = [
    {
      icon: <PlatformShareIcon platform="ios" size={20} weight="regular" />,
      title: "Open Delen",
      detail: "Open het deelmenu van je browser.",
    },
    {
      icon: <PlusSquare size={20} weight="regular" />,
      title: "Zet op je beginscherm",
      detail: "Kies Zet op beginscherm in de lijst met acties.",
    },
    {
      icon: <CheckCircle size={20} weight="regular" />,
      title: "Bevestig",
      detail: "Rond af met Voeg toe.",
    },
  ];

  const iosSteps = iosBrowser === "chrome"
    ? chromeSteps
    : iosBrowser === "safari"
      ? safariSteps
      : otherIosSteps;

  const title = manual ? "KinkSync installeren" : "KinkSync installeren?";
  const intro = manual
    ? "Volg de stappen voor dit toestel."
    : "Zet KinkSync op je beginscherm voor snellere toegang en een rustige app-weergave.";
  const enterTransition = {
    ...t.sheet,
    duration: t.sheet.duration === 0 ? 0 : 0.42,
  };

  return (
    <AnimatePresence
      onExitComplete={() => {
        const callback = exitCallbackRef.current;
        exitCallbackRef.current = null;
        callback?.();
      }}
    >
      {visible && (
        <>
          <SheetBackdrop
            key="pwa-backdrop"
            onClick={dismiss}
            transition={t.fast}
            zIndex={140}
          />

          <motion.div
            key="pwa-sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            aria-describedby="pwa-install-intro"
            className="fixed bottom-0 left-0 right-0 z-[141] overflow-y-auto overscroll-contain"
            style={{
              maxHeight: "88dvh",
              background: "var(--surface)",
              borderRadius: "2rem 2rem 0 0",
              borderTop: "1px solid var(--border)",
              boxShadow: "0 -18px 64px rgba(0,0,0,0.52)",
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
              willChange: "transform",
            }}
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            exit={{ y: "105%", transition: t.sheetExit }}
            transition={enterTransition}
          >
            <div className="mx-auto h-7 w-full pt-2" aria-hidden="true">
              <div className="mx-auto h-1 w-10 rounded-full" style={{ background: "var(--surface3)" }} />
            </div>

            <div className="mx-auto w-full max-w-2xl px-5 pb-1 pt-2 sm:px-7">
              <div className="flex items-start gap-3">
                <img
                  src={isIos ? "/apple-touch-icon.png" : "/icon-192.png"}
                  alt=""
                  aria-hidden="true"
                  width={50}
                  height={50}
                  className="h-[50px] w-[50px] flex-none rounded-[14px]"
                  style={{ boxShadow: "0 5px 18px rgba(0,0,0,0.28)" }}
                />

                <div className="min-w-0 flex-1 pt-0.5">
                  <h2 id="pwa-install-title" className="text-lg font-bold leading-6 tracking-[-0.015em]">
                    {title}
                  </h2>
                  <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text2)" }}>
                    kinksync.be
                  </p>
                </div>

                <motion.button
                  type="button"
                  whileTap={TAP_SPRING}
                  onClick={dismiss}
                  aria-label="Sluit installatiemelding"
                  className="focus-ring -mr-2 flex h-11 w-11 flex-none items-center justify-center rounded-full"
                  style={{ color: "var(--text2)" }}
                >
                  <X size={22} aria-hidden="true" />
                </motion.button>
              </div>

              <p id="pwa-install-intro" className="mt-4 text-sm leading-6" style={{ color: "var(--text2)" }}>
                {intro}
              </p>

              <div className="mt-4" style={{ borderTop: "1px solid var(--border)" }}>
                {isIos ? (
                  <div className="pt-2">
                    <InstructionList steps={iosSteps} />
                  </div>
                ) : (
                  <div className="pt-5">
                    <div className="mb-5 grid grid-cols-3 gap-2">
                      {FEATURES.map(({ icon: Icon, label }) => (
                        <div
                          key={label}
                          className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-2xl px-2 py-3 text-center"
                          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                        >
                          <Icon size={19} aria-hidden="true" style={{ color: "var(--accent)" }} />
                          <span className="text-xs font-semibold leading-4" style={{ color: "var(--text2)" }}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <motion.button
                      type="button"
                      whileTap={TAP_SPRING}
                      onClick={() => { void install(); }}
                      className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold"
                      style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                    >
                      <DownloadSimple size={18} weight="bold" aria-hidden="true" />
                      <span>Installeer KinkSync</span>
                    </motion.button>
                  </div>
                )}
              </div>

              {!manual && (
                <div className="mt-5 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                  <button
                    type="button"
                    onClick={neverAskAgain}
                    className="focus-ring min-h-11 w-full rounded-xl px-4 text-xs font-semibold"
                    style={{ color: "var(--text2)" }}
                  >
                    Niet meer vragen
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
