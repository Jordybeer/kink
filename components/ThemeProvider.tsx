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

    const accent = getComputedStyle(html).getPropertyValue("--accent").trim();
    if (accent) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.appendChild(meta);
      }
      meta.content = accent;
    }
  }, [theme]);
  return null;
}
