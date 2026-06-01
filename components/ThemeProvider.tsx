"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function ThemeProvider() {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("theme-red", "theme-forest", "theme-mono");
    if (theme !== "midnight") html.classList.add(`theme-${theme}`);
    html.setAttribute("data-theme", theme);
  }, [theme]);
  return null;
}
