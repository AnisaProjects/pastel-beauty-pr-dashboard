"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header({ userName }: { userName: string }) {
  const pathname = usePathname();
  const isReports = pathname?.startsWith("/reports");

  return (
    <header className="top">
      <div className="inner">
        <div className="brand">
          <div className="mark">PB</div>
          <div>
            <h1>Pastel Beauty — PR Performance</h1>
            <p>Every gifting send across your fiscal years, filterable and live-editable.</p>
          </div>
        </div>
        <div className="top-actions">
          <nav className="top-nav">
            <Link href="/" className={isReports ? "" : "active"}>
              Dashboard
            </Link>
            <Link href="/reports" className={isReports ? "active" : ""}>
              Reports
            </Link>
          </nav>
          <span className="top-meta">{userName}</span>
          <button className="btn ghost small" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
