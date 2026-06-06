"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { setInstallPrompt, type BeforeInstallPromptEvent } from "@/lib/installPrompt";

export default function ThemeProvider() {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("theme-red", "theme-forest", "theme-mono");
    if (theme !== "midnight") html.classList.add(`theme-${theme}`);
    html.setAttribute("data-theme", theme);
  }, [theme]);

  // Pick up any prompt that the inline <script> captured before hydration.
  useEffect(() => {
    const win = window as Window & { __installPrompt?: BeforeInstallPromptEvent };
    if (win.__installPrompt) {
      setInstallPrompt(win.__installPrompt);
    }
    // Also catch prompts that fire after hydration (rare but possible on slow devices).
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return null;
}
