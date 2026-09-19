import { auth } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

export type SessionUser = { id: string; role: UserRole; name: string | null; email: string | null };

// The next-auth/@auth-core ambient type augmentation (lib/auth.d.ts) doesn't
// reliably merge into every internal touchpoint in this version, so
// session.user's declared type can't be trusted to include `role` (or even
// non-optional `id`) everywhere it's read. lib/auth.ts's callbacks DO set
// these correctly at runtime — this reads them defensively via a cast in one
// place instead of every call site re-deriving/trusting the field.
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user as { id?: string; role?: string; name?: string | null; email?: string | null } | undefined;
  if (!u?.id) return null;
  return {
    id: u.id,
    role: u.role === "admin" ? "admin" : "member",
    name: u.name ?? null,
    email: u.email ?? null,
  };
}

// Route handlers are already gated by proxy.ts, but this is called
// defense-in-depth so a route never silently attributes a write to
// `undefined` if it's ever reached without a session.
export async function requireUserId(): Promise<string | undefined> {
  const user = await getSessionUser();
  return user?.id;
}

export class ForbiddenError extends Error {}

// User-management routes are admin-only. Throws ForbiddenError (caught by
// the route handler and turned into a 403) rather than returning a sentinel,
// so a route can't accidentally proceed on a falsy-but-truthy mistake.
export async function requireAdminUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new ForbiddenError("Not signed in.");
  if (user.role !== "admin") throw new ForbiddenError("Admin access required.");
  return user.id;
}
