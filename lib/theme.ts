// Theme constants shared by the server layout (inline pre-paint script) and
// the client ThemeProvider. Kept out of the "use client" file on purpose: a
// Server Component can't import plain values from a client module.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "pb-theme";

// Runs synchronously in <head> (see app/layout.tsx) so the right theme is on
// <html> before the first paint — no light-mode flash for dark-mode users.
// Saved choice wins; otherwise follow the OS setting.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
