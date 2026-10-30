"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  /** window.print(), but always on the light palette (charts are canvas, so CSS alone can't recolour them). */
  printInLight: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// The single source of truth is the data-theme attribute on <html>. React
// subscribes to it with useSyncExternalStore, so the server render (always
// "light") and the first client render agree, then React re-renders with the
// real value — no hydration mismatch, no setState-in-effect.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const getSnapshot = (): Theme => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
const getServerSnapshot = (): Theme => "light";

function readStoredTheme(): Theme | null {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null; // storage blocked (private mode etc.)
  }
}

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore — the theme still applies for this session
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(getSnapshot() === "dark" ? "light" : "dark");
  }, [setTheme]);

  // Until the user explicitly picks a theme, keep following the OS setting.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readStoredTheme() === null) {
        document.documentElement.setAttribute("data-theme", systemTheme());
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const printInLight = useCallback(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-theme");
    if (previous !== "dark") {
      window.print();
      return;
    }
    const restore = () => {
      root.setAttribute("data-theme", previous);
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    // Temporary switch: not persisted, so the user's saved choice is untouched.
    root.setAttribute("data-theme", "light");
    // Give React + Chart.js a moment to repaint the charts with the light palette.
    window.setTimeout(() => window.print(), 450);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, printInLight }),
    [theme, setTheme, toggleTheme, printInLight],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
