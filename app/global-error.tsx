"use client";

import { useEffect } from "react";
import { isThemePreference, resolveTheme, THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * De laatste deur. Deze vangt fouten in de root layout zelf en vervángt die
 * layout, dus hier is geen globals.css, geen ThemeProvider en geen font — alles
 * staat inline. Zelfde toon als app/error.tsx, maar tot op het bot uitgekleed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("KinkSync liep volledig vast:", error);

    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    let preference: unknown;
    try {
      preference = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Storage can be unavailable in hardened browsers; system preference remains safe.
    }
    const theme = resolveTheme(isThemePreference(preference) ? preference : "system", systemPrefersDark);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [error]);

  return (
    <html lang="nl" suppressHydrationWarning style={{ colorScheme: "light dark" }}>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "var(--bg, Canvas)",
          color: "var(--text, CanvasText)",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: "28rem" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(1.6rem, 6vw, 2rem)",
              fontWeight: 600,
              lineHeight: 1.15,
            }}
          >
            KinkSync liep vast.
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text2, GrayText)" }}>
            Er ging iets mis bij het opstarten van de app. Herladen helpt meestal.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              display: "inline-flex",
              width: "min(100%, 20rem)",
              minHeight: "3rem",
              marginTop: "1.5rem",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 1.25rem",
              border: "none",
              borderRadius: "1rem",
              background: "var(--accent-fill, Highlight)",
              color: "var(--on-accent-fill, HighlightText)",
              fontSize: "0.875rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Herlaad KinkSync
          </button>
        </main>
      </body>
    </html>
  );
}
