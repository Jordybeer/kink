"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Warning, X } from "@phosphor-icons/react";
import { useMotionSafe } from "@/lib/motion";

type ToastAction = { label: string; onClick: () => void };
/**
 * `attention` is voor berichten die om actie vragen, zoals een volle kluis.
 * Bewust geen alarmkleur en geen afwijkende vulling: Serious is niet scary
 * (UI-principles #10). Het onderscheid zit in een warmere rand en een klein
 * icoon, niet in geschreeuw. De statustokens (--curious, --maybe, --hard-no)
 * blijven erbuiten; die dragen kinkstatus-betekenis die niet naar een
 * systeemmelding hoort te lekken.
 */
type ToastPayload = { message: string; action?: ToastAction; variant?: "default" | "success" | "attention" };

type ToastContextValue = { showToast: (payload: ToastPayload) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_MS = 6000;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useMotionSafe();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bottom sheets (install-sheet, PIN-flow, elke Sheet-primitive) anker aan de
  // onderrand, precies waar de toast ook stond — vandaar dat hij eerder over de
  // "Installeer KinkSync"-knop viel. Zolang een echte modal-dialoog open staat,
  // verhuist de toast naar boven, onder TopNav, zodat hij nooit een primaire
  // actie bedekt maar wel zichtbaar en aanklikbaar blijft (nooit stil, #12).
  // Zelfde detectiepatroon als PwaInstallGuide's profileCreateOpen-observer.
  useEffect(() => {
    const syncModalState = () => {
      setModalOpen(Boolean(document.querySelector('[role="dialog"][aria-modal="true"]')));
    };
    syncModalState();
    const observer = new MutationObserver(syncModalState);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const dismiss = useCallback(() => {
    clear();
    setToast(null);
  }, [clear]);

  const showToast = useCallback(
    (payload: ToastPayload) => {
      clear();
      setToast(payload);
      timer.current = setTimeout(() => setToast(null), DISMISS_MS);
    },
    [clear]
  );

  useEffect(() => clear, [clear]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <AnimatePresence>
        {toast && (() => {
          const success = toast.variant === "success";
          const attention = toast.variant === "attention";
          return (
          <motion.div
            initial={{ y: modalOpen ? -40 : 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: modalOpen ? -40 : 40, opacity: 0 }}
            transition={t.fast}
            role="status"
            className="fixed left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-1 px-3 py-2 rounded-2xl max-w-sm w-[calc(100%-2rem)]"
            style={{
              // Standaard boven de home-indicator én de bottom-nav (de rest van
              // de app rekent daar al mee, de toast deed dat niet). Staat er een
              // modal-dialoog open — die anker altijd onderaan, precies hier —
              // dan verhuist de toast naar boven, onder TopNav, in plaats van
              // over de primaire knop van de sheet heen te vallen.
              top: modalOpen ? "calc(var(--nav-h, 3.5rem) + 0.75rem)" : undefined,
              bottom: modalOpen ? undefined : "calc(env(safe-area-inset-bottom) + var(--toast-lift, 0.75rem))",
              // Hetzelfde glas als TopNav (components/TopNav.tsx). Dekking blijft
              // op 86%: --text over een puur accentvlak haalt maar 3,21:1, dus
              // alleen deze dekking houdt het bericht boven AA.
              background: success ? "var(--willing)" : "color-mix(in srgb, var(--surface) 86%, transparent)",
              backgroundImage: success
                ? undefined
                : "linear-gradient(color-mix(in srgb, var(--accent) 6%, transparent), transparent)",
              backdropFilter: success ? undefined : "blur(12px) saturate(140%)",
              WebkitBackdropFilter: success ? undefined : "blur(12px) saturate(140%)",
              boxShadow: success ? undefined : "var(--glow-accent)",
              border: "1px solid",
              borderColor: success
                ? "color-mix(in srgb, var(--willing) 60%, black)"
                : attention
                  ? "color-mix(in srgb, var(--accent) 55%, var(--border))"
                  : "color-mix(in srgb, var(--accent) 28%, var(--border))",
            }}
          >
            {/* Bericht en sluiten op één regel, de actie eronder. Naast elkaar
                perste een knop van 144px de tekst in vier regels op 375px;
                leesbaarheid weegt zwaarder dan compactheid (prioriteit 2 vs 6). */}
            <div className="flex items-start gap-2">
              {attention && (
                <Warning
                  size={18}
                  weight="duotone"
                  aria-hidden="true"
                  className="mt-2 flex-none"
                  style={{ color: "var(--accent)" }}
                />
              )}
              {/* De hoofdtekst draagt de boodschap en verdient dus --text, niet de
                  dimmere --text2 waar hij eerst in stond (6,71:1 → 15,13:1). */}
              <span
                className="flex-1 py-2 text-sm leading-snug"
                style={{ color: success ? "var(--on-accent)" : "var(--text)" }}
              >
                {toast.message}
              </span>
              {/* Raakvlak van 44px; het kruisje zelf blijft klein. */}
              <button
                type="button"
                onClick={dismiss}
                className="focus-ring -mr-1 flex h-11 w-11 flex-none items-center justify-center rounded-full"
                style={{ color: success ? "var(--on-accent)" : "var(--text2)" }}
                aria-label="Sluiten"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.onClick();
                  dismiss();
                }}
                // Secundair: een toast is al een onderbreking, dus de actie
                // hoeft geen vol accentvlak te zijn. Getinte vulling met
                // --accent-text (5,24:1) in plaats van donkere inkt op fel roze.
                className="focus-ring mb-1 min-h-11 w-full rounded-xl px-3 text-sm font-semibold"
                style={success
                  ? { background: "var(--on-accent)", color: "var(--willing)" }
                  : {
                      background: "color-mix(in srgb, var(--accent) 16%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--accent) 45%, transparent)",
                      color: "var(--accent-text)",
                    }}
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
          );
        })()}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}
