"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useMotionSafe } from "@/lib/motion";

type ToastAction = { label: string; onClick: () => void };
type ToastPayload = { message: string; action?: ToastAction; variant?: "default" | "success" };

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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        {toast && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={t.fast}
            role="status"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg max-w-sm w-[calc(100%-2rem)]"
            style={{
              background: toast.variant === "success" ? "#10b981" : "var(--surface2)",
              border: "1px solid",
              borderColor: toast.variant === "success" ? "#059669" : "color-mix(in srgb, var(--accent) 50%, transparent)",
            }}
          >
            <span className="flex-1 text-sm" style={{ color: toast.variant === "success" ? "#fff" : "var(--text2)" }}>
              {toast.message}
            </span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick();
                  dismiss();
                }}
                className="focus-ring text-sm font-semibold flex-none px-3 py-1.5 rounded-lg"
                style={{ background: toast.variant === "success" ? "#059669" : "var(--accent)", color: toast.variant === "success" ? "#fff" : "#000" }}
              >
                {toast.action.label}
              </button>
            )}
            <button
              onClick={dismiss}
              className="focus-ring text-xs flex-none"
              style={{ color: toast.variant === "success" ? "#fff" : "var(--text2)" }}
              aria-label="Sluiten"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}
