"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { setInstallPrompt, type BeforeInstallPromptEvent } from "@/lib/installPrompt";

export default function ThemeProvider() {
  const theme = useStore((s) => s.theme);

  // Apply theme class to <html>
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("theme-red", "theme-forest", "theme-mono");
    if (theme !== "midnight") html.classList.add(`theme-${theme}`);
    html.setAttribute("data-theme", theme);
  }, [theme]);

  // Capture beforeinstallprompt at root level — fires before React hydrates on fast devices,
  // so it must be captured here (layout root) rather than inside Onboarding.
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return null;
}
