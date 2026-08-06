"use client";

import { useEffect } from "react";
import { setInstallPrompt, type BeforeInstallPromptEvent } from "@/lib/installPrompt";

export default function InstallPromptBridge() {
  useEffect(() => {
    const win = window as Window & { __installPrompt?: BeforeInstallPromptEvent };
    if (win.__installPrompt) setInstallPrompt(win.__installPrompt);

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return null;
}
