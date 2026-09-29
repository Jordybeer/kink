"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState = {
  standalone: boolean;
  ios: boolean;
  canPrompt: boolean;
  busy: boolean;
  message: string;
  install: () => Promise<void>;
};

const InstallContext = createContext<InstallState | null>(null);

// Catch the browser's one-shot invitation on any route. Only Settings may use it.
export default function PwaInstallProvider({ children }: { children: ReactNode }) {
  const invitation = useRef<InstallPromptEvent | null>(null);
  const pending = useRef(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const syncDisplayMode = () => setStandalone(
      displayMode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    );
    syncDisplayMode();
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const capture = (event: Event) => {
      event.preventDefault();
      invitation.current = event as InstallPromptEvent;
      setCanPrompt(true);
      setMessage("");
    };
    const installed = () => {
      invitation.current = null;
      setCanPrompt(false);
      setMessage("KinkSync is toegevoegd. Open de app vanaf je beginscherm of appoverzicht.");
    };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installed);
    displayMode.addEventListener("change", syncDisplayMode);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", installed);
      displayMode.removeEventListener("change", syncDisplayMode);
    };
  }, []);

  async function install() {
    const event = invitation.current;
    if (!event || pending.current) return;
    // Consume once, even after dismissal or rejection. A fresh browser event can retry.
    invitation.current = null;
    pending.current = true;
    setCanPrompt(false);
    setBusy(true);
    setMessage("");
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      setMessage(outcome === "accepted"
        ? "Volg de installatie in je browser. Daarna kun je KinkSync als app openen."
        : "Installatie overgeslagen. Je kunt KinkSync gewoon hier blijven gebruiken.");
    } catch {
      setMessage("Installatie kon niet starten. Probeer het via het browsermenu.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <InstallContext.Provider value={{ standalone, ios, canPrompt, busy, message, install }}>
      {children}
    </InstallContext.Provider>
  );
}

export function usePwaInstall() {
  const value = useContext(InstallContext);
  if (!value) throw new Error("usePwaInstall requires PwaInstallProvider");
  return value;
}
