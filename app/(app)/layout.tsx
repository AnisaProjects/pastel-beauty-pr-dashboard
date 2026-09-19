import { redirect } from "next/navigation";

import BgBlobs from "@/components/BgBlobs";
import Header from "@/components/Header";
import { auth } from "@/lib/auth";
import Providers from "@/app/providers";

// Authenticated shell/nav shared by the dashboard and reports pages.
// middleware.ts already redirects unauthenticated requests to /login before
// this ever renders — the check here is defense-in-depth.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <Providers>
      <BgBlobs />
      <Header userName={session.user.name || session.user.email || "Signed in"} />
      {children}
    </Providers>
  );
}
