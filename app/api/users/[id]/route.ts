import { NextRequest, NextResponse } from "next/server";

import { adminResetPassword, getUser, setUserActive, updateUserRole, UserManagementError } from "@/lib/users";
import { ForbiddenError, requireAdminUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/users/:id — admin-only. Body may include any of:
//   { role: "admin" | "member" }       change role
//   { isActive: boolean }              activate/deactivate
//   { newPassword: string }            reset the user's password
// Applied in that order if more than one is present in a single call.
export async function PATCH(req: NextRequest, { params }: Params) {
  let actingUserId: string;
  try {
    actingUserId = await requireAdminUserId();
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const hasRole = body?.role === "admin" || body?.role === "member";
    const hasIsActive = typeof body?.isActive === "boolean";
    const hasNewPassword = typeof body?.newPassword === "string" && body.newPassword;

    if (!hasRole && !hasIsActive && !hasNewPassword) {
      return NextResponse.json({ error: "No recognized fields in request body." }, { status: 400 });
    }

    if (hasRole) await updateUserRole(id, body.role);
    if (hasIsActive) await setUserActive(id, body.isActive, actingUserId);
    if (hasNewPassword) await adminResetPassword(id, body.newPassword);

    const user = await getUser(id);
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof UserManagementError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("PATCH /api/users/[id] failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
