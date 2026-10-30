"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import ChangePasswordModal from "@/components/ChangePasswordModal";
import ThemeToggle from "@/components/ThemeToggle";
import type { UserRole } from "@/lib/types";

export default function Header({ userName, role }: { userName: string; role: UserRole }) {
  const pathname = usePathname();
  const isReports = pathname?.startsWith("/reports");
  const isTeam = pathname?.startsWith("/team");
  const [changingPassword, setChangingPassword] = useState(false);

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
            <Link href="/" className={isReports || isTeam ? "" : "active"}>
              Dashboard
            </Link>
            <Link href="/reports" className={isReports ? "active" : ""}>
              Reports
            </Link>
            {role === "admin" && (
              <Link href="/team" className={isTeam ? "active" : ""}>
                Team
              </Link>
            )}
          </nav>
          <span className="top-meta">{userName}</span>
          <ThemeToggle />
          <button className="btn ghost small" onClick={() => setChangingPassword(true)} type="button">
            Change password
          </button>
          <button className="btn ghost small" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </button>
        </div>
      </div>
      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </header>
  );
}
