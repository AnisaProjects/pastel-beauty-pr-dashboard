import { NextRequest, NextResponse } from "next/server";

import { changeOwnPassword, UserManagementError } from "@/lib/users";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/account/password — any signed-in user changes their own
// password (requires the current one). Distinct from the admin-only
// PATCH /api/users/:id reset, which doesn't need the old password.
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  try {
    const body = await req.json();
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required." }, { status: 400 });
    }
    await changeOwnPassword(userId, currentPassword, newPassword);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserManagementError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("POST /api/account/password failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
