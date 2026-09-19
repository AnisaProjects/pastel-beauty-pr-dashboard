import { redirect } from "next/navigation";

import BgBlobs from "@/components/BgBlobs";
import Header from "@/components/Header";
import { getSessionUser } from "@/lib/session";
import Providers from "@/app/providers";

// Authenticated shell/nav shared by the dashboard and reports pages.
// proxy.ts already redirects unauthenticated requests to /login before
// this ever renders — the check here is defense-in-depth.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <Providers>
      <BgBlobs />
      <Header userName={user.name || user.email || "Signed in"} role={user.role} />
      {children}
    </Providers>
  );
}
