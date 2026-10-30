import type { Metadata } from "next";

import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Pastel Beauty — PR Performance",
  description: "Every gifting send across your fiscal years, filterable and live-editable.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set for real by the inline script below, before first
    // paint — this "light" is only the value used if JS never runs at all.
    // suppressHydrationWarning is required because of that script (see
    // Next's "Preventing Flash" guide); it only silences the mismatch on
    // this one attribute, not the rest of the tree.
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
