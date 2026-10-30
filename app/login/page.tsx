import { redirect } from "next/navigation";

import BgBlobs from "@/components/BgBlobs";
import ThemeToggle from "@/components/ThemeToggle";
import { auth } from "@/lib/auth";

import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");

  const { callbackUrl } = await searchParams;

  return (
    <div className="login-wrap">
      <BgBlobs />
      <div className="login-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="login-card">
        <div className="brand">
          <div className="mark">PB</div>
          <div>
            <h1 style={{ fontSize: 17 }}>Pastel Beauty</h1>
            <p>PR Performance dashboard</p>
          </div>
        </div>
        <h2>Sign in</h2>
        <p className="sub">Use the account your team set up for you.</p>
        <LoginForm callbackUrl={callbackUrl || "/"} />
      </div>
    </div>
  );
}
