"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CaretDown,
  DeviceMobile,
  Lightning,
  List,
  PlusSquare,
  ShareNetwork,
  WifiSlash,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
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

function ActionChip({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 align-middle font-semibold"
      style={{
        background: "var(--surface3)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {children}
    </span>
  );
}

function InstructionList({ steps }: { steps: ReactNode[] }) {
  return (
    <div className="flex flex-col gap-5">
      {steps.map((step, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 + index * 0.05, duration: 0.24, ease: "easeOut" }}
          className="grid grid-cols-[2rem_1fr] gap-2 text-sm leading-7"
        >
          <span className="font-bold tabular-nums" style={{ color: "var(--text2)" }}>
            {index + 1}.
          </span>
          <div style={{ color: "var(--text2)" }}>{step}</div>
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
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const exitCallbackRef = useRef<(() => void) | null>(null);
  useFocusTrap(sheetRef, visible);

  useEffect(() => {
    if (manual) {
      setVisible(true);
      return;
    }
    setVisible(shouldAutoShowInstallPrompt(
      { dismissals, snoozedUntil, neverAsk },
      meaningfulUse,
    ));
  }, [dismissals, manual, meaningfulUse, neverAsk, snoozedUntil]);

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

  const chromeSteps = [
    <span key="chrome-menu">
      Tik op <ActionChip icon={<List size={15} aria-hidden="true" />}>menu</ActionChip> om het browsermenu te openen.
    </span>,
    <span key="chrome-share">
      Tik op <ActionChip icon={<ShareNetwork size={15} aria-hidden="true" />}>Delen</ActionChip> en daarna op <ActionChip icon={<CaretDown size={14} aria-hidden="true" />}>Meer</ActionChip>.
    </span>,
    <span key="chrome-home">
      Kies <ActionChip icon={<PlusSquare size={15} aria-hidden="true" />}>Zet op beginscherm</ActionChip>.
    </span>,
  ];

  const safariSteps = [
    <span key="safari-share">
      Tik op <ActionChip icon={<ShareNetwork size={15} aria-hidden="true" />}>Delen</ActionChip> in de onderste Safari-balk.
    </span>,
    <span key="safari-home">
      Scroll omlaag en kies <ActionChip icon={<PlusSquare size={15} aria-hidden="true" />}>Zet op beginscherm</ActionChip>.
    </span>,
    <span key="safari-add">
      Tik rechtsboven op <ActionChip>Voeg toe</ActionChip>.
    </span>,
  ];

  const otherIosSteps = [
    <span key="other-share">Open het deelmenu van je browser.</span>,
    <span key="other-home">
      Kies <ActionChip icon={<PlusSquare size={15} aria-hidden="true" />}>Zet op beginscherm</ActionChip>.
    </span>,
    <span key="other-add">
      Bevestig met <ActionChip>Voeg toe</ActionChip>.
    </span>,
  ];

  const iosSteps = iosBrowser === "chrome"
    ? chromeSteps
    : iosBrowser === "safari"
      ? safariSteps
      : otherIosSteps;

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
          <motion.div
            key="pwa-backdrop"
            aria-hidden="true"
            className="fixed inset-0 z-[140]"
            style={{ background: "var(--scrim-strong)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={t.fast}
            onClick={dismiss}
          />

          <motion.div
            key="pwa-sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            className="fixed bottom-0 left-0 right-0 z-[141] overflow-y-auto overscroll-contain"
            style={{
              maxHeight: "86dvh",
              background: "var(--surface2)",
              borderRadius: "2rem 2rem 0 0",
              borderTop: "1px solid var(--border)",
              boxShadow: "0 -18px 64px rgba(0,0,0,0.52)",
              paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: t.sheetExit }}
            transition={t.sheet}
          >
            <div className="mx-auto w-full max-w-2xl px-5 pt-5 sm:px-7">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 id="pwa-install-title" className="text-xl font-bold tracking-[-0.02em]">
                  Installeer KinkSync
                </h2>
                <motion.button
                  type="button"
                  whileTap={TAP_SPRING}
                  onClick={dismiss}
                  aria-label="Sluit installatiemelding"
                  className="focus-ring -mr-2 flex h-11 w-11 flex-none items-center justify-center rounded-full"
                  style={{ color: "var(--text2)" }}
                >
                  <X size={25} aria-hidden="true" />
                </motion.button>
              </div>

              <div
                className="mb-6 flex items-center gap-4 rounded-[24px] p-4"
                style={{
                  background: "var(--surface3)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.16)",
                }}
              >
                <motion.img
                  src={isIos ? "/apple-touch-icon.png" : "/icon-192.png"}
                  alt=""
                  aria-hidden="true"
                  width={60}
                  height={60}
                  className="h-[60px] w-[60px] flex-none rounded-[17px]"
                  style={{ boxShadow: "0 5px 18px rgba(0,0,0,0.3)" }}
                />
                <div className="min-w-0">
                  <div className="truncate text-base font-bold">KinkSync</div>
                  <div className="mt-0.5 truncate text-sm" style={{ color: "var(--text2)" }}>
                    kinksync.be
                  </div>
                </div>
              </div>

              {isIos ? (
                <div className="pb-2">
                  <InstructionList steps={iosSteps} />
                </div>
              ) : (
                <div className="pb-1">
                  <p className="mb-5 text-sm leading-6" style={{ color: "var(--text2)" }}>
                    Zet KinkSync op je startscherm voor de volledige app-ervaring.
                  </p>

                  <div className="mb-5 grid grid-cols-3 gap-2">
                    {FEATURES.map(({ icon: Icon, label }) => (
                      <div
                        key={label}
                        className="flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl px-2 py-3 text-center"
                        style={{ background: "var(--surface3)", border: "1px solid var(--border)" }}
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
                    className="focus-ring min-h-12 w-full rounded-xl px-5 text-sm font-bold"
                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                  >
                    Installeer KinkSync
                  </motion.button>
                </div>
              )}

              {!manual && (
                <button
                  type="button"
                  onClick={neverAskAgain}
                  className="focus-ring mt-4 min-h-11 w-full rounded-xl px-4 text-xs font-semibold"
                  style={{ color: "var(--text2)" }}
                >
                  Niet meer vragen
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
