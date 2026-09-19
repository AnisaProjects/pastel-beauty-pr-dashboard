import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Pastel Beauty — PR Performance",
  description: "Every gifting send across your fiscal years, filterable and live-editable.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
