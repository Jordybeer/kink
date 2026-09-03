"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  THEME_STORAGE_KEY,
  isThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function applyResolvedTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  // Keep installed/browser chrome aligned with an explicit override as well as
  // with the operating-system preference represented by the viewport metadata.
  const background = getComputedStyle(root).getPropertyValue("--bg").trim();
  if (background) {
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => { meta.content = background; });
  }
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  const applyPreference = useCallback((nextPreference: ThemePreference) => {
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextResolved = resolveTheme(nextPreference, systemPrefersDark);
    applyResolvedTheme(nextResolved);
    setPreferenceState(nextPreference);
    setResolvedTheme(nextResolved);
  }, []);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    } catch {
      // A blocked storage layer should not make the visual preference unusable
      // for the current tab.
    }
    applyPreference(nextPreference);
  }, [applyPreference]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const syncFromStorage = () => applyPreference(readStoredPreference());
    const syncSystemPreference = () => {
      const stored = readStoredPreference();
      if (stored === "system") applyPreference(stored);
    };
    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) syncFromStorage();
    };

    syncFromStorage();
    media.addEventListener("change", syncSystemPreference);
    window.addEventListener("storage", syncAcrossTabs);
    return () => {
      media.removeEventListener("change", syncSystemPreference);
      window.removeEventListener("storage", syncAcrossTabs);
    };
  }, [applyPreference]);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
