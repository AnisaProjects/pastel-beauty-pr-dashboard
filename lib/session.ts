import { auth } from "@/lib/auth";

// Route handlers are already gated by middleware.ts, but this is called
// defense-in-depth so a route never silently attributes a write to
// `undefined` if it's ever reached without a session.
export async function requireUserId(): Promise<string | undefined> {
  const session = await auth();
  return session?.user?.id;
}
